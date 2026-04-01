---
title: "BitNet 1.58bit Inference in Pure C: Ternary Weights, Packing, and Kernels"
description: "The math behind that claim is straightforward. When every weight is constrained to {-1, 0, 1}, matrix multiplication reduces to additions and subtractions."
date: "2026-03-29"
tags: ["Edge Inference","BitNet inference C implementation","1.58 bit quantization C"]
readTime: "17 min read"
ogImage: "/og/bitnet-1-58-bit-inference-pure-c.png"
canonical: "https://chaitanyaprabuddha.com/blog/bitnet-1-58-bit-inference-pure-c"
published: true
---

BitNet 1.58-bit models replace every floating-point multiply with a table lookup, cutting inference energy by 71x compared to FP16 while matching full-precision accuracy on standard benchmarks.

The math behind that claim is straightforward. When every weight is constrained to {-1, 0, 1}, matrix multiplication reduces to additions and subtractions. Zeros contribute nothing at all. No multiplications. On hardware where multiplication costs 10x more energy than addition, this represents a fundamental change in the computational profile of inference.

The research from Microsoft (Ma et al., 2024) demonstrated that models trained with ternary weights from scratch (not post-training quantized from float32) match the quality of full-precision models at equivalent parameter counts from 1B parameters up. The question the paper leaves open matters for practitioners: how do you implement efficient inference for these weights?

The Triton kernel in the Hugging Face reference implementation cannot drop into a CPU inference engine. llama.cpp has partial support. The existing C implementations are scattered and undocumented.

A complete BitNet inference kernel built from scratch in C, covering weight packing, unpacking, the ternary matmul, and the scaling logic that keeps activations clean. You will have working code and a precise understanding of why it runs faster than any float quantization.

## Why 1.58 Bits? The Math Behind the Name

"1.58-bit" refers to the information content of a ternary value. This is log₂(3) ≈ 1.585 bits per value. A binary weight (1 bit) can represent two states. A ternary weight (1.58 bits) can represent three: -1, 0, or +1.

The zero value makes this interesting. When a weight is zero, the entire multiply-add operation for that element is skipped. Zero times anything is zero. In practice, BitNet models learn to use zero aggressively. Roughly 50% of weights in trained BitNet models are zero, with the remainder split evenly between -1 and +1.

> BitNet b1.58 reduces the energy consumption of matrix multiplication by 71.4x compared to FP16 and achieves 2.71x throughput improvement, while matching the performance of full-precision LLaMA at equivalent parameter counts from 1B parameters upward.

> Source: Ma et al., Microsoft Research, 2024

The implication for storage is significant. Four ternary values can be packed into 1 byte (using 2 bits per value, with one combination unused). A 7-billion parameter model needs 1.75 GB of weight storage, compared to 14 GB for float16 and 7 GB for int8. This provides a 4x improvement over int8 and an 8x improvement over float16. This is the metric that determines inference speed on bandwidth-limited hardware.

**Why not 1-bit?** Pure binary weights (-1 and +1 only) work but perform slightly worse than ternary at the same parameter count. The zero value allows the model to learn sparse representations, selectively ignoring input features. This capability is important for efficient learning. Binary networks require wider layers to compensate.

## Ternary Weight Representation

In a trained BitNet model, each weight w ∈ {-1, 0, +1}. During training, a per-tensor scale factor α is learned alongside the weights. This is used to recover the original weight magnitude:

```
w_float ≈ w_ternary × α
```

Where α = mean(|W|), the mean absolute value of the full-precision weight matrix before quantization. This scale factor is stored as a single float32 per layer weight matrix (not per weight). One scalar per matrix means its storage overhead is negligible.

For inference, the forward pass computation becomes:

```
y = (W_ternary ⊙ x) × α
```

Where ⊙ represents the ternary multiply. For each weight, add x to the accumulator (w=+1), subtract x (w=-1), or do nothing (w=0). Then multiply the entire output vector by α at the end. This is exact, with no approximation.

## Packing Ternary Weights into int8 Bytes

We represent each ternary value using 2 bits:
- `00` = 0
- `01` = +1
- `10` = -1

This wastes one combination (`11` is unused) but gives us clean bit manipulation. Four ternary values pack into one int8 byte.

```
// Encode a single ternary value as 2 bits
// val must be -1, 0, or +1
static inline uint8_t encode_ternary(int val) {
    if (val == 0)  return 0x0;  // 00
    if (val == 1)  return 0x1;  // 01
    if (val == -1) return 0x2;  // 10
    return 0x0; // invalid -> treat as zero
}

// Pack 4 ternary values into one uint8
// values[0] occupies bits [1:0], values[3] occupies bits [7:6]
uint8_t pack_ternary(const int *values) {
    uint8_t packed = 0;
    for (int i = 0; i < 4; i++) {
        packed |= (encode_ternary(values[i]) & 0x3) << (i * 2);
    }
    return packed;
}

// Pack an entire weight matrix
// W_float: [out_dim, in_dim] float32 weights
// W_packed: [out_dim, ceil(in_dim/4)] uint8 packed weights
// Returns the scale factor alpha
float pack_weight_matrix(
    uint8_t *W_packed, const float *W_float,
    int out_dim, int in_dim
) {
    // Compute scale: alpha = mean(|W|)
    float sum_abs = 0.0f;
    int total = out_dim * in_dim;
    for (int i = 0; i < total; i++) sum_abs += fabsf(W_float[i]);
    float alpha = sum_abs / total;
    float inv_alpha = 1.0f / (alpha + 1e-8f);

    // Quantize and pack
    int packed_in = (in_dim + 3) / 4; // ceil(in_dim/4)
    for (int row = 0; row < out_dim; row++) {
        for (int col_block = 0; col_block < packed_in; col_block++) {
            int vals[4] = {0, 0, 0, 0};
            for (int k = 0; k < 4; k++) {
                int col = col_block * 4 + k;
                if (col < in_dim) {
                    float w = W_float[row * in_dim + col] * inv_alpha;
                    // Round to nearest ternary: -1, 0, +1
                    vals[k] = (w > 0.5f) ? 1 : (w < -0.5f) ? -1 : 0;
                }
            }
            W_packed[row * packed_in + col_block] = pack_ternary(vals);
        }
    }
    return alpha;
}
```

The packing is done once at model load time. The packed weights are stored alongside a single float32 scale per matrix. For a 7B model, total weight storage is approximately 1.75 GB + negligible scale overhead.

## Unpacking at Inference Time

During inference, we unpack 4 weights at a time from each byte. The unpacking logic is the inner loop hot path. It needs to be fast.

```
// Decode a packed byte into 4 ternary values: -1, 0, or +1
// Output as int8_t for efficient SIMD processing
static inline void unpack_ternary(uint8_t packed, int8_t *out) {
    for (int i = 0; i < 4; i++) {
        uint8_t bits = (packed >> (i * 2)) & 0x3;
        // 00 -> 0, 01 -> +1, 10 -> -1
        out[i] = (bits == 0x1) ? 1 : (bits == 0x2) ? -1 : 0;
    }
}

// Vectorized version: unpack 8 packed bytes (32 weights) at once
// More efficient for inner loop when in_dim is large
static void unpack_row_segment(
    const uint8_t *packed, int8_t *unpacked, int n_packed
) {
    for (int i = 0; i < n_packed; i++) {
        unpack_ternary(packed[i], unpacked + i * 4);
    }
}
```

On modern x86 with AVX2, you can unpack 32 ternary weights per cycle using byte shuffle instructions. The scalar version above is a correct reference implementation; the vectorized version is where production performance comes from.

## The Ternary MatrixVector Multiply

The key insight is that a ternary multiply-add reduces to a conditional add/subtract with no multiply. For weight w and input x:
- w=0: nothing
- w=+1: accumulator += x
- w=-1: accumulator -= x

```
// Ternary matrix-vector multiply: out = W_ternary * x (before scaling)
// W_packed: [out_dim, ceil(in_dim/4)] packed ternary weights
// x_int8: int8-quantized input vector [in_dim]
// out_int32: int32 accumulator output [out_dim]
void ternary_matmul(
    int32_t *out_int32,
    const uint8_t *W_packed,
    const int8_t *x_int8,
    int out_dim, int in_dim
) {
    int packed_in = (in_dim + 3) / 4;

    for (int row = 0; row < out_dim; row++) {
        int32_t acc = 0;
        const uint8_t *row_ptr = W_packed + row * packed_in;

        for (int col_block = 0; col_block < packed_in; col_block++) {
            uint8_t packed = row_ptr[col_block];

            // Unpack and accumulate 4 weights at a time
            for (int k = 0; k < 4; k++) {
                int col = col_block * 4 + k;
                if (col >= in_dim) break;

                uint8_t bits = (packed >> (k * 2)) & 0x3;
                if (bits == 0x1) acc += (int32_t)x_int8[col];   // w = +1
                else if (bits == 0x2) acc -= (int32_t)x_int8[col]; // w = -1
                // bits == 0x0: w = 0, skip (no-op)
            }
        }
        out_int32[row] = acc;
    }
}
```

This inner loop has no multiplications. On a CPU where integer addition takes 1 cycle and multiplication takes 3-4 cycles, this is a meaningful reduction. The branch on `bits` is predictable. Approximately 50% of weights are zero, which the branch predictor learns quickly, making the skip nearly free.

For better performance, rewrite the inner loop to use a lookup table keyed on the packed byte.

```
// Lookup table approach: precompute contribution of each packed byte
// for each possible 8-bit input activation value
// Foundation of the SIMD-friendly kernel

// For 4-bit input windows, precompute a 256 × 256 contribution table
// contribution[packed_byte][input_nibble] = sum of ternary*input products
// Full table is 64KB, which fits in L2 cache
typedef struct {
    int8_t table[256][4]; // for each packed byte, the 4 decoded weights
} TernaryLUT;

void build_ternary_lut(TernaryLUT *lut) {
    for (int b = 0; b < 256; b++) {
        for (int k = 0; k < 4; k++) {
            uint8_t bits = (b >> (k * 2)) & 0x3;
            lut->table[b][k] = (bits == 0x1) ? 1 : (bits == 0x2) ? -1 : 0;
        }
    }
}
```

## Activation Quantization

BitNet uses 8-bit activation quantization. The input to each linear layer is quantized from float32/float16 to int8 before the ternary matmul, then dequantized afterward.

```
// Quantize float activation vector to int8
// Uses per-tensor absmax scaling: scale = 127 / max(|x|)
float quantize_activation(
    int8_t *x_int8, const float *x_float, int dim
) {
    // Find absmax
    float absmax = 0.0f;
    for (int i = 0; i < dim; i++) {
        float abs_val = fabsf(x_float[i]);
        if (abs_val > absmax) absmax = abs_val;
    }
    absmax = fmaxf(absmax, 1e-8f); // prevent division by zero

    // Quantize
    float scale = 127.0f / absmax;
    for (int i = 0; i < dim; i++) {
        float quantized = x_float[i] * scale;
        // Clamp to int8 range and round
        x_int8[i] = (int8_t)fmaxf(-128.0f, fminf(127.0f, roundf(quantized)));
    }
    return scale; // caller needs this to dequantize
}
```

The scale factor is the inverse of absmax normalized to 127. To recover the original activation magnitude, divide by scale. This scale is needed at the output to reconstruct float values.

## Scale Factors and Output Reconstruction

After the ternary matmul, the int32 accumulator needs to be converted back to float. Two scale factors are involved:

- `alpha` (weight scale): per-matrix, stored alongside packed weights
- `x_scale` (activation scale): per-vector, computed during quantization

The output reconstruction:

```
y_float[i] = out_int32[i] / x_scale / alpha_inv
           = out_int32[i] * alpha / x_scale
```

Where `alpha_inv = 1/alpha` (precomputed at model load time to avoid division at inference time).

```
// Full linear layer: float in, float out
// Internally: quantize activations -> ternary matmul -> dequantize
void bitnet_linear(
    float *out,           // [out_dim] float output
    const float *x,       // [in_dim] float input
    const uint8_t *W_packed, // [out_dim, packed_in] packed ternary weights
    float alpha,          // weight scale (per-matrix)
    int out_dim, int in_dim
) {
    // Step 1: Quantize activations
    int8_t *x_int8 = alloca(in_dim * sizeof(int8_t));
    float x_scale = quantize_activation(x_int8, x, in_dim);

    // Step 2: Ternary matmul (int8 inputs -> int32 accumulator)
    int32_t *acc = alloca(out_dim * sizeof(int32_t));
    ternary_matmul(acc, W_packed, x_int8, out_dim, in_dim);

    // Step 3: Dequantize
    // acc = W_ternary * x_int8, scaled by (1/alpha) and (1/x_scale)
    float dequant_scale = alpha / x_scale;
    for (int i = 0; i < out_dim; i++) {
        out[i] = (float)acc[i] * dequant_scale;
    }
}
```

This function replaces the standard `matmul` in the forward pass, with the same conceptual signature and position in the layer stack.

## Putting It Together: A Full Linear Layer in the Forward Pass

A BitNet transformer forward pass is identical to a standard Llama forward pass with one substitution: every `matmul` call is replaced by `bitnet_linear`. The RMSNorm, RoPE, attention mechanics, and SwiGLU activation are unchanged.

```
// BitNet weights struct (extends standard TransformerWeights)
typedef struct {
    // Packed ternary weight matrices [out_dim, ceil(in_dim/4)]
    uint8_t **wq_packed;  // [n_layers][...]
    uint8_t **wk_packed;
    uint8_t **wv_packed;
    uint8_t **wo_packed;
    uint8_t **wgate_packed;
    uint8_t **wup_packed;
    uint8_t **wdown_packed;

    // Per-matrix scale factors
    float *alpha_wq;      // [n_layers]
    float *alpha_wk;
    float *alpha_wv;
    float *alpha_wo;
    float *alpha_wgate;
    float *alpha_wup;
    float *alpha_wdown;

    // Non-quantized weights (embedding, norms stay float)
    float *token_embed;
    float **rms_att_w;
    float **rms_ffn_w;
    float *rms_final_w;
    float *lm_head;       // may share with token_embed
} BitNetWeights;

// QKV projections in the forward pass:
bitnet_linear(s->q, s->xb, w->wq_packed[l], w->alpha_wq[l], dim, dim);
bitnet_linear(s->k, s->xb, w->wk_packed[l], w->alpha_wk[l], kv_dim, dim);
bitnet_linear(s->v, s->xb, w->wv_packed[l], w->alpha_wv[l], kv_dim, dim);
```

The embedding table and layer norms are kept in float. Quantizing these provides minimal storage benefit since they are small, and their precision matters for output quality. All large projection matrices (QKV, FFN gate/up/down) use ternary weights.

## Benchmark: BitNet vs float16 vs int8 on CPU

Theoretical throughput comparison for a 7B-equivalent model at single-token generation on an Intel Core i7-12700 (50 GB/s memory bandwidth):

| Format | Model Size | Bandwidth Used/token | Theoretical Ceiling | Realistic Throughput |
| --- | --- | --- | --- | --- |
| float16 | 14 GB | 14 GB | 3.6 tok/s | ~2-3 tok/s |
| int8 | 7 GB | 7 GB | 7.1 tok/s | ~5-6 tok/s |
| BitNet 1.58-bit | 1.75 GB | 1.75 GB | 28.6 tok/s | ~18-22 tok/s |

The arithmetic shows that BitNet's 1.75 GB model size at 50 GB/s gives a theoretical ceiling of 28.6 tok/s. The realistic number (18–22 tok/s) accounts for activation quantization overhead, scale factor computation, and non-weight memory accesses. Even the realistic number is 4–8x better than float16 on the same hardware.

**The energy reduction claim**: The 71.4x energy reduction from the Microsoft paper is specifically for the matrix multiplication operations. It compares FP16 multiplications (the dominant energy consumer in standard inference) to ternary additions/subtractions. The 71.4x figure applies to matmul energy specifically. Whole-system inference energy reduction (including memory access, normalization, attention) is smaller, approximately 10-15x in practice.

## Limitations and What to Watch

BitNet's advantages come with real constraints worth understanding before committing to the approach.

**Requires training from scratch**: Post-training quantization of an existing float model to BitNet weights does not maintain quality. The ternary constraint must be applied during training for the model to learn representations that work with it. Fine-tuning an existing model with ternary weight quantization (as the Hugging Face paper demonstrates) works but requires 10B+ tokens of additional training to recover quality. This presents a barrier to adoption compared to post-training quantization methods like GPTQ and AWQ that work on existing checkpoints.

**Limited model availability**: As of early 2025, production-ready BitNet models are limited. Microsoft's research models and the Hugging Face Llama3-BitNet fine-tunes are available but not yet competitive with state-of-the-art full-precision models of equivalent parameter count. The ecosystem is early.

**The zero-sparsity assumption**: The performance projections assume approximately 50% zero weights. Models trained with different regularization or on different data distributions may have different sparsity ratios, affecting the practical speedup. Measure sparsity in your target model before projecting throughput.

**Activation quantization adds overhead**: Per-tensor activation quantization requires two passes over each input vector (one for absmax, one for quantization). For small dimensions (dim < 512), this overhead is proportionally significant. At larger dimensions, the overhead is amortized.

## Key Takeaways

- BitNet 1.58-bit uses ternary weights {-1, 0, +1}, which is 1.585 bits per value (log₂3), eliminating all multiplications from matrix operations. Multiply-add becomes conditional add/subtract/no-op.

- Four ternary values pack into one int8 byte using 2 bits each (00=0, 01=+1, 10=-1). A 7B equivalent model occupies 1.75 GB (4x smaller than int8, 8x smaller than float16), directly translating to 4–8x higher bandwidth-limited throughput.

- The forward pass is identical to a standard transformer with one substitution: every matmul is replaced by bitnet_linear, which quantizes activations to int8, runs the ternary matmul, then dequantizes using the per-matrix weight scale alpha.

- The 71.4x energy reduction cited by Microsoft Research applies to matrix multiplication operations specifically. Whole-system inference energy reduction is approximately 10–15x, still significant for battery-powered and edge deployments.

- BitNet requires training from scratch with ternary constraints. Post-training quantization of existing float models does not work at quality parity. This is the primary adoption barrier versus int8/int4 methods that work on existing checkpoints.

## FAQ

### What is BitNet 1.58bit quantization?

BitNet 1.58-bit quantization is a neural network weight quantization scheme where every model weight is constrained to one of three values: -1, 0, or +1. The name comes from log₂(3) ≈ 1.585 bits, the information content of a ternary value. Unlike post-training quantization that approximates float weights as integers, BitNet trains models with ternary weights from scratch, allowing the model to learn representations specifically suited to the ternary constraint. According to Microsoft Research (Ma et al., 2024), models trained this way match the performance of full-precision LLaMA at equivalent parameter counts from 1B parameters upward, while reducing matrix multiplication energy by 71.4x versus FP16.

### How do you implement BitNet inference in C?

BitNet inference in C requires four components: weight packing (encoding each ternary value as 2 bits and packing four values per byte, storing one float32 scale factor per matrix), activation quantization (converting float inputs to int8 using per-tensor absmax scaling), the ternary matmul kernel (iterating over packed bytes, unpacking weights, and accumulating additions/subtractions into int32 accumulators with no multiplications), and output dequantization (multiplying the int32 output by weight scale / activation scale to recover float values). The rest of the transformer forward pass (RMSNorm, RoPE, attention, SwiGLU) is unchanged from a standard float implementation.

### How much faster is BitNet than int8 quantization on CPU?

BitNet 1.58-bit models are approximately 4x faster than int8 and 8x faster than float16 for single-token autoregressive generation on CPU, primarily because of memory bandwidth reduction. A 7B equivalent BitNet model occupies 1.75 GB versus 7 GB for int8, so four times less data is moved from memory per token. Since CPU inference is memory-bandwidth-bound (arithmetic intensity is well below the CPU's roofline ridge point at any of these quantization levels), the throughput improvement is linear with storage reduction. On an Intel i7-12700, this translates to approximately 18–22 tok/s for BitNet versus 5–6 tok/s for int8 on equivalent model size.

### Can you convert an existing LLM to BitNet weights?

Not at full quality parity. BitNet weights must be learned during training, not applied after the fact. Post-training quantization of an existing float model to ternary values loses significant quality because the model's representations were optimized for continuous weight values. The Hugging Face 2024 paper demonstrated fine-tuning Llama 3 8B with BitNet weights using 10B tokens of additional training, which recovers most of the quality loss, but this is a substantial compute investment. For production deployment today, int8 and int4 post-training quantization methods (GPTQ, AWQ, GGUF) are more practical for existing model checkpoints. BitNet is the right choice for new models trained from scratch where the ternary constraint can be incorporated from the start.

BitNet represents a different training paradigm that produces efficient inference. The distinction matters for how you evaluate it.

If you have an existing model checkpoint you need to deploy efficiently, int8 and int4 post-training quantization is the right tool. The ecosystem is mature, the quality loss is measurable and documented, and the tools (llama.cpp, GPTQ, AWQ) are production-ready.

If you are training a new model specifically for edge deployment (on-device, battery-powered, or bandwidth-constrained), BitNet should be in your architecture evaluation. A 1.75 GB 7B-class model that runs at 20 tok/s on a consumer CPU changes what is deployable at the edge. This capability did not exist at this quality level two years ago.

This C implementation is a starting point, not a production kernel. The path to production performance is AVX2 vectorization of the ternary matmul inner loop, specifically using vpshufb for lookup-table-based decoding of packed bytes. This optimization layer separates a reference implementation from a fast one.
