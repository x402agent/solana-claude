#!/usr/bin/env python3
"""
Merge LoRA adapters into the base model for GGUF export.

Usage:
  python merge_lora.py --base_model meta-llama/Llama-3.1-8B-Instruct \
                       --lora_path ../checkpoints/solana-clawd/lora-adapter \
                       --output_dir ../models/merged
"""

import argparse
import os
import sys

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer


def main():
    parser = argparse.ArgumentParser(description="Merge LoRA into base model")
    parser.add_argument("--base_model", type=str, required=True)
    parser.add_argument("--lora_path", type=str, required=True)
    parser.add_argument("--output_dir", type=str, default="../models/merged")
    parser.add_argument("--dtype", type=str, default="float16", choices=["float16", "bfloat16"])
    args = parser.parse_args()

    if not os.path.exists(args.lora_path):
        print(f"Error: LoRA adapter not found at {args.lora_path}")
        sys.exit(1)

    print("\n  \033[36m\033[1m$CLAWD LoRA Merge\033[0m\n")
    print(f"  Base model: {args.base_model}")
    print(f"  LoRA path:  {args.lora_path}")
    print(f"  Output:     {args.output_dir}")
    print(f"  Dtype:      {args.dtype}\n")

    dtype = torch.float16 if args.dtype == "float16" else torch.bfloat16

    print("  Loading base model...")
    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=dtype,
        device_map="cpu",
    )

    print("  Loading LoRA adapter...")
    model = PeftModel.from_pretrained(model, args.lora_path)

    print("  Merging weights...")
    model = model.merge_and_unload()

    print("  Saving merged model...")
    os.makedirs(args.output_dir, exist_ok=True)
    model.save_pretrained(args.output_dir, safe_serialization=True)

    tokenizer = AutoTokenizer.from_pretrained(args.lora_path)
    tokenizer.save_pretrained(args.output_dir)

    # Verify
    print("  Verifying merge...")
    test_tokenizer = AutoTokenizer.from_pretrained(args.output_dir)
    test_model = AutoModelForCausalLM.from_pretrained(
        args.output_dir, torch_dtype=dtype, device_map="cpu"
    )
    inputs = test_tokenizer("What is Pump.fun?", return_tensors="pt")
    with torch.no_grad():
        outputs = test_model.generate(**inputs, max_new_tokens=20)
    decoded = test_tokenizer.decode(outputs[0], skip_special_tokens=True)
    print(f"  Verification output: {decoded[:80]}...")
    del test_model

    print(f"\n  \033[32m✔\033[0m Merged model saved to {args.output_dir}")
    print(f"\n  Next: python to_gguf.py --model_dir {args.output_dir} --output_dir ../models/gguf\n")


if __name__ == "__main__":
    main()
