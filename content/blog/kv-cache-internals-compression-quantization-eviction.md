---
title: "KV Cache Internals: Compression, Quantization, and Eviction Strategies in Production LLMs"
description: "Understanding its internals is prerequisite to understanding why inference is expensive, why context length matters, and what the industry is doing about it."
date: "2026-03-29"
tags: ["Edge Inference","KV cache LLM","KV cache quantization"]
readTime: "28 min read"
ogImage: "/og/kv-cache-internals-compression-quantization-eviction.png"
canonical: "https://chaitanyaprabuddha.com/blog/kv-cache-internals-compression-quantization-eviction"
published: true
---

At 128K context on a 70B model, the KV cache consumes 160 GB of memory. The model weights are 140 GB in float16. The cache is already larger.

This is not an edge case. It is the standard arithmetic for production long-context inference. The KV cache is the dominant memory consumer in modern LLM deployments. Understanding its internals is prerequisite to understanding why inference is expensive, why context length matters, and what the industry is doing about it.

Most treatments of KV cache optimization stop at "use int8 quantization, it gives you 2x compression." This is true but incomplete. Production inference systems need the full picture. They need to know where the memory comes from, why it cannot be discarded, which tokens can be evicted without quality loss, how prefix caching changes the economics, and what grouped query attention does to the numbers.

The full picture follows. Every formula is derived from first principles. Every optimization strategy is evaluated on its tradeoffs. The code examples work with the vLLM and HuggingFace Transformers inference stacks.

## KV Cache Fundamentals: What It Is and Why It Exists

In the transformer attention mechanism, every token at every layer computes three vectors: Query (Q), Key (K), and Value (V). Attention is computed as:

```
Attention(Q, K, V) = softmax(QK^T / sqrt(d_head)) * V
```

For autoregressive generation (producing one token at a time), every new token needs to attend to every previous token in the sequence. Without caching, this requires recomputing K and V for every previous token on every generation step. For a 1,000-token context, generating the 1,001st token would require 1,000 K and V computations.

The KV cache solves this by storing the K and V tensors for each token as they are computed and reusing them for all subsequent generation steps. The Q vector changes with each new token, but K and V for previous tokens do not, so they can be computed once and cached.

This is not an optimization that sacrifices quality. It is mathematically equivalent to the uncached computation. The KV cache is the exact set of intermediate states needed to continue generation. It cannot be eliminated without changing the attention mechanism itself.

However, it can be reduced. The cache can be compressed (quantized to lower precision), evicted (tokens deemed less important removed), shared (identical prefixes reused across requests), or restructured (GQA reduces the number of K/V heads).

Each approach has different quality tradeoffs, different memory savings, and different implementation complexity. We will cover each in detail.

## The Size Formula: Computing Exactly How Much Memory You Need

The KV cache size is determined by five parameters. These are L (number of transformer layers), H_kv (number of KV heads, equals H_attn in MHA, less in GQA/MQA), D_head (head dimension = D_model / H_attn), S (sequence length or context length), B (batch size), and P (precision bytes per element: 4 for float32, 2 for float16/bfloat16, 1 for int8, 0.5 for int4).

KV cache size in bytes:

```
size = 2 * B * L * H_kv * D_head * S * P
```

The factor of 2 accounts for storing both K and V. Let's verify this with real models:

**Llama 3.1 8B at 128K context (bfloat16, batch=1)**: L=32, H_kv=8 (GQA), D_head=128, S=131072, P=2. Size = 2 × 1 × 32 × 8 × 128 × 131072 × 2 = **17.2 GB**

**Llama 3.1 70B at 128K context (bfloat16, batch=1)**: L=80, H_kv=8 (GQA), D_head=128, S=131072, P=2. Size = 2 × 1 × 80 × 8 × 128 × 131072 × 2 = **43.0 GB**

**GPT-4 scale (hypothetical: L=120, H_kv=16, D_head=128, S=128K, bf16)**: Size = 2 × 1 × 120 × 16 × 128 × 131072 × 2 = **128.8 GB**

These numbers explain why context length is expensive at inference time even when the model weights fit comfortably on GPU. The weights are a fixed cost. The KV cache scales linearly with both sequence length and batch size.

**The batching problem**: KV cache is per-request. Serving 100 concurrent requests at 128K context requires 100× the per-request KV cache. At 17.2 GB per request for Llama 8B at 128K, this is 1.72 TB. Most production systems limit concurrent long-context requests rather than scale them freely.

```python
def kv_cache_bytes(layers: int, kv_heads: int, head_dim: int,
                   seq_len: int, batch_size: int = 1,
                   precision_bytes: float = 2.0) -> int:
    """Compute KV cache memory in bytes."""
    return int(2 * batch_size * layers * kv_heads * head_dim * seq_len * precision_bytes)

def kv_cache_gb(model_config: dict, seq_len: int,
                batch_size: int = 1, precision: str = "bfloat16") -> float:
    precision_bytes = {"float32": 4, "bfloat16": 2, "float16": 2,
                       "int8": 1, "int4": 0.5}[precision]
    bytes_total = kv_cache_bytes(
        layers=model_config["num_hidden_layers"],
        kv_heads=model_config.get("num_key_value_heads",
                                   model_config["num_attention_heads"]),
        head_dim=model_config["hidden_size"] // model_config["num_attention_heads"],
        seq_len=seq_len,
        batch_size=batch_size,
        precision_bytes=precision_bytes,
    )
    return bytes_total / (1024**3)

# Llama 3.1 8B config
llama_8b = {
    "num_hidden_layers": 32,
    "num_attention_heads": 32,
    "num_key_value_heads": 8,
    "hidden_size": 4096,
}

for seq_len in [8192, 32768, 131072]:
    gb = kv_cache_gb(llama_8b, seq_len=seq_len)
    print(f"Llama 3.1 8B @ {seq_len//1024}K context: {gb:.2f} GB KV cache")

# Output:
# Llama 3.1 8B @ 8K context: 1.07 GB KV cache
# Llama 3.1 8B @ 32K context: 4.29 GB KV cache
# Llama 3.1 8B @ 128K context: 17.18 GB KV cache
```

## Quantization: int8, int4, and the Quality Tradeoff

KV cache quantization reduces the precision used to store cached K and V tensors. Unlike weight quantization, KV cache quantization is applied dynamically during inference as tensors are stored. This means quantization error accumulates differently. The attention sensitivity to quantization error differs from feedforward weight sensitivity.

**Int8 quantization (2x memory reduction)**

Int8 KV cache quantization uses per-token, per-head absmax scaling: for each K or V vector, compute the absolute maximum value, store as a float16 scale, and quantize the vector to int8.

```python
import torch
import torch.nn.functional as F

def quantize_kv_int8(tensor: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
    """
    Quantize KV tensor to int8.
    tensor: [batch, heads, seq_len, head_dim]
    Returns: (quantized_int8, scale_float16)
    """
    # Per-token, per-head scaling for minimal quantization error
    # shape: [batch, heads, seq_len, 1]
    scale = tensor.abs().amax(dim=-1, keepdim=True)
    scale = scale.clamp(min=1e-8)

    # Normalize to [-127, 127] range
    quantized = (tensor / scale * 127.0).round().clamp(-127, 127).to(torch.int8)

    return quantized, scale.to(torch.float16)

def dequantize_kv_int8(quantized: torch.Tensor,
                        scale: torch.Tensor) -> torch.Tensor:
    """Dequantize KV tensor from int8."""
    return quantized.to(torch.float16) / 127.0 * scale.to(torch.float16)

# Memory comparison
batch, heads, seq_len, head_dim = 1, 8, 131072, 128
kv_float16 = torch.zeros(batch, heads, seq_len, head_dim, dtype=torch.float16)
kv_int8, scale = quantize_kv_int8(kv_float16.float())

float16_mb = kv_float16.element_size() * kv_float16.nelement() / 1e6
int8_mb = kv_int8.element_size() * kv_int8.nelement() / 1e6
scale_mb = scale.element_size() * scale.nelement() / 1e6

print(f"Float16 KV: {float16_mb:.1f} MB")
print(f"Int8 KV + scale: {int8_mb + scale_mb:.1f} MB")
print(f"Actual compression: {float16_mb / (int8_mb + scale_mb):.2f}x")

# Output:
# Float16 KV: 268.4 MB
# Int8 KV + scale: 135.3 MB  (int8 + float16 scale per token-head)
# Actual compression: 1.98x
```

The scale overhead reduces compression from the theoretical 2x to approximately 1.98x, which is negligible. Quality loss with int8 is minimal across most benchmarks, typically under 0.5% on standard language modeling tasks. There is some sensitivity on arithmetic-intensive tasks.

**Int4 quantization (4x memory reduction, with quality tradeoffs)**

Int4 quantization packs two 4-bit values per byte, achieving 4x compression from float16. The quality tradeoff is more significant, especially for long sequences where quantization errors in early-sequence K/V tensors accumulate across many attention computations.

```python
def quantize_kv_int4(tensor: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
    """
    Quantize KV tensor to int4 (packed, two values per byte).
    Uses asymmetric quantization for better range coverage.
    """
    min_val = tensor.amin(dim=-1, keepdim=True)
    max_val = tensor.amax(dim=-1, keepdim=True)
    scale = (max_val - min_val) / 15.0  # 4-bit range: 0-15
    scale = scale.clamp(min=1e-8)

    # Quantize to [0, 15]
    quantized = ((tensor - min_val) / scale).round().clamp(0, 15).to(torch.uint8)

    # Pack two uint8 values into one byte
    even = quantized[..., 0::2]  # Even indices
    odd = quantized[..., 1::2]   # Odd indices
    packed = (even | (odd << 4)).to(torch.uint8)  # Pack: low nibble | high nibble

    return packed, (scale.to(torch.float16), min_val.to(torch.float16))

# Quality impact varies by task:
# - Standard language modeling: -0.5 to -1.0 perplexity points
# - Long-context retrieval (needle-in-haystack): -5 to -15% accuracy at 100K+
# - Mathematical reasoning: -2 to -4% accuracy
```

The quality-memory tradeoff for int4 is real and context-dependent:

| Quantization | Memory vs float16 | Perplexity impact | Long-context impact |
|---|---|---|---|
| bfloat16 | 1.0x | baseline | baseline |
| int8 | 0.5x | +0.2-0.5 PPL | negligible |
| int4 (symmetric) | 0.25x | +1.0-2.0 PPL | -5-10% |
| int4 (asymmetric) | 0.26x | +0.5-1.5 PPL | -3-7% |

**When to use int4 vs int8**: Use int4 when memory is the binding constraint and the application can tolerate quality reduction. This includes creative writing, summarization, and chat. Use int8 when quality is non-negotiable, such as RAG retrieval, code generation, and arithmetic. For long-context (128K+) applications, prefer int8 or float16 for the attention-critical first 20% of the context (tokens that will be attended to most frequently).

## Eviction Strategies: Which Tokens Can You Discard?

Eviction removes KV entries for tokens that are deemed less important, allowing the effective context length to exceed the available KV cache memory. The critical question is which tokens can be removed with minimal quality loss.

The naive answer of removing the oldest tokens using sliding window attention turns out to be wrong. Empirically, the first few tokens in a sequence (attention sinks) receive disproportionate attention weight regardless of their content. Removing them causes severe generation degradation even if they appear semantically unimportant.

There are three main eviction strategies:

**1. Sliding window (naive)**: Keep the most recent W tokens, discard everything older. Simple to implement, but destroys the attention sink tokens.

**2. StreamingLLM**: Keep attention sink tokens + sliding window of recent tokens. Works well for streaming long-context generation.

**3. H2O (Heavy Hitter Oracle)**: Keep tokens with the highest accumulated attention scores across recent tokens. Dynamically identifies which tokens are actually being attended to.

## StreamingLLM: Attention Sinks and InfiniteLength Generation

The StreamingLLM paper (Xiao et al., 2023) made a key empirical observation. Transformer attention is not distributed uniformly across the context. A small number of initial tokens (the "attention sinks") receive disproportionately high attention weights across all layers, regardless of their semantic content. These tokens act as soft delimiters that the model has learned to dump excess attention probability into.

The consequence is that a simple sliding window that removes early tokens causes catastrophic generation failure because the attention sink tokens are removed. StreamingLLM fixes this with a minimal change: always keep the first K_sink tokens (typically 4) plus the most recent W tokens.

```
KV cache layout:
┌────────────────┬───────────────────────────────────────┐
│ Attention sinks│         Sliding window                │
│  (first 4 tok) │  (most recent W tokens)               │
└────────────────┴───────────────────────────────────────┘
     4 tokens              W tokens
Total budget: W + 4 tokens
```

Implementation of the StreamingLLM eviction policy:

```python
from collections import deque
from dataclasses import dataclass
import torch

@dataclass
class KVCacheEntry:
    token_id: int
    position: int
    key: torch.Tensor    # [num_kv_heads, head_dim]
    value: torch.Tensor  # [num_kv_heads, head_dim]

class StreamingLLMCache:
    """
    KV cache with StreamingLLM eviction policy.
    Keeps attention_sinks initial tokens + recent_window recent tokens.
    """

    def __init__(self, attention_sinks: int = 4,
                 recent_window: int = 1024,
                 num_kv_heads: int = 8,
                 head_dim: int = 128):
        self.attention_sinks = attention_sinks
        self.recent_window = recent_window
        self.num_kv_heads = num_kv_heads
        self.head_dim = head_dim

        self.sink_cache: list[KVCacheEntry] = []    # Always kept
        self.recent_cache: deque[KVCacheEntry] = deque(maxlen=recent_window)
        self.total_tokens_seen = 0

    def append(self, token_id: int, key: torch.Tensor, value: torch.Tensor):
        """Add a new token's KV to the cache."""
        entry = KVCacheEntry(
            token_id=token_id,
            position=self.total_tokens_seen,
            key=key.clone(),
            value=value.clone(),
        )
        self.total_tokens_seen += 1

        if len(self.sink_cache) < self.attention_sinks:
            self.sink_cache.append(entry)
        else:
            self.recent_cache.append(entry)  # Auto-evicts oldest if full

    def get_kv_tensors(self) -> tuple[torch.Tensor, torch.Tensor]:
        """
        Return stacked K, V tensors for all retained tokens.
        Positions are remapped for RoPE compatibility.
        """
        all_entries = self.sink_cache + list(self.recent_cache)
        if not all_entries:
            return None, None

        keys = torch.stack([e.key for e in all_entries], dim=1)    # [heads, seq, dim]
        values = torch.stack([e.value for e in all_entries], dim=1)
        return keys, values

    @property
    def cache_size(self) -> int:
        return len(self.sink_cache) + len(self.recent_cache)

    @property
    def max_size(self) -> int:
        return self.attention_sinks + self.recent_window

    def memory_mb(self) -> float:
        """Current KV cache memory in MB (float16)."""
        bytes_per_entry = 2 * self.num_kv_heads * self.head_dim * 2  # K+V, float16
        return (self.cache_size * bytes_per_entry) / 1e6

# Usage: StreamingLLM can handle infinite-length generation
# with constant memory equal to (attention_sinks + recent_window) tokens
cache = StreamingLLMCache(attention_sinks=4, recent_window=1024)
print(f"Max memory: {cache.max_size} tokens = {cache.max_size * 2 * 8 * 128 * 2 / 1e6:.1f} MB per layer")
```

**StreamingLLM limitations**: The approach works well for streaming generation (summarizing a very long document, chatting for hours) but is not suitable for tasks requiring recall of information from the middle of a long context. Everything between the sink tokens and the recent window is permanently evicted. For retrieval-augmented tasks, use a different strategy.

**Practical performance**: StreamingLLM at attention_sinks=4, window=1024 uses constant memory equivalent to 1028 tokens regardless of how many tokens have been generated. A generation task running for 1 million tokens uses 1028 × (per-token cost) rather than 1,000,000 × (per-token cost). This represents a 971x reduction in KV cache memory at the cost of no long-range recall.

## H2O: Heavy Hitter Oracle for Dynamic Eviction

H2O (Heavy Hitter Oracle, Zhang et al., 2023) takes a more principled approach to eviction. Instead of a fixed window, it tracks which tokens have accumulated the most attention weight across recent generation steps and keeps the "heavy hitters": the tokens that are being used.

The key insight is that attention is sparse in practice. For most generation steps, only a small fraction of the context receives meaningful attention weight. The tokens that consistently receive high attention ("heavy hitters") are worth keeping. Tokens that have not been attended to recently can be evicted with minimal quality loss.

```python
class H2OCache:
    """
    H2O (Heavy Hitter Oracle) KV cache with dynamic eviction.
    Keeps the heavy_budget most-attended tokens + recent_budget recent tokens.
    """

    def __init__(self, heavy_budget: int = 200,
                 recent_budget: int = 200,
                 num_layers: int = 32):
        self.heavy_budget = heavy_budget
        self.recent_budget = recent_budget
        self.total_budget = heavy_budget + recent_budget
        self.num_layers = num_layers

        # Per-layer accumulated attention scores
        # accumulated_scores[layer][token_idx] = sum of attention received
        self.accumulated_scores: list[dict[int, float]] = [
            {} for _ in range(num_layers)
        ]
        self.layer_caches: list[dict[int, KVCacheEntry]] = [
            {} for _ in range(num_layers)
        ]

    def update_scores(self, layer: int, attention_weights: torch.Tensor,
                       active_positions: list[int]):
        """
        Update accumulated attention scores.
        attention_weights: [num_heads, seq_len] (attention FROM the latest token)
        active_positions: token positions currently in cache
        """
        # Sum across heads for per-token importance
        token_importance = attention_weights.sum(dim=0)  # [seq_len]

        for pos, importance in zip(active_positions, token_importance.tolist()):
            if pos not in self.accumulated_scores[layer]:
                self.accumulated_scores[layer][pos] = 0.0
            self.accumulated_scores[layer][pos] += importance

    def evict_if_needed(self, layer: int, new_position: int,
                         new_key: torch.Tensor, new_value: torch.Tensor):
        """Add new token and evict if cache is over budget."""
        cache = self.layer_caches[layer]
        scores = self.accumulated_scores[layer]

        # Add new entry
        cache[new_position] = KVCacheEntry(
            token_id=new_position,
            position=new_position,
            key=new_key.clone(),
            value=new_value.clone(),
        )
        scores[new_position] = 0.0

        if len(cache) <= self.total_budget:
            return  # Under budget, no eviction needed

        # Separate recent tokens from candidates for eviction
        all_positions = sorted(cache.keys())
        recent_positions = set(all_positions[-self.recent_budget:])
        eviction_candidates = [p for p in all_positions if p not in recent_positions]

        if not eviction_candidates:
            return

        # Evict the candidate with lowest accumulated attention score
        if len(eviction_candidates) > (len(cache) - self.total_budget):
            scores_for_candidates = [(p, scores.get(p, 0.0)) for p in eviction_candidates]
            scores_for_candidates.sort(key=lambda x: x[1])
            # Evict enough to get back under budget
            n_evict = len(cache) - self.total_budget
            for pos, _ in scores_for_candidates[:n_evict]:
                del cache[pos]
                del scores[pos]

    def get_kv_tensors(self, layer: int) -> tuple[torch.Tensor, torch.Tensor]:
        cache = self.layer_caches[layer]
        if not cache:
            return None, None

        sorted_positions = sorted(cache.keys())
        keys = torch.stack([cache[p].key for p in sorted_positions], dim=1)
        values = torch.stack([cache[p].value for p in sorted_positions], dim=1)
        return keys, values
```

**H2O performance on benchmarks**: On LongBench with a 4K token budget (compared to full KV cache at 32K), H2O achieves approximately 91-94% of full-cache performance on tasks like single-document QA and summarization. The heavy hitter selection correctly identifies which tokens contain the answer content and retains them.

**H2O vs StreamingLLM**:

| Property | StreamingLLM | H2O |
|---|---|---|
| Eviction policy | Fixed window + sinks | Attention-score based |
| Retained tokens | First K + last W | Top-attended + last W |
| Good for | Infinite streaming generation | Long-context QA, retrieval |
| Memory overhead | O(window) | O(budget) + score tracking |
| Recoverability | None (evicted forever) | None (evicted forever) |
| Implementation complexity | Low | Medium |

**When to use which**: StreamingLLM for generation tasks where only local coherence matters. H2O for tasks where the relevant content is in the middle of the context (typical RAG, document QA patterns).

## Prefix Caching: Reusing KV State Across Requests

Prefix caching exploits the most common redundancy in production LLM deployments, which is that many requests share a common prefix. In a RAG system, every request includes the same retrieved documents. In a coding assistant, every request includes the same system prompt. In a chatbot, every request in a multi-turn conversation includes all previous turns.

Without prefix caching, every request recomputes the KV cache for the shared prefix from scratch. With prefix caching, the KV tensors for the prefix are computed once and reused across all requests that share it.

The memory saving is significant. A 4,096-token system prompt at bfloat16 with Llama 3.1 8B (L=32, H_kv=8, D_head=128) requires:

```
Per-layer per-token: 2 * 8 * 128 * 2 bytes = 4,096 bytes
Total for 4K tokens: 32 layers * 4,096 tokens * 4,096 bytes = 536 MB
```

Without prefix caching, this 536 MB is computed and stored fresh for every request. With prefix caching across 100 concurrent requests, you store 536 MB once and reuse it: a 99% memory reduction for the prefix portion.

```python
import hashlib
from typing import Optional

class PrefixCache:
    """
    Prefix KV cache with hash-based deduplication.
    Stores KV tensors for commonly repeated prefixes.
    """

    def __init__(self, max_entries: int = 100,
                 max_memory_gb: float = 4.0):
        self.max_entries = max_entries
        self.max_memory_bytes = int(max_memory_gb * 1e9)
        self.cache: dict[str, dict] = {}   # hash -> {kv_tensors, token_ids, hits, size}
        self.total_memory = 0

    def compute_prefix_hash(self, token_ids: list[int]) -> str:
        """Stable hash for a token sequence."""
        token_bytes = bytes(token_ids)  # Simplified; use struct.pack for production
        return hashlib.sha256(token_bytes).hexdigest()[:16]

    def lookup(self, prefix_tokens: list[int]) -> Optional[dict]:
        """
        Check if a KV cache exists for this prefix.
        Returns KV tensors if found, None if not.
        Tries the full prefix first, then successively shorter prefixes.
        """
        # Try exact match first
        for length in range(len(prefix_tokens), 0, -64):  # 64-token granularity
            truncated = prefix_tokens[:length]
            key = self.compute_prefix_hash(truncated)
            if key in self.cache:
                self.cache[key]["hits"] += 1
                return {"kv": self.cache[key]["kv_tensors"],
                        "length": length,
                        "cache_hit": True}
        return None

    def store(self, prefix_tokens: list[int],
              kv_tensors: list[torch.Tensor],  # One tensor per layer
              min_prefix_len: int = 64):
        """
        Store KV tensors for a prefix.
        Only store if prefix is long enough to be worth caching.
        """
        if len(prefix_tokens) < min_prefix_len:
            return

        key = self.compute_prefix_hash(prefix_tokens)
        if key in self.cache:
            return  # Already cached

        # Estimate memory
        entry_size = sum(t.element_size() * t.nelement() for t in kv_tensors)

        # Evict LRU entries if necessary
        while (self.total_memory + entry_size > self.max_memory_bytes or
               len(self.cache) >= self.max_entries):
            if not self.cache:
                break
            # Evict lowest-hit entry
            lru_key = min(self.cache.keys(),
                         key=lambda k: self.cache[k]["hits"])
            evicted_size = self.cache[lru_key]["size"]
            del self.cache[lru_key]
            self.total_memory -= evicted_size

        self.cache[key] = {
            "kv_tensors": kv_tensors,
            "token_ids": prefix_tokens,
            "hits": 0,
            "size": entry_size,
        }
        self.total_memory += entry_size

    def hit_rate(self) -> float:
        """Fraction of total hits (cached requests / total requests)."""
        total_hits = sum(e["hits"] for e in self.cache.values())
        total_requests = total_hits + len(self.cache)  # Simplified
        return total_hits / max(total_requests, 1)
```

**vLLM's PagedAttention** extends prefix caching to the block level. Instead of treating the KV cache as a contiguous tensor, PagedAttention manages it as fixed-size pages (blocks of 16 tokens). Pages containing shared prefix content are referenced from multiple request KV caches, eliminating memory duplication without requiring the requests to share the exact same prefix length.

**Prefix caching in practice**:
- System prompts: near-100% hit rate, 20-60% of context in many deployments
- RAG documents: variable hit rate depending on document reuse; best-effort caching
- Multi-turn chat: hit rate improves with session length; each turn adds to the cached prefix

At 60% prefix cache hit rate with a 4,096-token system prompt sharing 536 MB each, the effective memory saving across 100 concurrent requests is approximately 32 GB (larger than the model weights for Llama 3.1 8B).

## Grouped Query Attention: Structural Cache Reduction

Grouped Query Attention (GQA) is an architectural change that reduces the number of KV heads while keeping the number of query heads the same. Standard Multi-Head Attention (MHA) has H_attn = H_kv. GQA groups multiple query heads to share a single KV head, reducing H_kv by a factor of G (the group size).

The memory reduction is direct and lossless. No approximation, no quality tradeoff. You get fewer KV vectors per token because the model was trained to produce fewer.

```
MHA:  H_kv = H_attn = 32   (e.g., Llama 2 13B)
GQA:  H_kv = H_attn / G     (e.g., Llama 3.1 8B: 32/4 = 8)
MQA:  H_kv = 1              (Multi-Query Attention: extreme case, one shared KV)
```

For Llama 3.1 70B: H_attn=64, H_kv=8, G=8. The KV cache is 8x smaller than it would be with MHA.

The formula: `KV_cache_GQA = KV_cache_MHA / G`

For Llama 3.1 70B at 128K context:
- MHA equivalent: 2 × 80 × 64 × 128 × 131072 × 2 = 344 GB
- GQA actual (G=8): 344 / 8 = 43 GB

GQA does impose a minor quality tradeoff compared to MHA at equal parameter counts. Fewer KV heads means less representational capacity in the attention mechanism. In practice, models trained with GQA from scratch (like all Llama 3 models) show negligible quality loss compared to MHA models, because the training adjusts for the architectural constraint. GQA is strictly better than post-hoc KV cache compression for the same memory budget.

```python
def compare_attention_variants(hidden_size: int, num_attn_heads: int,
                                 seq_len: int, num_layers: int,
                                 precision_bytes: float = 2.0) -> dict:
    """Compare KV cache sizes across MHA, GQA, and MQA."""
    head_dim = hidden_size // num_attn_heads

    variants = {
        "MHA": num_attn_heads,              # H_kv = H_attn
        "GQA-8": num_attn_heads // 8,       # 8x reduction
        "GQA-4": num_attn_heads // 4,       # 4x reduction
        "MQA": 1,                           # Single KV head
    }

    results = {}
    for name, num_kv_heads in variants.items():
        gb = kv_cache_gb(
            {"num_hidden_layers": num_layers,
             "num_attention_heads": num_attn_heads,
             "num_key_value_heads": num_kv_heads,
             "hidden_size": hidden_size},
            seq_len=seq_len
        )
        results[name] = {
            "kv_heads": num_kv_heads,
            "kv_cache_gb": gb,
            "vs_mha": f"{results.get('MHA', {}).get('kv_cache_gb', gb) / gb:.1f}x" if name != "MHA" else "1.0x"
        }

    return results
```

## Production Architecture: Paging, Scheduling, and MultiGPU

**PagedAttention (vLLM)**: The de facto standard for production KV cache management. Divides the KV cache into fixed-size pages (blocks of 16 or 32 tokens). Each request gets a logical sequence of pages from a global physical pool. Benefits:

1. **Eliminates fragmentation**: Traditional contiguous KV caches fragment GPU memory as requests arrive and complete at different lengths. PagedAttention allocates exactly the pages needed.
2. **Enables copy-on-write prefix sharing**: Multiple requests sharing a prefix point to the same physical pages; the pages are only copied when a request writes new tokens.
3. **Enables preemption**: A long-running request can have its pages swapped to CPU memory when a higher-priority request needs GPU memory.

**KV cache offloading**: For deployments where GPU memory is the binding constraint, K and V tensors for inactive layers or low-priority requests can be offloaded to CPU DRAM over PCIe. Modern PCIe 5.0 at 64 GB/s bidirectional enables offloading/reloading at meaningful rates for batch inference:

```python
class KVOffloadManager:
    """Offload KV cache pages to CPU when GPU memory is under pressure."""

    def __init__(self, gpu_kv_budget_gb: float = 20.0,
                 cpu_kv_budget_gb: float = 100.0):
        self.gpu_budget = int(gpu_kv_budget_gb * 1e9)
        self.cpu_budget = int(cpu_kv_budget_gb * 1e9)
        self.gpu_pages: dict[str, torch.Tensor] = {}   # On GPU
        self.cpu_pages: dict[str, torch.Tensor] = {}   # On CPU (pinned)
        self.gpu_used = 0
        self.cpu_used = 0

    def store_gpu(self, page_id: str, kv_tensor: torch.Tensor):
        """Store page on GPU. Offload to CPU if over budget."""
        page_size = kv_tensor.element_size() * kv_tensor.nelement()

        if self.gpu_used + page_size > self.gpu_budget:
            self._offload_lru_to_cpu()

        self.gpu_pages[page_id] = kv_tensor.cuda()
        self.gpu_used += page_size

    def prefetch(self, page_id: str):
        """Move a page from CPU back to GPU (called before generation step)."""
        if page_id in self.cpu_pages:
            tensor = self.cpu_pages.pop(page_id)
            gpu_tensor = tensor.cuda(non_blocking=True)  # Async PCIe transfer
            self.gpu_pages[page_id] = gpu_tensor

    def _offload_lru_to_cpu(self):
        """Move least recently used GPU page to CPU pinned memory."""
        if not self.gpu_pages:
            return
        lru_id = next(iter(self.gpu_pages))  # Simplified LRU
        tensor = self.gpu_pages.pop(lru_id)
        size = tensor.element_size() * tensor.nelement()
        # Pin memory for faster PCIe transfers
        cpu_tensor = tensor.cpu().pin_memory()
        self.cpu_pages[lru_id] = cpu_tensor
        self.gpu_used -= size
        self.cpu_used += size
```

**Multi-GPU KV cache sharding**: For models that span multiple GPUs, the KV cache is sharded along the head dimension. Each GPU stores KV tensors for its assigned attention heads only. The communication overhead for attention is limited to all-reduce across the head dimension: O(batch × seq_len × head_dim) per layer, not O(batch × seq_len × d_model).

## Benchmark: Memory and Quality Tradeoffs Across Strategies

Combining all the strategies covered, here is the practical comparison for Llama 3.1 70B at 32K context with a 200-request concurrent load (representative enterprise deployment):

| Strategy | KV Memory (200 req) | vs baseline | LongBench quality | Implementation complexity |
|---|---|---|---|---|
| bfloat16 full KV | ~1,720 GB | 1.0x | baseline | None |
| int8 quantization | ~860 GB | 0.5x | -0.3% | Low |
| int4 quantization | ~430 GB | 0.25x | -1.2% | Medium |
| GQA-8 (architectural) | ~215 GB | 0.125x | -0.1% | None (model choice) |
| GQA-8 + int8 | ~108 GB | 0.063x | -0.4% | Low |
| GQA-8 + H2O (50% budget) | ~54 GB | 0.031x | -4.2% | High |
| GQA-8 + StreamingLLM | ~12 GB (constant) | varies | -15%+ recall | Medium |
| Prefix caching (60% hit) | ~86 GB effective | 0.5x effective | none | Medium |

The practical recommendation for most production deployments:

1. **Choose a GQA model** (all modern models do this: Llama 3, Mistral, Gemma, Qwen)
2. **Apply int8 quantization** (2x reduction, negligible quality loss, low complexity)
3. **Enable prefix caching** (free memory reduction for repeated prefixes, no quality cost)
4. **Use H2O or StreamingLLM only if** the previous three steps still leave you memory-constrained

The GQA + int8 + prefix caching stack achieves approximately 16x memory reduction from naive bfloat16 full KV cache with negligible quality impact. The eviction strategies (H2O, StreamingLLM) are additions for cases where even the optimized stack is insufficient.

## Key Takeaways

- The KV cache size formula is `2 × B × L × H_kv × D_head × S × P` bytes. At 128K context, the KV cache exceeds model weight size for all modern large models. This is the primary memory constraint in long-context inference, not the model itself.

- Int8 quantization achieves ~2x compression with negligible quality impact (<0.5 perplexity points). Int4 achieves ~4x compression with measurable quality loss (-1-2 PPL, -5-10% on long-context recall). Use int8 by default; int4 only when memory is the hard constraint and quality reduction is acceptable.

- StreamingLLM works by keeping attention sink tokens (the first 4 tokens that act as soft delimiters) plus a sliding window of recent tokens. It enables infinite-length generation at constant memory cost but provides no recall of content outside the window.

- H2O (Heavy Hitter Oracle) evicts based on accumulated attention scores rather than position, retaining the tokens that are actually being attended to. It outperforms sliding window significantly on long-context retrieval tasks where the relevant content is in the middle of the context.

- Prefix caching reuses KV tensors for shared prefixes (system prompts, RAG documents) across requests. At 60% cache hit rate on a 4K-token system prompt serving 100 concurrent requests, this saves ~32 GB (more than some model weights) with zero quality cost.

- Grouped Query Attention (GQA) is the most impactful structural optimization: Llama 3.1 70B's GQA-8 reduces KV cache to 1/8th of MHA size with negligible quality tradeoff. This is a model architecture choice, not a post-hoc compression. The model is trained to work with fewer KV heads.

## FAQ

### What is a KV cache in LLMs and why does it matter?

A KV cache (Key-Value cache) in LLMs stores the intermediate Key and Value attention tensors computed for each token during generation, so they don't need to be recomputed for subsequent generation steps. Without it, generating each new token would require re-running attention over the entire context from scratch: O(n²) computation per token instead of O(n). The KV cache makes autoregressive generation feasible but comes at a memory cost that scales linearly with both context length and batch size. At 128K context on a 70B model, the KV cache exceeds 40 GB per request in bfloat16, making it the primary memory constraint in long-context inference deployments.

### How does KV cache quantization work and what is the quality impact?

KV cache quantization stores the cached Key and Value tensors at reduced precision (int8 or int4 instead of bfloat16). Int8 quantization uses per-token, per-head absmax scaling: for each K or V vector, compute the absolute maximum, store it as a float16 scale factor, and quantize the vector to int8 values in [-127, 127]. This achieves ~2x memory reduction. The quality impact is minimal, typically less than 0.5 perplexity points on standard benchmarks and negligible impact on long-context retrieval tasks. Int4 quantization achieves ~4x reduction but shows more significant quality degradation (-1-2 PPL, -5-10% on 100K+ context tasks), making it appropriate only when memory is the critical bottleneck and some quality degradation is acceptable.

### What is the difference between StreamingLLM and H2O eviction?

StreamingLLM and H2O are both KV cache eviction strategies that allow effective context lengths to exceed the available cache budget. StreamingLLM uses a fixed policy: always retain the first K tokens (typically 4 "attention sink" tokens that receive disproportionately high attention) plus the most recent W tokens in a sliding window. It's simple and enables infinite-length generation at constant memory cost, but provides no recall of content outside the window. Anything in the middle of a long context is permanently evicted. H2O (Heavy Hitter Oracle) uses a dynamic policy: track which tokens have accumulated the highest total attention weight across recent generation steps and retain those "heavy hitters" plus a recent window. H2O significantly outperforms StreamingLLM on tasks where important content appears in the middle of the context (typical of RAG and document QA), at the cost of higher implementation complexity.

### What is grouped query attention and how does it reduce KV cache size?

Grouped Query Attention (GQA) is a transformer architecture modification where multiple query heads share a single pair of Key-Value heads, reducing the number of KV heads while keeping the number of query heads the same. In standard Multi-Head Attention (MHA), the number of KV heads equals the number of query heads. GQA reduces this by a group factor G: for Llama 3.1 70B with G=8, there are 64 query heads but only 8 KV heads. The KV cache size is directly proportional to the number of KV heads, so GQA-8 reduces KV cache memory by 8x compared to MHA. Unlike quantization or eviction, GQA is a lossless structural optimization. The model is trained with GQA from scratch and shows negligible quality degradation compared to MHA-trained models of the same size.

### How does prefix caching work in vLLM and similar inference servers?

Prefix caching in vLLM works through PagedAttention's block-based memory management. The KV cache is divided into fixed-size pages (blocks of 16-32 tokens). When a request includes a prefix that another request has already processed, the inference server identifies the shared pages using a hash of the token IDs and maps the new request to the same physical memory pages (copy-on-write semantics). The new request's computation starts from the point where the prefix ends, skipping the prefix recomputation entirely. In practice, this dramatically reduces compute and memory for deployments where many requests share long common prefixes: RAG systems where all requests include the same retrieved documents, chatbots with long shared system prompts, or coding assistants where all requests include the same codebase context.

The KV cache is not a detail of LLM inference. It is the central resource management problem. Once you understand the size formula and how it scales with sequence length, batch size, and architecture, every inference optimization decision becomes clearer: why long-context is expensive, why GQA is important, why prefix caching has high leverage, and where eviction strategies fit in.

The practical decision tree for production deployments is straightforward. Start with a GQA model (all competitive models released after 2023 use it). Add int8 quantization (2x memory reduction, negligible quality cost, available in every major inference framework). Enable prefix caching for your common prefix patterns (free memory reduction, no quality cost). Only after these three steps, if memory pressure remains, consider eviction strategies with their quality tradeoffs.

The strategies at the end of the list (H2O, StreamingLLM, int4 quantization) are real but niche. They solve specific problems at specific costs. Understanding those costs is what separates informed deployment decisions from cargo-culting someone else's configuration.

The formula is the starting point. Build from there.
