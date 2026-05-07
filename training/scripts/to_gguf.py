#!/usr/bin/env python3
"""
Convert a merged HuggingFace model to GGUF format using llama.cpp.

Usage:
  python to_gguf.py --model_dir ../models/merged --output_dir ../models/gguf
  python to_gguf.py --model_dir ../models/merged --output_dir ../models/gguf --quantize Q4_K_M,Q5_K_M,Q8_0
  python to_gguf.py --model_dir ../models/merged --output_dir ../models/gguf --auto-setup
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path


QUANT_TYPES = {
    "Q4_K_M": "4-bit medium quality — best size/quality tradeoff, recommended for most users",
    "Q5_K_M": "5-bit medium quality — better quality, ~25% larger",
    "Q8_0": "8-bit — near-lossless, 2x size of Q4_K_M",
    "F16": "Full 16-bit — reference quality, largest",
}


def find_llama_cpp(auto_setup: bool = False) -> str:
    """Find or set up llama.cpp."""
    # Check common locations
    for candidate in [
        os.environ.get("LLAMA_CPP_PATH", ""),
        os.path.expanduser("~/llama.cpp"),
        "/opt/llama.cpp",
        "../../../llama.cpp",
    ]:
        if candidate and os.path.isdir(candidate):
            convert = os.path.join(candidate, "convert_hf_to_gguf.py")
            if os.path.exists(convert):
                return candidate

    if not auto_setup:
        print("Error: llama.cpp not found.")
        print("Either:")
        print("  1. Set LLAMA_CPP_PATH environment variable")
        print("  2. Clone to ~/llama.cpp: git clone https://github.com/ggml-org/llama.cpp ~/llama.cpp")
        print("  3. Use --auto-setup flag to clone and build automatically")
        sys.exit(1)

    # Auto-setup
    llama_dir = os.path.expanduser("~/llama.cpp")
    print("  Setting up llama.cpp...")
    subprocess.run(["git", "clone", "https://github.com/ggml-org/llama.cpp", llama_dir], check=True)
    subprocess.run(["cmake", "-B", "build", "-DCMAKE_BUILD_TYPE=Release"], cwd=llama_dir, check=True)
    subprocess.run(["cmake", "--build", "build", "--config", "Release", "-j"], cwd=llama_dir, check=True)
    return llama_dir


def convert_to_gguf(model_dir: str, output_dir: str, llama_dir: str) -> str:
    """Convert HF model to GGUF F16."""
    convert_script = os.path.join(llama_dir, "convert_hf_to_gguf.py")
    output_f16 = os.path.join(output_dir, "solana-clawd-f16.gguf")

    print("  Converting to GGUF (F16)...")
    subprocess.run([
        sys.executable, convert_script,
        model_dir,
        "--outfile", output_f16,
        "--outtype", "f16",
    ], check=True)

    size_mb = os.path.getsize(output_f16) / (1024 * 1024)
    print(f"  \033[32m✔\033[0m F16 GGUF: {output_f16} ({size_mb:.0f} MB)")
    return output_f16


def quantize(f16_path: str, output_dir: str, llama_dir: str, quant_types: list[str]):
    """Quantize F16 GGUF to smaller variants."""
    quantize_bin = None
    for candidate in [
        os.path.join(llama_dir, "build", "bin", "llama-quantize"),
        os.path.join(llama_dir, "build", "llama-quantize"),
        os.path.join(llama_dir, "llama-quantize"),
    ]:
        if os.path.exists(candidate):
            quantize_bin = candidate
            break

    if not quantize_bin:
        print("  Warning: llama-quantize not found. Build llama.cpp first.")
        print(f"    cd {llama_dir} && cmake -B build && cmake --build build -j")
        return

    results = []
    for qtype in quant_types:
        if qtype == "F16":
            continue
        output_path = os.path.join(output_dir, f"solana-clawd-{qtype}.gguf")
        print(f"  Quantizing to {qtype}...")
        subprocess.run([quantize_bin, f16_path, output_path, qtype], check=True)
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        results.append((qtype, output_path, size_mb))
        print(f"  \033[32m✔\033[0m {qtype}: {size_mb:.0f} MB")

    return results


def generate_ollama_modelfile(gguf_path: str, output_dir: str, model_name: str = "solana-clawd"):
    """Generate an Ollama Modelfile."""
    soul_prompt = (
        "You are solana-clawd, an AI-powered Solana trading agent with 37 MCP tools "
        "for on-chain analysis, trading, and portfolio management. You use the OODA loop "
        "(Observe-Orient-Decide-Act) methodology for trading decisions. You operate with "
        "three memory tiers: KNOWN (verified on-chain data), LEARNED (persistent trade "
        "patterns), and INFERRED (tentative signals). You never execute trades without "
        "explicit permission. You specialize in Pump.fun bonding curves, Jupiter/Raydium "
        "DEX aggregation, Helius on-chain data, and multi-agent coordination. "
        "You prioritize capital preservation, deny-first permissions, and transparency "
        "in all trading decisions."
    )

    modelfile = f"""FROM ./{os.path.basename(gguf_path)}

SYSTEM \"\"\"{soul_prompt}\"\"\"

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_ctx 4096
PARAMETER repeat_penalty 1.1
"""

    modelfile_path = os.path.join(output_dir, "Modelfile")
    with open(modelfile_path, "w") as f:
        f.write(modelfile)

    print(f"  \033[32m✔\033[0m Modelfile written to {modelfile_path}")
    print(f"\n  To create Ollama model:")
    print(f"    cd {output_dir}")
    print(f"    ollama create {model_name} -f Modelfile\n")


def main():
    parser = argparse.ArgumentParser(description="Convert model to GGUF")
    parser.add_argument("--model_dir", type=str, required=True,
                        help="Path to merged HuggingFace model")
    parser.add_argument("--output_dir", type=str, default="../models/gguf",
                        help="Output directory for GGUF files")
    parser.add_argument("--quantize", type=str, default="Q4_K_M,Q5_K_M,Q8_0",
                        help="Comma-separated quantization types")
    parser.add_argument("--auto-setup", action="store_true",
                        help="Auto-clone and build llama.cpp if not found")
    parser.add_argument("--llama-cpp-path", type=str, default=None,
                        help="Path to llama.cpp directory")
    parser.add_argument("--skip-quantize", action="store_true",
                        help="Only convert to F16, skip quantization")
    parser.add_argument("--ollama-name", type=str, default="solana-clawd",
                        help="Name for Ollama model")
    args = parser.parse_args()

    print("\n  \033[36m\033[1m$CLAWD GGUF Export\033[0m\n")
    print(f"  Model:    {args.model_dir}")
    print(f"  Output:   {args.output_dir}")
    print(f"  Quantize: {args.quantize}\n")

    os.makedirs(args.output_dir, exist_ok=True)

    # Find llama.cpp
    if args.llama_cpp_path:
        os.environ["LLAMA_CPP_PATH"] = args.llama_cpp_path
    llama_dir = find_llama_cpp(args.auto_setup)
    print(f"  Using llama.cpp at: {llama_dir}\n")

    # Convert to GGUF F16
    f16_path = convert_to_gguf(args.model_dir, args.output_dir, llama_dir)

    # Quantize
    if not args.skip_quantize:
        quant_types = [q.strip() for q in args.quantize.split(",")]
        quantize(f16_path, args.output_dir, llama_dir, quant_types)

    # Generate Ollama Modelfile
    best_quant = os.path.join(args.output_dir, "solana-clawd-Q4_K_M.gguf")
    if not os.path.exists(best_quant):
        best_quant = f16_path
    generate_ollama_modelfile(best_quant, args.output_dir, args.ollama_name)

    print("  \033[32m✔\033[0m GGUF export complete!\n")
    print("  Available quantizations:")
    for qtype, desc in QUANT_TYPES.items():
        path = os.path.join(args.output_dir, f"solana-clawd-{qtype}.gguf")
        if os.path.exists(path):
            size_mb = os.path.getsize(path) / (1024 * 1024)
            print(f"    {qtype.ljust(8)} {size_mb:>8.0f} MB  {desc}")
    print()


if __name__ == "__main__":
    main()
