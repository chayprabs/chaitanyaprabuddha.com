---
title: "Speculative Decoding: How Draft Models Make LLMs 2–3x Faster Without Changing Output"
description: "Speculative decoding achieves 2–3x LLM inference speedup by having a small draft model guess ahead and a large target model verify in parallel."
date: "2026-03-29"
tags: ["Edge Inference","speculative decoding LLM","speculative decoding implementation"]
readTime: "20 min read"
ogImage: "/og/speculative-decoding-llm-inference.png"
canonical: "https://chaitanyaprabuddha.com/blog/speculative-decoding-llm-inference"
published: true
---

Autoregressive LLM decoding has a fundamental throughput problem: every token requires a full forward pass through the model, sequentially. You cannot parallelize across tokens because each one depends on all previous tokens. The GPU sits 95% idle on a single-user request.

Speculative decoding breaks this constraint. A small, fast "draft" model guesses the next K tokens ahead. The large "target" model (the one you actually want output from) verifies all K guesses in a single forward pass (because verification is parallelizable even if generation is not). When the guesses are right, you get K tokens for the cost of roughly one target forward pass. When they are wrong, you recover gracefully with a guarantee that the output distribution is identical to running the target model alone.

The result: 2–3x throughput improvement with no change in output quality, no architecture modifications, and no fine-tuning. Chen et al. (2023) at Google DeepMind demonstrate that speculative sampling achieves 2.65x speedup on the HumanEval benchmark. Independent implementations using GPT-2 variants reproduce 2.23–2.46x speedups across different tasks.

The sections below cover the algorithm: the math behind why it works, why the output is provably identical to the target model, how to select a draft model, what happens when acceptance rates fall, and the variants (Medusa, EAGLE, self-speculative decoding) that push the speedup further. Python implementation code and analysis of when speculative decoding helps and when it does not appear throughout.

## The Core Problem: Sequential Token Generation

Standard autoregressive generation produces tokens one at a time. At each step, the model takes all previous tokens as input and produces a probability distribution over the vocabulary. One token is sampled. That token is appended to the input. The process repeats.

This is inherently sequential. You cannot start computing token i+1 until token i has been sampled, because token i+1 depends on what token i was. On a modern GPU with thousands of parallel compute units, this is catastrophically inefficient: the GPU spends most of each forward pass waiting, not computing, because the batch size is 1 (one sequence position).

> For large autoregressive models, memory bandwidth is the binding constraint during inference, not compute. The memory-to-compute ratio for single-token generation is roughly 100x lower than the hardware's peak efficiency point, leaving over 99% of available compute unused per generated token.

> Source: Chen et al., Google DeepMind, 2023

Batching multiple requests together improves hardware utilization but does not help latency for a single user. A user waiting for a response does not benefit from the server also processing 31 other requests simultaneously. Their wait time is unchanged.

Speculative decoding attacks the single-user latency problem directly by making the generation of multiple tokens parallelizable within a single request.

## The Speculative Decoding Algorithm

The algorithm, introduced by Leviathan et al. (2023) and Chen et al. (2023) independently, proceeds as follows:

**Step 1: Draft Phase**
Run the draft model autoregressively to generate K candidate tokens: x₁, x₂, ..., xₖ. Record the draft model's probability distribution at each step: q(xᵢ | x₁...xᵢ₋₁).

**Step 2: Verification Phase**
Run the target model on the original context concatenated with all K draft tokens in a single forward pass. This is parallelizable because the target model is not generating; it is computing the probability distribution at each position simultaneously. Record the target model's probabilities: p(xᵢ | x₁...xᵢ₋₁).

**Step 3: Acceptance/Rejection**
For each draft token xᵢ (in order from i=1 to K), accept it with probability:

```
P(accept xᵢ) = min(1, p(xᵢ) / q(xᵢ))
```

If accepted, move to the next draft token. If rejected at position i, discard tokens i through K, and sample a replacement from a corrected distribution:

```
p'(x) = normalize(max(0, p(x) - q(x)))
```

**Step 4: Bonus Token**
Whether or not all K tokens were accepted, the target model's distribution at position K+1 (computed during the verification forward pass) is already available. Sample one additional token from it for free.

The expected number of tokens produced per round is:

```
E[tokens] = (1 - αᴷ⁺¹) / (1 - α) where α = acceptance rate per token
```

For α = 0.8 and K = 4: E[tokens] = 3.36 tokens per round, versus 1 token for standard decoding.

## Why the Output Distribution Is Identical to the Target Model

The mathematical guarantee is non-obvious: speculative decoding produces samples with exactly the same distribution as sampling directly from the target model, regardless of what the draft model produces.

The proof relies on the acceptance criterion. When we accept token x with probability min(1, p(x)/q(x)):

- If p(x) ≥ q(x): we always accept (probability = 1). The draft over-proposed this token. Accepting unconditionally is fine because p ≥ q.
- If p(x) < q(x): we accept with probability p(x)/q(x). The draft over-proposed; we down-sample to match the target's lower probability.

When we reject (probability 1 - min(1, p(x)/q(x)) = max(0, 1 - p/q)):

We sample from the corrected distribution p'(x) = normalize(max(0, p(x) - q(x))). This is the portion of the target distribution not covered by the accepted draft tokens.

The accepted tokens form a distribution that matches p(x) for well-proposed tokens. The rejected path samples from the residual of p(x). Together they reconstruct p(x) exactly.

> This guarantee holds only for the exact sampling case. Temperature sampling, top-p, and top-k require modified acceptance criteria to maintain the distribution equivalence. The SpeculativeDecoding-Modified algorithm by Stern et al. handles these cases.

## The Speedup Formula and What It Predicts

The theoretical speedup relative to standard autoregressive decoding is:

```
Speedup = [α * (K+1)] / [1 + K * (t_draft / t_target)]
```

Where:
- α = per-token acceptance rate (0 to 1)
- K = number of draft tokens per round
- t_draft = time for one draft model forward pass
- t_target = time for one target model forward pass

For realistic parameters:

| Scenario | α | K | t_draft/t_target | Predicted Speedup |
| --- | --- | --- | --- | --- |
| Ideal case (high acceptance) | 0.9 | 5 | 0.05 | 4.8x |
| Typical production | 0.75 | 4 | 0.10 | 2.8x |
| Moderate acceptance | 0.65 | 3 | 0.15 | 1.9x |
| Low acceptance (bad task match) | 0.40 | 3 | 0.10 | 1.2x |
| Very low acceptance | 0.25 | 3 | 0.10 | 0.9x (worse!) |

Speculative decoding can be slower than standard decoding when acceptance rates fall below 30%. At that point, the cost of running the draft model and the overhead of the rejection logic exceeds the benefit of the occasional accepted token.

Acceptance rate is the dominant variable. It is determined by how well the draft model's distribution matches the target model's distribution for the specific input, which varies dramatically by task, by input content, and by the relative capability gap between draft and target models.

## Python Implementation

A clean reference implementation using HuggingFace Transformers:

```python
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForCausalLM

def speculative_decode(
    target_model,
    draft_model,
    input_ids: torch.Tensor,
    max_new_tokens: int = 100,
    K: int = 4,              # draft tokens per round
    temperature: float = 1.0,
) -> torch.Tensor:
    """
    Speculative decoding: use draft_model to propose K tokens,
    target_model to verify in one forward pass.
    Output distribution is identical to target_model alone.
    """
    generated = input_ids.clone()

    with torch.no_grad():
        while generated.shape[1] - input_ids.shape[1] < max_new_tokens:
            # === DRAFT PHASE: generate K candidate tokens ===
            draft_tokens = []
            draft_probs = []
            draft_input = generated.clone()

            for _ in range(K):
                draft_out = draft_model(draft_input)
                logits = draft_out.logits[:, -1, :] / temperature
                probs = F.softmax(logits, dim=-1)
                token = torch.multinomial(probs, num_samples=1)
                draft_tokens.append(token)
                draft_probs.append(probs[0, token[0, 0]].item())
                draft_input = torch.cat([draft_input, token], dim=-1)

            # === VERIFICATION PHASE: target model on all K tokens at once ===
            verify_input = torch.cat(
                [generated] + draft_tokens, dim=-1
            )
            target_out = target_model(verify_input)

            # Target probabilities at each draft position
            n_orig = generated.shape[1]
            accepted_count = 0

            for i, (draft_tok, draft_p) in enumerate(zip(draft_tokens, draft_probs)):
                pos = n_orig + i - 1  # position in verify_input
                target_logits = target_out.logits[:, pos, :] / temperature
                target_probs = F.softmax(target_logits, dim=-1)
                target_p = target_probs[0, draft_tok[0, 0]].item()

                # Accept with probability min(1, target_p / draft_p)
                accept_prob = min(1.0, target_p / (draft_p + 1e-10))
                if torch.rand(1).item() < accept_prob:
                    generated = torch.cat([generated, draft_tok], dim=-1)
                    accepted_count += 1
                else:
                    # Rejection: sample from corrected distribution
                    target_logits_pos = target_out.logits[:, pos, :] / temperature
                    target_p_full = F.softmax(target_logits_pos, dim=-1)
                    draft_p_full = F.softmax(
                        draft_model(generated).logits[:, -1, :] / temperature, dim=-1
                    )
                    corrected = F.relu(target_p_full - draft_p_full)
                    corrected = corrected / corrected.sum()
                    new_token = torch.multinomial(corrected, num_samples=1)
                    generated = torch.cat([generated, new_token.unsqueeze(0)], dim=-1)
                    break

            # Bonus token: target model's distribution at K+1 position is free
            if accepted_count == K:
                bonus_pos = n_orig + K - 1
                bonus_logits = target_out.logits[:, bonus_pos, :] / temperature
                bonus_probs = F.softmax(bonus_logits, dim=-1)
                bonus_token = torch.multinomial(bonus_probs, num_samples=1)
                generated = torch.cat([generated, bonus_token.unsqueeze(0)], dim=-1)

    return generated
```

This implementation is pedagogically clear but not optimized. Production implementations (vLLM, llama.cpp) batch the draft and verification steps and handle KV cache sharing between draft and target models to avoid redundant computation.

## Draft Model Selection: The Critical Decision

The draft model determines your acceptance rate, and acceptance rate determines your speedup. This is the most consequential engineering decision in a speculative decoding deployment.

**Criterion 1: Same family as the target model.** A draft model from the same training lineage as the target model has vocabulary alignment and distribution similarity. A Llama 3 1B draft with a Llama 3 70B target achieves much higher acceptance rates than a Mistral 7B draft with a Llama 3 70B target, even though both have similar benchmark scores.

**Criterion 2: t_draft / t_target ratio.** The draft model should be at least 5–10x faster than the target model. With a t_draft/t_target ratio above 0.3, the overhead of running the draft rarely pays off. Aim for a parameter count ratio of at least 10:1 (3B draft for 30B target, 7B draft for 70B target).

**Criterion 3: Task-specific acceptance rate testing.** Measure acceptance rate on your actual workload. Acceptance rates vary dramatically:

| Task Type | Typical Acceptance Rate | Speedup Realized |
| --- | --- | --- |
| Code completion (high predictability) | 0.80–0.90 | 3–5x |
| Text continuation/summarization | 0.70–0.80 | 2–3x |
| Creative writing | 0.55–0.70 | 1.5–2x |
| Complex reasoning / math | 0.40–0.60 | 1.2–1.8x |
| Highly constrained formats (JSON, XML) | 0.85–0.95 | 4–6x |

Code completion and constrained generation have high acceptance rates because the next token is often highly predictable. Creative writing and reasoning have lower rates because the distribution is flatter: many tokens are roughly equally likely.

**N-gram draft models**: For tasks where the next token frequently repeats patterns from the input (RAG, summarization), an n-gram model built from the input context can serve as a draft model with near-zero memory overhead and 10–100x faster inference than any neural model. This is called "prompt lookup decoding" and is available in HuggingFace Transformers.

```python
# Prompt lookup decoding: n-gram draft from the input context
# Zero additional model memory, 10-15% speedup for RAG workloads
from transformers import GenerationConfig

output = model.generate(
    **inputs,
    generation_config=GenerationConfig(
        prompt_lookup_num_tokens=10,   # n-gram size
        max_matching_ngram_size=3,     # max n-gram to look up
    )
)
```

## Acceptance Rates: What Determines Speedup in Practice

Acceptance rate is not a fixed property of a draft-target pair. It depends on three factors:

**1. Distribution gap between draft and target.** A stronger draft model generally has a higher acceptance rate against a given target. However, a draft model that is too close in capability to the target model reduces the t_draft/t_target advantage. The sweet spot is a draft model 10–20x smaller that was trained on the same data distribution.

**2. Input entropy.** High-entropy inputs (creative prompts, diverse topics) produce flatter distributions where many tokens are possible, making the draft model's specific prediction less likely to match. Low-entropy inputs (code completion, factual continuation) produce sharper distributions where the draft and target agree more often.

**3. Temperature.** At temperature T=0 (greedy decoding), acceptance rates are highest because both models make deterministic predictions and the acceptance threshold min(1, p/q) approaches a hard threshold. At temperature T=1 or higher, sampling randomness reduces agreement. If your application uses high-temperature creative sampling, expect 20–30% lower acceptance rates than at greedy decoding.

**How to measure and monitor acceptance rate in production:**

```python
class SpeculativeDecodingMonitor:
    def __init__(self):
        self.total_draft_tokens = 0
        self.total_accepted_tokens = 0
        self.rounds = 0

    def record_round(self, draft_tokens: int, accepted_tokens: int):
        self.total_draft_tokens += draft_tokens
        self.total_accepted_tokens += accepted_tokens
        self.rounds += 1

    @property
    def acceptance_rate(self) -> float:
        if self.total_draft_tokens == 0:
            return 0.0
        return self.total_accepted_tokens / self.total_draft_tokens

    @property
    def tokens_per_round(self) -> float:
        if self.rounds == 0:
            return 0.0
        return (self.total_accepted_tokens + self.rounds) / self.rounds  # +rounds for bonus tokens

    def should_disable_speculation(self) -> bool:
        # Disable if acceptance rate drops below the break-even point
        # Break-even: E[tokens_per_round] > 1 (i.e., better than standard decoding)
        return self.acceptance_rate < 0.30 and self.rounds > 100
```

## Variants: Medusa, EAGLE, and SelfSpeculative Decoding

Standard speculative decoding requires a separate draft model, which adds memory overhead and deployment complexity. Several variants eliminate or reduce this requirement.

**Medusa** (Cai et al., 2024): Adds multiple "Medusa heads" (additional prediction heads attached to the target model's final layer), each predicting tokens K steps ahead. Instead of running a separate draft model, you run one forward pass of the target model and get draft predictions from the extra heads simultaneously. Memory overhead is small (the Medusa heads are tiny compared to the full model). Speedup: 2.2–3.6x depending on configuration.

**EAGLE** (Li et al., 2024): Uses an autoregressive draft model that operates on the target model's hidden states rather than output tokens. The draft model has access to the target model's feature representations, achieving higher acceptance rates than token-level draft models of the same size. EAGLE achieves 3.05x speedup on MT-Bench with a draft model that adds only ~10% memory overhead.

**Self-speculative decoding** (Zhang et al., 2024): Uses the same model as both draft and target by skipping layers during the draft phase. The first K tokens are generated by running only the first N/2 layers (draft), then verified by running all N layers (target). No second model needed. Memory overhead: zero. Speedup: 1.3–1.8x, lower than dual-model approaches but free in terms of memory and deployment complexity.

| Variant | Additional Memory | Deployment Complexity | Typical Speedup | Best For |
| --- | --- | --- | --- | --- |
| Standard (separate draft) | ~10% of target | Two models to manage | 2–3x | Maximum speedup, resources available |
| Medusa | ~2–5% of target | One model with extra heads | 2.2–3.6x | Single-model deployment, fine-tuning OK |
| EAGLE | ~10% of target | Two models (feature-level) | 2.8–3.5x | Highest speedup per memory dollar |
| Self-speculative | 0% | One model, layer skipping | 1.3–1.8x | Memory-constrained, no extra model |
| Prompt lookup (n-gram) | 0% | Same as standard | 1.1–1.5x | RAG workloads, context retrieval tasks |

## Speculative Decoding on CPU

Speculative decoding has an underappreciated interaction with CPU inference that makes it disproportionately valuable on bandwidth-limited hardware.

Recall from roofline analysis: CPU inference is memory-bandwidth-bound. Each forward pass reads the full weight matrix from DRAM. For a 7B model at int8 (7 GB), one forward pass moves 7 GB of data. At 50 GB/s bandwidth, that is 140ms minimum per token.

With speculative decoding, the draft model's weight matrix is much smaller. A 100M-parameter draft model at int8 is 100 MB. At 50 GB/s, one draft forward pass takes approximately 2ms. Five draft tokens cost 10ms of draft passes + one 140ms target verification pass = 150ms for potentially 5 tokens.

**The critical optimization**: if the draft model is small enough to fit in L3 cache (~20 MB on high-end desktop CPUs), repeated draft forward passes become cache-warm. L3 bandwidth is 200–400 GB/s versus DRAM's 50 GB/s. The effective draft model throughput becomes 100–200 tokens/second, making K=8 or K=10 draft tokens practical.

> With a 50M-parameter draft model (quantized to int4, ~25 MB) fitting in L3 cache, speculative decoding against a 7B target achieves 2.8x throughput improvement on consumer CPUs, matching GPU-class speedups because the draft model's cache-warm inference costs near zero bandwidth.

> Source: EdgeLM inference benchmarks, 2025

The bandwidth bottleneck makes speculative decoding more valuable on CPU than on GPU, not less, provided the draft model is small enough to be cache-resident.

## When Speculative Decoding Helps and When It Does Not

**Speculative decoding helps most:**
- Code generation and completion (high acceptance rates from predictable syntax)
- RAG and summarization (prompt lookup decoding nearly free)
- JSON/structured output generation (constrained vocabulary = high acceptance)
- Deployments with consistent, high-volume workloads where draft model parameters can be tuned

**Speculative decoding helps little:**
- High-temperature creative generation (low acceptance rates)
- Very short outputs (overhead of draft setup not amortized)
- Tasks requiring careful reasoning (complex math, step-by-step proofs) where the distribution is flat and unpredictable

**Speculative decoding can hurt:**
- When acceptance rate falls below ~0.30 (overhead exceeds benefit)
- When memory is so constrained that loading a second model causes swapping
- When the draft model is from a different training family (poor distribution alignment)

The right deployment strategy: measure acceptance rate for your specific workload before committing to speculative decoding. If it is above 0.60, the speedup is substantial. Between 0.40 and 0.60, it provides modest benefit. Below 0.40, consider prompt lookup decoding (n-gram) or self-speculative decoding instead.

## Key Takeaways

- Speculative decoding achieves 2–3x LLM inference speedup by running a small draft model to propose K tokens ahead, then verifying all K in one parallelized target model forward pass. The output distribution is mathematically guaranteed identical to standard decoding.

- The acceptance criterion (accept draft token x with probability min(1, p_target(x)/p_draft(x))) is the key that makes distribution equivalence provable. Rejected tokens trigger sampling from a corrected distribution that recovers the target distribution exactly.

- Acceptance rate is the dominant variable. Above 0.75: strong speedup (3x+). Below 0.40: speculation may be slower than standard decoding. Code completion (0.80–0.90) and constrained generation benefit most; creative writing (0.55–0.70) benefits moderately.

- Draft model selection requires same-family training (for distribution alignment), a t_draft/t_target ratio below 0.15 (at least 7x faster), and task-specific acceptance rate testing before deployment.

- On CPU, speculative decoding is disproportionately valuable when the draft model fits in L3 cache. The cache-warm bandwidth of L3 (200–400 GB/s) versus DRAM (50 GB/s) makes draft inference nearly free, pushing real-world speedups to 2.5–3x even on consumer hardware.

- Variants eliminate the second model requirement: Medusa adds prediction heads (2.2–3.6x speedup), EAGLE uses feature-level drafting (2.8–3.5x), self-speculative skips layers for 1.3–1.8x with zero memory overhead.

## FAQ

### What is speculative decoding in LLMs?

Speculative decoding is an inference acceleration technique that uses a small, fast "draft" model to generate K candidate tokens ahead, then uses the target LLM to verify all K tokens in a single parallelized forward pass. Because verification is parallel but generation is sequential, this breaks the per-token sequential bottleneck of standard autoregressive decoding. Accepted tokens are appended to the output; rejected tokens are replaced with a correctly-sampled substitute. The output distribution is mathematically identical to running the target model alone, making speculative decoding a lossless speedup. Google DeepMind (2023) demonstrated 2.65x speedup on HumanEval benchmarks.

### How much faster does speculative decoding make LLM inference?

Speculative decoding achieves 2–3x throughput improvement in typical deployments, with up to 5x in optimal conditions. The speedup depends primarily on the per-token acceptance rate: how often the draft model's predictions match what the target model would have produced. Code completion achieves 3–5x speedup (acceptance rates 0.80–0.90). Text summarization achieves 2–3x (rates 0.70–0.80). Creative writing achieves 1.5–2x (rates 0.55–0.70). When acceptance rates fall below 0.30, speculative decoding can be slower than standard decoding due to overhead exceeding benefits.

### Does speculative decoding change the output of the LLM?

No. Speculative decoding is provably output-equivalent to standard autoregressive sampling from the target model. The acceptance criterion min(1, p_target/p_draft) ensures that accepted tokens match the target distribution. Rejected tokens are replaced by sampling from a corrected distribution that fills the gap between target and draft distributions. The mathematical proof, provided in both the Leviathan et al. and Chen et al. 2023 papers, shows that the marginal distribution of every generated token matches what would have been produced by the target model alone, regardless of what the draft model guessed.

### What is the best draft model for speculative decoding?

The best draft model for speculative decoding is the smallest model from the same training family as your target model that achieves an acceptable draft-to-target speed ratio. Same-family training provides vocabulary alignment and distribution similarity critical for high acceptance rates. The draft model should be at least 10x smaller than the target (e.g., 3B draft for 30B target) to achieve the t_draft/t_target ratio below 0.10 needed for strong speedups. For RAG and summarization workloads, n-gram prompt lookup decoding (which requires no additional model) achieves 1.1–1.5x speedup with zero memory overhead and is worth trying first.

### How does speculative decoding work on CPU?

Speculative decoding is particularly effective on CPU when the draft model fits in L3 cache. CPU inference is memory-bandwidth-bound: a 7B model at int8 requires reading 7 GB from DRAM per token (140ms at 50 GB/s). A 50M-parameter draft model at int4 occupies ~25 MB and fits in high-end desktop CPU L3 cache (~30-60 MB on AMD Threadripper, Intel Core Ultra). Cache-warm L3 bandwidth is 200–400 GB/s versus DRAM's 50 GB/s, making cache-resident draft inference approximately 4–8x faster than DRAM-bound inference. This produces real-world speculative decoding speedups of 2.5–3x on consumer CPUs, comparable to GPU-class gains despite the large compute disadvantage.

Speculative decoding is one of the cleanest optimization wins in LLM inference: provably lossless, broadly applicable, and increasingly well-supported in major inference frameworks. vLLM, llama.cpp, and HuggingFace Transformers all support it as a configuration option rather than requiring custom implementation.

The implementation decision that matters most is draft model selection. Spending time measuring acceptance rates on your specific workload (not on benchmarks) will tell you whether standard speculative decoding, a variant like EAGLE or Medusa, or prompt lookup decoding is the right approach.

For teams building CPU inference engines specifically, the interaction between speculative decoding and cache hierarchy deserves careful attention. A draft model that fits in L3 cache effectively removes its memory bandwidth cost almost entirely, making the speedup formula dramatically more favorable. On bandwidth-limited hardware, speculative decoding compounds with quantization in a way it does not on memory-rich GPU systems.

The next frontier is multi-step verification: verifying whether entire draft sequences are semantically acceptable, not individual draft tokens. Research on tree-based speculative decoding (SpecInfer, 2023) shows 2.82–3.77x speedup by exploring multiple draft branches simultaneously. The next generation of inference efficiency gains will come from there.
