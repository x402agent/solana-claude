"""
Hyperparameter presets for fine-tuning Solana CLAWD trading models.

Supports Llama 3, Mistral, and Phi-3 base models with LoRA.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TrainConfig:
    base_model: str
    lora_r: int = 32
    lora_alpha: int = 64
    lora_dropout: float = 0.05
    learning_rate: float = 2e-4
    batch_size: int = 4
    gradient_accumulation_steps: int = 4
    num_epochs: int = 3
    max_seq_length: int = 4096
    warmup_ratio: float = 0.05
    weight_decay: float = 0.01
    target_modules: list[str] = field(default_factory=lambda: [
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ])
    use_4bit: bool = True
    bf16: bool = True
    gradient_checkpointing: bool = True
    logging_steps: int = 10
    save_steps: int = 100
    eval_steps: int = 50
    wandb_project: Optional[str] = None


PRESETS: dict[str, TrainConfig] = {
    "llama3": TrainConfig(
        base_model="meta-llama/Llama-3.1-8B-Instruct",
        lora_r=64,
        lora_alpha=128,
        learning_rate=2e-4,
        max_seq_length=4096,
    ),
    "llama3-small": TrainConfig(
        base_model="meta-llama/Llama-3.2-3B-Instruct",
        lora_r=32,
        lora_alpha=64,
        learning_rate=3e-4,
        max_seq_length=2048,
    ),
    "mistral": TrainConfig(
        base_model="mistralai/Mistral-7B-Instruct-v0.3",
        lora_r=32,
        lora_alpha=64,
        learning_rate=1e-4,
        max_seq_length=4096,
    ),
    "phi3": TrainConfig(
        base_model="microsoft/Phi-3-mini-4k-instruct",
        lora_r=16,
        lora_alpha=32,
        learning_rate=5e-5,
        max_seq_length=2048,
        target_modules=["qkv_proj", "o_proj", "gate_up_proj", "down_proj"],
    ),
    "qwen2": TrainConfig(
        base_model="Qwen/Qwen2.5-7B-Instruct",
        lora_r=32,
        lora_alpha=64,
        learning_rate=1.5e-4,
        max_seq_length=4096,
    ),
}


def get_config(preset: str) -> TrainConfig:
    if preset not in PRESETS:
        raise ValueError(f"Unknown preset '{preset}'. Available: {list(PRESETS.keys())}")
    return PRESETS[preset]
