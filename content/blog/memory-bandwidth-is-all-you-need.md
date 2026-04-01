---
title: "Memory Bandwidth Is All You Need"
description: "FLOPS (floating-point operations per second) measure how fast a chip can compute. For autoregressive LLM inference, computing is not the bottleneck."
date: "2026-03-29"
tags: ["Edge Inference","memory bandwidth LLM inference","roofline model LLM inference"]
readTime: "17 min read"
ogImage: "/og/memory-bandwidth-is-all-you-need.png"
canonical: "https://chaitanyaprabuddha.com/blog/memory-bandwidth-is-all-you-need"
published: true
---

FLOPS don't run LLMs. Bandwidth does.

Every hardware comparison, "best CPU for AI" guide, and inference benchmark you have read optimizes for the wrong metric. FLOPS (floating-point operations per second) measure how fast a chip can compute. For autoregressive LLM inference, computing is not the bottleneck. Moving data from memory to the processor is.

This is the difference between buying a $3,000 GPU for inference that bottlenecks on its memory bus and understanding why a $500 Apple M-series chip outperforms it on single-user chat workloads.

The framework that explains this is called the roofline model, and it has been used in high-performance computing since Williams et al. (2009). Applied to LLM inference, it produces a single number, arithmetic intensity, that tells you exactly where your hardware spends its time. Once you understand it, every inference optimization decision becomes obvious.

The math below covers real hardware, shows how to calculate your own token throughput ceiling, and explains why quantization is fundamentally a bandwidth problem, not an accuracy tradeoff.

## The Spec Sheet Lie

When NVIDIA released the H100 GPU, the headline number was 3,958 TFLOPS (FP8 tensor core peak). When Apple released the M4 Max chip, the headline was "up to 4.3x faster machine learning performance" versus M1. When Intel launched the Core Ultra 200 series, they led with "AI TOPS": tera-operations per second for neural networks.

Every one of these numbers measures compute throughput. None of them tell you the metric that determines LLM inference speed for the workload you run.

During autoregressive generation (producing one new token at a time, which is how every chatbot and coding assistant works), each forward pass reads every weight in the model exactly once. A 7-billion parameter model in 16-bit precision occupies 14 GB. The arithmetic that happens per weight per token is a single multiply-add: 2 floating-point operations.

So the chip that can perform 3,958 TFLOPS of computation is spending its time not computing, but waiting. Waiting for 14 GB of weight data to stream from memory. No amount of additional compute units changes that.

> An A100 has 1.5 TB/s of memory bandwidth and 312 TFLOPS of compute. With 32-bit floats, you need approximately 100 multiply operations per element before compute starts to dominate over memory access.

> Source: Horace He, horace.io, 2024

For inference with batch size 1, you are doing 1 multiply per element. You are 100x below the compute ceiling. The compute units are idle almost all of the time.

This is a fundamental property of autoregressive generation: generating one token requires the whole model, every time, sequentially. The only way to change this is to batch multiple requests together (which has latency implications) or reduce how many bytes you move per token.

## Arithmetic Intensity: The Number That Matters

Arithmetic intensity (AI) is the ratio of floating-point operations to bytes of memory accessed:

```
Arithmetic Intensity = FLOPs performed / Bytes read from memory
```

It's measured in FLOP/byte. High arithmetic intensity means the chip is kept busy computing. Low arithmetic intensity means it is mostly waiting for data.

For a matrix-vector multiply (what every linear layer performs during single-token inference: QKV projections, FFN, output projection), the arithmetic intensity depends entirely on the weight data type:

| Weight Dtype | Bytes per Weight | FLOPs per Weight | Arithmetic Intensity |
| --- | --- | --- | --- |
| float32 | 4 bytes | 2 (1 multiply + 1 add) | 0.5 FLOP/byte |
| float16 / bfloat16 | 2 bytes | 2 | 1.0 FLOP/byte |
| int8 | 1 byte | 2 | 2.0 FLOP/byte |
| int4 (4-bit) | 0.5 bytes | 2 | 4.0 FLOP/byte |
| 1.58-bit (BitNet ternary) | ~0.19 bytes | 2 | ~10.5 FLOP/byte |

These are not approximations. They are exact values for the single-token autoregressive inference regime where one input vector is multiplied against the full weight matrix.

Notice what quantization does: it increases arithmetic intensity by reducing the denominator. The compute does not change. The data movement shrinks.

## The Roofline Model Applied to LLM Inference

The roofline model, introduced by Williams, Waterman, and Patterson (2009), characterizes whether a workload is bottlenecked by compute or by memory bandwidth. It does this by comparing the workload's arithmetic intensity against the hardware's *compute-to-bandwidth ratio*.

Every processor has two ceilings:

- **Compute ceiling**: Peak FLOPS, i.e., how fast it can calculate
- **Bandwidth ceiling**: Peak memory bandwidth × arithmetic intensity, i.e., how fast it can feed the compute units

The lower ceiling determines your performance. When arithmetic intensity is low, you are bandwidth-bound. When it is high, you are compute-bound.

The crossover point, where you transition from bandwidth-bound to compute-bound, is:

```
Ridge point (FLOP/byte) = Peak FLOPS / Peak Bandwidth (GB/s)
```

For real hardware:

| Hardware | Peak Bandwidth | Peak FLOPS (FP16) | Ridge Point |
| --- | --- | --- | --- |
| Intel Core i7-12700 (DDR4) | ~50 GB/s | ~100 GFLOPS | 2.0 FLOP/byte |
| AMD Ryzen 9 7950X (DDR5) | ~83 GB/s | ~160 GFLOPS | 1.9 FLOP/byte |
| Apple M2 MacBook Pro (unified) | ~100 GB/s | ~3,600 GFLOPS | 36 FLOP/byte |
| Apple M4 Max (unified) | ~546 GB/s | ~14,200 GFLOPS | 26 FLOP/byte |
| NVIDIA RTX 4090 (GDDR6X) | ~1,008 GB/s | ~330,000 GFLOPS | 327 FLOP/byte |
| NVIDIA H100 SXM (HBM3) | ~3,350 GB/s | ~1,979,000 GFLOPS | 591 FLOP/byte |

Now compare each hardware's ridge point against the arithmetic intensities from the previous table.

**Consumer CPUs** (i7, Ryzen) have a ridge point of roughly 2 FLOP/byte. Float32 inference (0.5 FLOP/byte) and float16 inference (1.0 FLOP/byte) are both bandwidth-bound. Int8 (2.0 FLOP/byte) sits right at the ridge. Int4 (4.0 FLOP/byte) is the first quantization level that pushes consumer CPU inference into compute-bound territory.

**Apple Silicon** has a ridge point of 26–36 FLOP/byte because of its enormous Neural Engine compute relative to bandwidth. Even int4 inference (4.0 FLOP/byte) is still far below the ridge. Apple Silicon inference is almost always bandwidth-bound regardless of quantization level. The M-series chips perform well per watt because the unified memory architecture provides competitive bandwidth at much lower power than discrete GPU GDDR memory.

**Discrete GPUs** have ridge points of 300–600 FLOP/byte. Single-token inference at any quantization level is deeply bandwidth-bound. The H100's 1,979 TFLOPS of FP16 compute are almost entirely irrelevant for serving a single user: you are using perhaps 0.3% of available compute.

GPU compute is dramatically oversized for single-request inference workloads. Bandwidth is the constraint, and bandwidth is where investment pays off.

## Your Hardware's Real Token Throughput Ceiling

Given the roofline analysis, we can derive a simple formula for the theoretical maximum token throughput in the bandwidth-bound regime:

```
max_tokens_per_second = bandwidth_GB_s / model_size_GB
```

This is the ceiling: the best possible performance if you could achieve 100% memory bandwidth utilization. Real systems achieve 60–80% due to cache effects, memory controller overhead, and non-weight memory accesses (activations, KV cache).

Realistic ceilings for Llama 3 7B across hardware and quantization levels:

| Hardware | Bandwidth | float16 (14 GB) | int8 (7 GB) | int4 (3.5 GB) |
| --- | --- | --- | --- | --- |
| i7-12700 (DDR4) | 50 GB/s | 3.6 tok/s (ceil.) ~2-3 real | 7.1 tok/s ~5-6 real | 14.3 tok/s ~10-12 real |
| Ryzen 9 7950X (DDR5) | 83 GB/s | 5.9 tok/s ~4-5 real | 11.9 tok/s ~8-10 real | 23.7 tok/s ~16-18 real |
| Apple M2 Pro (unified) | 200 GB/s | 14.3 tok/s ~10-12 real | 28.6 tok/s ~20-24 real | 57.1 tok/s ~40-46 real |
| Apple M4 Max (unified) | 546 GB/s | 39.0 tok/s ~28-32 real | 78.0 tok/s ~55-62 real | 156 tok/s ~110-125 real |
| RTX 4090 | 1,008 GB/s | 72 tok/s ~50-58 real | 144 tok/s ~100-115 real | 288 tok/s ~200-230 real |

> These numbers match closely with observed llama.cpp benchmarks across the same hardware. The formula is not an approximation. It's the actual constraint, and real performance lands at 65-80% of the ceiling depending on how well the inference engine saturates available bandwidth.

Several things are immediately apparent from this table:

**The M2 Pro beats the i7-12700 by 4x**, not because it has more FLOPS (the i7 has comparable compute throughput) but because it has 4x the memory bandwidth via its unified memory architecture.

**Quantization is linear in bandwidth utilization.** Going from float16 to int8 doubles throughput. Going to int4 doubles it again. The relationship is exact because the bottleneck is purely bytes-per-weight moved from memory.

**A $1,499 M4 MacBook Pro in int8** is within striking distance of a $1,599 RTX 4090 for single-request inference. The GPU costs the same and draws 450W. The MacBook draws 30W.

This follows directly from the bandwidth numbers.

## Quantization Is a Bandwidth Problem

The AI field frames quantization as a tradeoff between accuracy and speed. That framing is incomplete. Quantization is primarily a bandwidth optimization, and understanding it that way changes what you optimize for.

When you quantize a 7B model from float16 to int8, you:
- Reduce model size from 14 GB to 7 GB
- Cut bytes moved per token from 14 GB to 7 GB
- Double arithmetic intensity from 1.0 to 2.0 FLOP/byte
- Double token throughput (in the bandwidth-bound regime)

The accuracy question is whether the information lost by representing weights as integers rather than floats materially affects output quality. For modern post-training quantization methods (GPTQ, AWQ, GGUF Q8_0), the answer at 8-bit is "negligible loss." At 4-bit with good calibration data, the answer is "small but measurable loss on benchmarks, often imperceptible in practice."

Most quantization guides miss this: the speed gain from quantization is not about faster arithmetic. Integer operations on most modern CPUs are not dramatically faster than float16 operations. The speed gain is entirely from reading fewer bytes.

> A Llama 3 7B model running Q8_0 (int8) on an Apple M2 Pro achieves approximately 22 tokens/second. The same model at F16 achieves 11 tokens/second. The 2x improvement maps exactly to the 2x reduction in bytes moved, confirming that bandwidth, not compute, is the binding constraint.

> Source: llama.cpp benchmarks, community data, 2025

This also explains why mixed-precision quantization strategies exist. Attention layers are more sensitive to quantization than FFN layers. If you quantize FFN weights more aggressively (4-bit) while keeping attention at 8-bit, you get bandwidth savings roughly proportional to the FFN's share of total parameter count (~60%), without taking the full accuracy hit of 4-bit on all weights.

It gets more interesting at the extreme end. BitNet's 1.58-bit ternary weights (weights constrained to {-1, 0, +1}) push arithmetic intensity to approximately 10 FLOP/byte. At that level, consumer CPUs approach their ridge point. The limiting factor starts to shift from memory bandwidth to compute, the first time this has been true for single-request CPU inference in the transformer era.

## When You Are Not BandwidthBound

The bandwidth-bound analysis applies specifically to autoregressive single-token generation with small batch sizes. Three scenarios push you toward compute-bound territory.

### Large Batch Inference (Prefill and Serving)

When processing a prompt (prefill) or batching multiple simultaneous requests, the weight matrix is read once but multiplied against multiple vectors. With a batch of B tokens, arithmetic intensity scales to:

```
Arithmetic Intensity (batched) = 2 × B FLOP / bytes_per_weight
```

At batch size 32 with float16 weights: 64 FLOP/byte. At batch size 64: 128 FLOP/byte. At those levels, an RTX 4090 (ridge point: 327 FLOP/byte) is still bandwidth-bound, but A100s and H100s begin to approach compute-bound territory.

This is why GPU utilization during LLM serving scales dramatically with batch size, and why continuous batching (vLLM, TGI) exists: it packs requests together to improve arithmetic intensity across the board.

### Models That Fit in L3 Cache

The bandwidth numbers in our analysis assume weights are loaded from DRAM. L3 cache bandwidth on modern CPUs is 200–400 GB/s, which is 4–8x higher than DRAM bandwidth. If a model fits entirely in L3 cache (~30-60 MB on recent server chips, ~12-24 MB on consumer chips), the effective bandwidth constraint relaxes substantially.

This is why sub-1B models show dramatically higher throughput than the DRAM bandwidth formula predicts: much of the inference time benefits from L3 hit rates of 80%+. Smollm, Phi-3 Mini at Q4, and similar tiny models are in a different performance regime than 7B+ models.

### LongContext Attention

As sequence length grows, the attention mechanism's compute requirements grow quadratically (O(n²)) while weight loads remain linear. At sequence lengths of 8,000+ tokens with large batch sizes, attention becomes compute-intensive enough to shift toward the compute-bound regime. This is the domain where FlashAttention's tiling optimizations pay off by improving compute reuse.

For typical chat use cases (512–2048 token contexts), attention is still bandwidth-bound, and the weight-loading analysis holds.

## What This Means for Hardware Decisions

The roofline model gives us a principled framework for hardware evaluation. Instead of comparing FLOPS, compare bandwidth-per-dollar and bandwidth-per-watt.

| Hardware | Bandwidth | MSRP | TDP | GB/s per $100 | GB/s per Watt |
| --- | --- | --- | --- | --- | --- |
| Intel i7-12700 (DDR4-3200) | 50 GB/s | $320 | 65W | 15.6 | 0.77 |
| AMD Ryzen 9 7950X (DDR5-5600) | 83 GB/s | $699 | 170W | 11.9 | 0.49 |
| Apple M2 Pro MacBook Pro | 200 GB/s | $1,999 | ~30W | 10.0 | 6.67 |
| Apple M4 Max MacBook Pro | 546 GB/s | $2,499 | ~40W | 21.8 | 13.65 |
| NVIDIA RTX 4090 | 1,008 GB/s | $1,599 | 450W | 63.0 | 2.24 |
| NVIDIA RTX 4070 | 504 GB/s | $599 | 200W | 84.1 | 2.52 |

The RTX 4070 has the best bandwidth-per-dollar of any option here at 84 GB/s per $100, which is why it became the community favorite for local LLM inference despite not being the "best" GPU by FLOPS. The M4 Max wins decisively on bandwidth-per-watt, which matters for always-on deployments.

> When evaluating hardware for LLM inference, divide the memory bandwidth by the model size in GB. That quotient is your theoretical maximum tokens per second. Then multiply by 0.65-0.75 for a realistic estimate. If that number meets your requirements, the hardware is sufficient. Additional compute headroom is wasted.

One overlooked implication: more VRAM at lower bandwidth is often better than less VRAM at higher bandwidth for inference. A GPU with 48 GB of GDDR6 (768 GB/s) can run a 34B model that a 24 GB GDDR6X GPU cannot fit, and the 34B model might produce better output than any quantized 7B model, offsetting the lower bandwidth. Evaluate bandwidth in the context of which models you can fit.

## Key Takeaways

- For autoregressive single-token generation, LLM inference is bandwidth-bound, not compute-bound. Peak FLOPS are irrelevant; peak memory bandwidth determines token throughput.

- Arithmetic intensity for single-token inference = 2 FLOPs / bytes_per_weight: 0.5 FLOP/byte for float32, 1.0 for float16, 2.0 for int8, 4.0 for int4. This is fixed by the workload, not the hardware.

- The theoretical maximum tokens per second = memory_bandwidth_GB_s / model_size_GB. Real performance lands at 65–75% of this ceiling. This formula works across CPU, Apple Silicon, and discrete GPUs.

- Quantization improves inference speed not because integer math is faster, but because fewer bytes are moved from memory per token. The speedup is linear and predictable: int8 doubles throughput versus float16 on the same hardware.

- Apple Silicon's unified memory architecture produces competitive inference throughput per watt because the bandwidth-per-watt ratio is 3–6x better than discrete GPU GDDR memory, a direct consequence of not routing data through a PCIe bus.

- Batch inference, models fitting in L3 cache, and long-context attention are the three regimes where compute (rather than bandwidth) becomes the binding constraint. Single-user chat inference is almost never in any of these regimes.

## FAQ

### Why is LLM inference memorybound?

During autoregressive generation (producing one token at a time), each forward pass must read all the model's weight matrices from memory but performs only a single multiply-add operation per weight. For a 7-billion parameter model, that is 14 GB of data movement for just 14 GFLOPS of arithmetic: an arithmetic intensity of 1.0 FLOP/byte at float16. Modern CPUs and GPUs have compute-to-bandwidth ratios of 2–600 FLOP/byte at their ridge points, meaning single-token inference sits far below the compute ceiling and is entirely limited by how fast memory can be read. Increasing FLOPS does not help; increasing bandwidth does.

### How do I calculate the maximum tokens per second for my hardware?

The formula is: max_tokens_per_second = memory_bandwidth_GB_s / model_size_GB. For example, an Intel i7-12700 has approximately 50 GB/s of memory bandwidth. A Llama 3 7B model in float16 occupies 14 GB. Maximum throughput = 50 / 14 = 3.6 tokens/second. Realistic throughput is 65–75% of this ceiling, so approximately 2–3 tokens/second. For int8 quantization (7 GB model), the ceiling doubles to 7.1 tokens/second, and realistic throughput is 5–6 tokens/second. This formula works for CPUs, Apple Silicon, and discrete GPUs with consistent accuracy across hardware families.

### Does quantization improve LLM inference speed?

Yes, and the mechanism is bandwidth reduction, not faster arithmetic. Quantizing a model from float16 to int8 halves the bytes moved per token, which doubles throughput in the bandwidth-bound regime. The speedup is linear and predictable: int8 gives 2x over float16, int4 gives 4x. On a consumer CPU running Llama 3 7B, this means going from 2–3 tokens/second (float16) to 10–12 tokens/second (int4), without any changes to the model architecture or the inference engine's compute kernels. The accuracy cost at int8 is negligible with modern quantization methods; at int4 it is small but measurable on benchmarks.

### Why does Apple Silicon perform so well for LLM inference?

Apple Silicon uses a unified memory architecture where CPU, GPU, and Neural Engine share the same high-bandwidth memory pool with no PCIe transfer overhead. The M2 Pro provides 200 GB/s of memory bandwidth; the M4 Max provides 546 GB/s. Since LLM inference throughput scales linearly with memory bandwidth, Apple Silicon matches or exceeds discrete GPUs costing more money and drawing 10–15x more power. The M4 Max achieves 13.65 GB/s of bandwidth per watt versus approximately 2.24 GB/s per watt for an RTX 4090, a 6x efficiency advantage that explains its dominance in always-on local inference workloads.

### What is the roofline model and how does it apply to LLMs?

The roofline model, introduced by Williams et al. (2009), characterizes whether a workload is bottlenecked by compute or by memory bandwidth. It compares a workload's arithmetic intensity (FLOPs per byte of memory accessed) against a processor's ridge point (peak FLOPS / peak bandwidth). If arithmetic intensity is below the ridge point, the workload is bandwidth-bound and performance scales with bandwidth. If it is above, the workload is compute-bound and scales with FLOPS. For LLM inference at batch size 1, arithmetic intensity is 0.5–4.0 FLOP/byte depending on quantization. Consumer CPU ridge points are 1.9–2.0 FLOP/byte, GPU ridge points are 300–600 FLOP/byte. This means LLM inference is bandwidth-bound on nearly all hardware at nearly all quantization levels.

The roofline model is not new. HPC engineers have applied it to every compute workload for 15 years. The LLM inference community largely ignored it until the proliferation of local inference made the performance implications impossible to ignore.

Understanding that LLM inference is bandwidth-bound changes how you think about every optimization decision. Quantization is not a quality tradeoff but a bandwidth optimization with a predictable, linear speedup. Hardware choice is not about peak FLOPS but about GB/s per dollar and GB/s per watt. Serving architecture is not about maximizing GPU utilization but about whether your batch size is large enough to push arithmetic intensity toward the compute ceiling.

The formula is simple: bandwidth / model size = tokens per second. Everything else is a footnote.

If you are building inference infrastructure today, the next thing to understand is what happens when you push arithmetic intensity high enough to escape the bandwidth ceiling. Specifically, what BitNet's ternary weights and the extreme quantization frontier look like when you apply this framework to the emerging generation of sub-2-bit models. The interesting edge cases live there.
