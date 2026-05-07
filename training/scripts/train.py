#!/usr/bin/env python3
"""
Fine-tune a base LLM on Solana CLAWD trading data using LoRA.

Usage:
  python train.py --preset llama3 --data_dir ../data --output_dir ../checkpoints/llama3-solana
  python train.py --preset mistral --epochs 5 --wandb_project solana-clawd
  python train.py --base_model meta-llama/Llama-3.1-8B-Instruct --lora_r 64
"""

import argparse
import json
import os
import sys
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from trl import SFTTrainer, SFTConfig

from config import get_config, TrainConfig


def load_jsonl_dataset(data_dir: str, tokenizer):
    """Load JSONL training data and apply chat template."""
    train_path = os.path.join(data_dir, "train.jsonl")
    val_path = os.path.join(data_dir, "val.jsonl")

    if not os.path.exists(train_path):
        print(f"Error: {train_path} not found. Run dataset extraction first.")
        sys.exit(1)

    train_ds = load_dataset("json", data_files=train_path, split="train")
    val_ds = None
    if os.path.exists(val_path):
        val_ds = load_dataset("json", data_files=val_path, split="train")

    def format_chat(example):
        text = tokenizer.apply_chat_template(
            example["messages"],
            tokenize=False,
            add_generation_prompt=False,
        )
        return {"text": text}

    train_ds = train_ds.map(format_chat)
    if val_ds:
        val_ds = val_ds.map(format_chat)

    print(f"  Train: {len(train_ds)} examples")
    if val_ds:
        print(f"  Val:   {len(val_ds)} examples")

    return train_ds, val_ds


def main():
    parser = argparse.ArgumentParser(description="Fine-tune on Solana CLAWD data")
    parser.add_argument("--preset", type=str, default="llama3",
                        help="Model preset: llama3, llama3-small, mistral, phi3, qwen2")
    parser.add_argument("--base_model", type=str, default=None,
                        help="Override base model (HuggingFace model ID)")
    parser.add_argument("--data_dir", type=str, default="../data",
                        help="Directory containing train.jsonl and val.jsonl")
    parser.add_argument("--output_dir", type=str, default="../checkpoints/solana-clawd",
                        help="Output directory for checkpoints")
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--batch_size", type=int, default=None)
    parser.add_argument("--lora_r", type=int, default=None)
    parser.add_argument("--learning_rate", type=float, default=None)
    parser.add_argument("--wandb_project", type=str, default=None)
    parser.add_argument("--max_seq_length", type=int, default=None)
    args = parser.parse_args()

    # Load config preset and apply overrides
    config = get_config(args.preset)
    if args.base_model:
        config.base_model = args.base_model
    if args.epochs:
        config.num_epochs = args.epochs
    if args.batch_size:
        config.batch_size = args.batch_size
    if args.lora_r:
        config.lora_r = args.lora_r
        config.lora_alpha = args.lora_r * 2
    if args.learning_rate:
        config.learning_rate = args.learning_rate
    if args.wandb_project:
        config.wandb_project = args.wandb_project
    if args.max_seq_length:
        config.max_seq_length = args.max_seq_length

    print("\n  \033[36m\033[1m$CLAWD Model Fine-Tuning\033[0m\n")
    print(f"  Base model:   {config.base_model}")
    print(f"  LoRA r:       {config.lora_r}")
    print(f"  LoRA alpha:   {config.lora_alpha}")
    print(f"  LR:           {config.learning_rate}")
    print(f"  Epochs:       {config.num_epochs}")
    print(f"  Batch:        {config.batch_size} × {config.gradient_accumulation_steps}")
    print(f"  Max seq len:  {config.max_seq_length}")
    print(f"  Output:       {args.output_dir}")
    print()

    # Quantization config
    bnb_config = None
    if config.use_4bit:
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16 if config.bf16 else torch.float16,
            bnb_4bit_use_double_quant=True,
        )

    # Load tokenizer
    print("  Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(config.base_model)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # Load dataset
    print("  Loading dataset...")
    train_ds, val_ds = load_jsonl_dataset(args.data_dir, tokenizer)

    # Load model
    print("  Loading model...")
    model = AutoModelForCausalLM.from_pretrained(
        config.base_model,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.bfloat16 if config.bf16 else torch.float16,
        attn_implementation="flash_attention_2" if torch.cuda.is_available() else None,
    )

    if config.use_4bit:
        model = prepare_model_for_kbit_training(model)

    # LoRA config
    lora_config = LoraConfig(
        r=config.lora_r,
        lora_alpha=config.lora_alpha,
        lora_dropout=config.lora_dropout,
        target_modules=config.target_modules,
        bias="none",
        task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, lora_config)
    trainable, total = model.get_nb_trainable_parameters()
    print(f"  Trainable params: {trainable:,} / {total:,} ({100 * trainable / total:.2f}%)\n")

    # Training arguments
    os.makedirs(args.output_dir, exist_ok=True)

    training_args = SFTConfig(
        output_dir=args.output_dir,
        num_train_epochs=config.num_epochs,
        per_device_train_batch_size=config.batch_size,
        gradient_accumulation_steps=config.gradient_accumulation_steps,
        learning_rate=config.learning_rate,
        warmup_ratio=config.warmup_ratio,
        weight_decay=config.weight_decay,
        logging_steps=config.logging_steps,
        save_steps=config.save_steps,
        eval_strategy="steps" if val_ds else "no",
        eval_steps=config.eval_steps if val_ds else None,
        bf16=config.bf16 and torch.cuda.is_bf16_supported(),
        fp16=not config.bf16 and torch.cuda.is_available(),
        gradient_checkpointing=config.gradient_checkpointing,
        max_seq_length=config.max_seq_length,
        dataset_text_field="text",
        report_to="wandb" if config.wandb_project else "none",
        run_name=f"solana-clawd-{args.preset}" if config.wandb_project else None,
        lr_scheduler_type="cosine",
        save_total_limit=3,
        load_best_model_at_end=True if val_ds else False,
    )

    if config.wandb_project:
        os.environ["WANDB_PROJECT"] = config.wandb_project

    # Train
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        processing_class=tokenizer,
    )

    print("  \033[32m▶\033[0m Training started...\n")
    trainer.train()

    # Save
    lora_path = os.path.join(args.output_dir, "lora-adapter")
    trainer.save_model(lora_path)
    tokenizer.save_pretrained(lora_path)

    # Save training metadata
    meta = {
        "base_model": config.base_model,
        "preset": args.preset,
        "lora_r": config.lora_r,
        "lora_alpha": config.lora_alpha,
        "learning_rate": config.learning_rate,
        "epochs": config.num_epochs,
        "train_examples": len(train_ds),
        "val_examples": len(val_ds) if val_ds else 0,
        "max_seq_length": config.max_seq_length,
    }
    with open(os.path.join(args.output_dir, "training_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\n  \033[32m✔\033[0m LoRA adapter saved to {lora_path}")
    print(f"  \033[32m✔\033[0m Metadata saved to {args.output_dir}/training_meta.json\n")
    print("  Next steps:")
    print(f"    python merge_lora.py --base_model {config.base_model} --lora_path {lora_path}")
    print(f"    python to_gguf.py --model_dir ../models/merged --output_dir ../models/gguf\n")


if __name__ == "__main__":
    main()
