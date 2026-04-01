---
title: "Advanced RAG: Contextual Retrieval, Late Chunking, and Hybrid Search Beyond Naive Splitting"
description: "The complete stack delivers a production RAG system that outperforms naive implementations on retrieval recall, answer accuracy, and end-to-end pipeline cost."
date: "2026-03-29"
tags: ["Dev Tools","advanced RAG techniques","contextual retrieval RAG"]
readTime: "22 min read"
ogImage: "/og/advanced-rag-contextual-retrieval-late-chunking.png"
canonical: "https://chaitanyaprabuddha.com/blog/advanced-rag-contextual-retrieval-late-chunking"
published: true
---

Naive RAG is the version where you split a document every 512 tokens with 50-token overlap, embed the chunks, and retrieve the top-K by cosine similarity. It works well enough to demo. In production, it fails in predictable ways: chunks that reference "it" without context for what "it" is, relevant passages missed because they share no semantic overlap with the query, exact terminology queries returning semantically similar but lexically different results.

The retrieval failure rate for naive chunking (the percentage of queries where the correct chunk is not in the top-20 retrieved) is approximately 5-7% on standard benchmarks. That sounds small. In production at 10,000 queries per day, that's 500-700 failures per day where the model answers without the relevant context, often confidently and wrongly.

The new generation of retrieval techniques has meaningfully reduced this failure rate. Anthropic's contextual retrieval reduces top-20 retrieval failures by 67% through a simple technique: generating a brief chunk-specific context using a language model before embedding. Late chunking from Jina AI preserves document-level context in chunk embeddings by processing the full document before chunking. Hybrid BM25+vector search captures exact terminology matches that semantic embeddings miss. ColBERT-style late interaction provides token-level matching at reduced cost.

Each technique gets full technical treatment: why naive chunking fails, the mechanism behind each improvement, implementation in Python, and when to use each approach or combine them. The complete stack delivers a production RAG system that outperforms naive implementations on retrieval recall, answer accuracy, and end-to-end pipeline cost.

## Why Naive Chunking Fails: The Three Failure Modes

**Failure mode 1: Context loss at chunk boundaries**

A document states: "The transformer architecture introduced three key components. These are query, key, and value projections." When split at 512 tokens, the second sentence may land in a different chunk than the first. A query for "query key value projections" retrieves the second chunk, which says "These are query, key, and value projections", but the chunk doesn't explain what these components belong to.

The chunk is syntactically valid, semantically incomplete. The embedding captures "query key value projections" but not the transformer context. Users get an answer about QKV projections that mysteriously doesn't mention they're transformer components.

**Failure mode 2: Terminology mismatch with semantic embeddings**

A user asks for "ARPU calculation method." The document contains "Average Revenue Per User formula" but not the abbreviation ARPU. The semantic embedding of "ARPU calculation method" might not be close to "Average Revenue Per User formula" if the embedding model didn't encounter this abbreviation in training. The relevant passage is missed.

BM25 (bag-of-words search) would catch this by matching on "revenue" and "user" in common. Semantic-only search fails on exact terminology queries.

**Failure mode 3: Uniform chunk granularity mismatches content structure**

A 512-token fixed-size chunk may split a code example in the middle, separate a table from its caption, or merge three short distinct concepts into one chunk. The embedding of a mixed-concept chunk is a centroid that matches nothing precisely.

The correct granularity for retrieval depends on content type: paragraph-level for narrative text, section-level for structured documents, function-level for code, row-level for tables. Fixed-size chunking ignores this entirely.

```python
# Naive chunking (what most tutorials show)
def naive_chunk(text: str, chunk_size: int = 512,
                overlap: int = 50) -> list[str]:
    tokens = text.split()  # Simplified tokenization
    chunks = []
    for i in range(0, len(tokens), chunk_size - overlap):
        chunk = " ".join(tokens[i:i + chunk_size])
        chunks.append(chunk)
    return chunks

# Problems with naive_chunk:
# 1. Splits mid-sentence
# 2. Splits mid-code-block
# 3. No awareness of document structure
# 4. Embedded chunk has no document context
```

## Contextual Retrieval: 67% Fewer Retrieval Failures

Anthropic's contextual retrieval technique (September 2024) reduces top-20 retrieval failures from 5.7% to 1.9% (a 67% reduction) by prepending a brief context to each chunk before embedding it.

The method: for each chunk, generate a 50-100 token summary of where this chunk appears in the document and what context it provides. This context is prepended to the chunk text before embedding. The chunk with context is more specifically embeddable because it now contains information about the document's overall theme and the chunk's role within it.

**The key metric**: Contextual Embeddings alone reduce retrieval failures 35% (5.7% to 3.7%). Combined with BM25: 49% reduction (5.7% to 2.9%). With reranking: 67% reduction (5.7% to 1.9%).

Implementation:

```python
from anthropic import AsyncAnthropic
from typing import Optional
import asyncio

client = AsyncAnthropic()

CONTEXT_GENERATION_PROMPT = """<document>
{document_content}
</document>

Here is a chunk from the above document:
<chunk>
{chunk_content}
</chunk>

Please give a short succinct context (50-100 tokens) to situate this chunk
within the overall document for the purpose of improving search retrieval.
Answer only with the succinct context and nothing else."""

async def generate_chunk_context(
    document: str,
    chunk: str,
    model: str = "claude-haiku-4-5-20251001",  # Use fast, cheap model
) -> str:
    """
    Generate context for a chunk using a language model.
    Uses a small, fast model since context generation runs for every chunk.
    """
    prompt = CONTEXT_GENERATION_PROMPT.format(
        document_content=document[:50000],  # Truncate very long docs
        chunk_content=chunk,
    )

    response = await client.messages.create(
        model=model,
        max_tokens=150,
        messages=[{"role": "user", "content": prompt}],
    )

    return response.content[0].text.strip()

async def create_contextual_chunks(
    document: str,
    chunks: list[str],
    model: str = "claude-haiku-4-5-20251001",
    batch_size: int = 20,
) -> list[str]:
    """
    Generate contextual versions of all chunks.
    Returns chunks with prepended context.
    """
    contextual_chunks = []

    # Process in batches to control concurrency
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]

        contexts = await asyncio.gather(
            *[generate_chunk_context(document, chunk, model) for chunk in batch]
        )

        for chunk, context in zip(batch, contexts):
            contextual_chunk = f"{context}\n\n{chunk}"
            contextual_chunks.append(contextual_chunk)

    return contextual_chunks

# Cost estimation
def estimate_contextual_retrieval_cost(
    n_chunks: int,
    avg_document_tokens: int = 10000,
    avg_chunk_tokens: int = 500,
    haiku_price_per_million_input: float = 0.80,  # USD
    haiku_price_per_million_output: float = 4.00,
) -> dict:
    """
    Estimate cost of contextual retrieval preprocessing.
    With prompt caching, the document tokens cost 10% of normal.
    """
    # Without caching
    input_tokens_no_cache = n_chunks * (avg_document_tokens + avg_chunk_tokens)
    output_tokens = n_chunks * 100  # ~100 tokens per context
    cost_no_cache = (
        input_tokens_no_cache / 1e6 * haiku_price_per_million_input +
        output_tokens / 1e6 * haiku_price_per_million_output
    )

    # With prompt caching (document portion cached after first chunk)
    # First chunk: full document cost; subsequent chunks: 10% of document cost
    input_first_chunk = avg_document_tokens + avg_chunk_tokens
    input_cached_chunks = (n_chunks - 1) * (avg_document_tokens * 0.10 + avg_chunk_tokens)
    cost_with_cache = (
        (input_first_chunk + input_cached_chunks) / 1e6 * haiku_price_per_million_input +
        output_tokens / 1e6 * haiku_price_per_million_output
    )

    return {
        "n_chunks": n_chunks,
        "cost_no_cache_usd": round(cost_no_cache, 4),
        "cost_with_cache_usd": round(cost_with_cache, 4),
        "cache_savings_percent": round((1 - cost_with_cache / cost_no_cache) * 100, 1),
        "cost_per_chunk_usd": round(cost_with_cache / n_chunks, 5),
    }

# For 1000 chunks from a 10K-token document:
# Without cache: ~$0.82
# With cache: ~$0.08 (prompt caching reduces cost by ~90%)
print(estimate_contextual_retrieval_cost(1000))
```

**Implementation details that matter:**

1. Use a fast, cheap model for context generation (Haiku/Flash, not Opus/GPT-4). The context is a brief summary, not complex reasoning.

2. Use prompt caching for the document portion. The same large document is sent N times (once per chunk). Caching the document tokens reduces preprocessing cost by approximately 90%.

3. Anthropic reports $1.02 per million tokens with prompt caching for contextual retrieval preprocessing. This is the real production cost benchmark.

4. The generated context is not shown to users. It only affects the embedding and BM25 index.

## Late Chunking: ContextAware Embeddings

Late chunking (Günther et al., Jina AI, 2024) addresses context loss through a different mechanism. Rather than generating context text to prepend, it processes the full document through the embedding model first, then chunks the resulting token embeddings.

In standard chunking:
1. Split document into chunks
2. Embed each chunk independently
3. Each chunk embedding lacks document-level context

In late chunking:
1. Pass the full document through the embedding model's transformer layers
2. Extract token-level embeddings (each token has its own embedding that incorporates bidirectional attention over the full document)
3. Apply mean pooling to the token embeddings for each chunk's token range

Each chunk embedding now incorporates information from the full document context, because the transformer's attention mechanism operated over the full sequence when computing each token's representation.

```python
import torch
import numpy as np
from transformers import AutoTokenizer, AutoModel

def late_chunking_embed(
    text: str,
    chunk_boundaries: list[tuple[int, int]],  # (start_char, end_char) pairs
    model_name: str = "jinaai/jina-embeddings-v2-base-en",
    max_length: int = 8192,
) -> list[np.ndarray]:
    """
    Embed chunks using late chunking: process full document, then chunk embeddings.

    chunk_boundaries: character-level boundaries for each chunk.
    Returns: list of embeddings, one per chunk.
    """
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModel.from_pretrained(model_name, trust_remote_code=True)
    model.eval()

    # Tokenize the full document
    encoding = tokenizer(
        text,
        return_tensors="pt",
        return_offsets_mapping=True,  # Get char-to-token mapping
        max_length=max_length,
        truncation=True,
    )

    offset_mapping = encoding.pop("offset_mapping")[0]  # [n_tokens, 2]

    # Forward pass on full document
    with torch.no_grad():
        outputs = model(**encoding)

    # Token-level embeddings: [1, n_tokens, hidden_size]
    token_embeddings = outputs.last_hidden_state[0]  # [n_tokens, hidden_size]

    # Convert char boundaries to token boundaries using offset mapping
    chunk_embeddings = []

    for start_char, end_char in chunk_boundaries:
        # Find tokens that fall within this chunk's character range
        token_mask = (
            (offset_mapping[:, 0] >= start_char) &
            (offset_mapping[:, 1] <= end_char) &
            (offset_mapping[:, 0] < offset_mapping[:, 1])  # Exclude special tokens
        )

        chunk_tokens = token_embeddings[token_mask]

        if len(chunk_tokens) == 0:
            # Fallback: use nearest token
            chunk_tokens = token_embeddings[:1]

        # Mean pool the token embeddings for this chunk
        chunk_emb = chunk_tokens.mean(dim=0)

        # L2 normalize
        chunk_emb = chunk_emb / (chunk_emb.norm() + 1e-8)
        chunk_embeddings.append(chunk_emb.numpy())

    return chunk_embeddings

def get_sentence_boundaries(text: str) -> list[tuple[int, int]]:
    """
    Get character boundaries for sentence-level chunks.
    Better than fixed-size for late chunking since sentences are natural units.
    """
    import re
    boundaries = []
    # Split on sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text)

    pos = 0
    for sentence in sentences:
        start = text.find(sentence, pos)
        if start == -1:
            continue
        end = start + len(sentence)
        boundaries.append((start, end))
        pos = end

    return boundaries

# Benchmark: late chunking vs standard chunking on BeIR datasets
# Dataset          | Standard | Late Chunking | Improvement
# SciFact          | 64.20%   | 66.10%        | +1.9% nDCG@10
# TREC-COVID       | 63.36%   | 64.70%        | +1.3% nDCG@10
# NFCorpus         | 23.46%   | 29.98%        | +6.5% nDCG@10
# Effect increases with document length (as context from earlier text matters more)
```

**When late chunking outperforms standard chunking:**
- Long documents where early context is referenced later (technical manuals, legal documents)
- Documents with cross-references ("as mentioned in Section 2" patterns)
- Narrative content where pronouns and references are only resolved at document level

**When late chunking is less effective:**
- Documents longer than the model's maximum context length (8K tokens for Jina v2)
- Collections of short, independent documents where each chunk is a complete unit
- When you need fine-grained subsentence-level retrieval

**Late chunking limitation**: It requires an embedding model that supports long contexts (8K+ tokens). Standard sentence-transformer models with 512-token limits cannot use late chunking effectively. Jina's v2 and v3 models, Cohere's embedding models, and the OpenAI text-embedding-3 models support the necessary context lengths.

## Hybrid Search: BM25 + Vector for Complementary Coverage

BM25 (Best Matching 25) is a term-frequency-based retrieval algorithm that has been the foundation of text search for 30 years. It scores documents based on how often query terms appear in them, adjusted for document length and term rarity. It has no semantic understanding ("automobile" and "car" are different terms), but it excels at exact match retrieval.

The complementarity with dense vector search is well-established. Vector search finds semantically similar but lexically different passages. BM25 finds exact terminology matches that vectors miss. Together, they cover more of the retrieval space than either alone.

**Hybrid retrieval with Reciprocal Rank Fusion:**

```python
from rank_bm25 import BM25Okapi
import numpy as np
from typing import Optional

class HybridRetriever:
    """
    Hybrid BM25 + dense vector retrieval with Reciprocal Rank Fusion.
    """

    def __init__(self, embed_fn: callable, k1: float = 1.5, b: float = 0.75):
        """
        embed_fn: function that takes a text and returns a dense embedding vector
        k1, b: BM25 parameters (k1=1.5, b=0.75 are BM25+ defaults)
        """
        self.embed = embed_fn
        self.k1 = k1
        self.b = b
        self.chunks: list[str] = []
        self.embeddings: list[np.ndarray] = []
        self.bm25: Optional[BM25Okapi] = None

    def index(self, chunks: list[str]):
        """Index chunks for both BM25 and vector retrieval."""
        self.chunks = chunks

        # BM25 index: tokenized chunks
        tokenized = [chunk.lower().split() for chunk in chunks]
        self.bm25 = BM25Okapi(tokenized, k1=self.k1, b=self.b)

        # Dense index: embeddings
        self.embeddings = np.array([self.embed(chunk) for chunk in chunks])

    def retrieve(self, query: str, top_k: int = 20,
                  bm25_weight: float = 0.5,
                  vector_weight: float = 0.5) -> list[tuple[int, float, str]]:
        """
        Hybrid retrieval using Reciprocal Rank Fusion.
        Returns: [(chunk_idx, score, chunk_text), ...]
        """
        # BM25 retrieval
        query_tokens = query.lower().split()
        bm25_scores = self.bm25.get_scores(query_tokens)
        bm25_ranked = np.argsort(bm25_scores)[::-1][:top_k * 2]

        # Dense vector retrieval
        query_emb = np.array(self.embed(query))
        # Cosine similarity
        similarities = np.dot(self.embeddings, query_emb) / (
            np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_emb) + 1e-8
        )
        dense_ranked = np.argsort(similarities)[::-1][:top_k * 2]

        # Reciprocal Rank Fusion
        rrf_k = 60  # RRF constant (60 is standard)
        scores = {}

        for rank, idx in enumerate(bm25_ranked):
            if idx not in scores:
                scores[idx] = 0.0
            scores[idx] += bm25_weight / (rrf_k + rank + 1)

        for rank, idx in enumerate(dense_ranked):
            if idx not in scores:
                scores[idx] = 0.0
            scores[idx] += vector_weight / (rrf_k + rank + 1)

        # Sort by combined score
        sorted_results = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        return [
            (idx, score, self.chunks[idx])
            for idx, score in sorted_results[:top_k]
        ]

    def retrieve_with_explanation(self, query: str, top_k: int = 5) -> list[dict]:
        """Retrieve with BM25 and vector scores separately for debugging."""
        query_tokens = query.lower().split()
        bm25_scores = self.bm25.get_scores(query_tokens)
        query_emb = np.array(self.embed(query))
        vector_scores = np.dot(self.embeddings, query_emb) / (
            np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_emb) + 1e-8
        )

        combined = self.retrieve(query, top_k)

        return [
            {
                "chunk_idx": idx,
                "text": text[:200],
                "rrf_score": score,
                "bm25_score": float(bm25_scores[idx]),
                "vector_score": float(vector_scores[idx]),
                "retrieval_source": (
                    "both" if bm25_scores[idx] > np.median(bm25_scores) and
                    vector_scores[idx] > np.median(vector_scores) else
                    "bm25" if bm25_scores[idx] > np.median(bm25_scores) else "vector"
                ),
            }
            for idx, score, text in combined
        ]
```

**RRF vs. weighted sum for fusion**: Reciprocal Rank Fusion (RRF) is more robust than weighted score combination because it operates on ranks rather than raw scores, which have different scales across retrieval methods. The RRF constant k=60 normalizes the contribution of high-rank results without discarding low-rank results. For most use cases, RRF outperforms score normalization + weighted sum by 3-7% on standard IR benchmarks.

**When BM25 contributes most**: exact technical terminology, product names, abbreviations (API names, ticker symbols, medical codes), quoted phrases, and numeric values. These are the cases where semantic embeddings most commonly fail to retrieve the relevant passage.

## ColBERT Late Interaction: TokenLevel Matching at Scale

ColBERT (Contextualized Late Interaction over BERT) is a retrieval model that provides token-level matching between query and document rather than comparing single embedding vectors.

**Standard dense retrieval**: embed query → single vector; embed document → single vector; similarity = dot product of two vectors.

**ColBERT**: embed query → one vector per query token; embed document → one vector per document token; similarity = MaxSim (for each query token, find the maximum similarity to any document token, then sum across query tokens).

```
MaxSim(Q, D) = Σ_i max_j (Q_i · D_j^T)
```

This captures token-level relevance that a single document vector cannot. A query token "transformer" will find its highest-matching document token even if the document embedding centroid doesn't closely match the query centroid.

```python
import torch
import numpy as np
from transformers import AutoTokenizer, AutoModel

class ColBERTRetriever:
    """
    ColBERT-style late interaction retrieval.
    Uses single BERT model for both query and document encoding.
    """

    def __init__(self, model_name: str = "colbert-ir/colbertv2.0"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.eval()
        self.doc_embeddings: list[torch.Tensor] = []
        self.docs: list[str] = []

    def encode_query(self, query: str) -> torch.Tensor:
        """Encode query into per-token embeddings: [n_query_tokens, dim]"""
        inputs = self.tokenizer(
            f"[Q] {query}",  # Query prefix
            return_tensors="pt",
            max_length=32,    # ColBERT uses short query sequences
            truncation=True,
        )
        with torch.no_grad():
            outputs = self.model(**inputs)
        embeddings = outputs.last_hidden_state[0]  # [n_tokens, dim]
        # L2 normalize each token embedding
        return torch.nn.functional.normalize(embeddings, dim=-1)

    def encode_document(self, doc: str) -> torch.Tensor:
        """Encode document into per-token embeddings: [n_doc_tokens, dim]"""
        inputs = self.tokenizer(
            f"[D] {doc}",  # Document prefix
            return_tensors="pt",
            max_length=180,   # ColBERT uses longer document sequences
            truncation=True,
        )
        with torch.no_grad():
            outputs = self.model(**inputs)
        embeddings = outputs.last_hidden_state[0]
        return torch.nn.functional.normalize(embeddings, dim=-1)

    def maxsim(self, query_embeddings: torch.Tensor,
                doc_embeddings: torch.Tensor) -> float:
        """
        Compute ColBERT MaxSim score.
        For each query token, find max similarity to any document token.
        Sum across query tokens.
        """
        # [n_query_tokens, n_doc_tokens] similarity matrix
        similarities = query_embeddings @ doc_embeddings.T

        # For each query token: max similarity across document tokens
        max_similarities = similarities.max(dim=1).values

        # Sum across query tokens (excluding [Q] special token)
        return max_similarities[1:].sum().item()  # Skip [Q] token

    def index(self, documents: list[str]):
        """Pre-encode all documents."""
        self.docs = documents
        self.doc_embeddings = [self.encode_document(doc) for doc in documents]

    def retrieve(self, query: str, top_k: int = 10) -> list[tuple[int, float, str]]:
        """Retrieve top_k documents by MaxSim score."""
        query_emb = self.encode_query(query)

        scores = [
            (i, self.maxsim(query_emb, doc_emb))
            for i, doc_emb in enumerate(self.doc_embeddings)
        ]

        scores.sort(key=lambda x: x[1], reverse=True)
        return [(idx, score, self.docs[idx]) for idx, score in scores[:top_k]]
```

**ColBERT tradeoffs vs. dense retrieval**:

| Property | Dense (single vector) | ColBERT (per-token) |
|---|---|---|
| Index size | 1 × dim per document | ~180 × dim per document |
| Query latency | O(n) dot products | O(n × query_len × doc_len) MaxSim |
| Quality on hard queries | Moderate | Higher (token-level matching) |
| Storage cost | Low | ~180x higher |

For most production systems, ColBERT is too storage-expensive as the primary retrieval method. The practical pattern uses ColBERT as a reranker over the top-K results from standard dense retrieval. Retrieve 100 candidates via dense vectors, rerank with ColBERT MaxSim, return top-10. This captures ColBERT's quality advantage while limiting the storage and compute cost to the candidate set.

## Reranking: The Final Quality Layer

Reranking is a separate model pass that re-scores the top-K retrieved chunks against the query, using a cross-encoder (rather than bi-encoder) that can attend to both query and chunk simultaneously. Cross-encoders are more expensive than embedding comparison but more accurate.

```python
from sentence_transformers import CrossEncoder

class Reranker:
    """
    Cross-encoder reranker for retrieved chunks.
    Use as the final step after initial retrieval.
    """

    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model = CrossEncoder(model_name)

    def rerank(self, query: str, chunks: list[tuple[int, str]],
               top_n: int = 5) -> list[tuple[int, float, str]]:
        """
        Rerank retrieved chunks using cross-encoder scores.
        chunks: [(chunk_idx, chunk_text), ...]
        Returns: top_n chunks with cross-encoder scores, highest first
        """
        pairs = [(query, chunk_text) for _, chunk_text in chunks]
        scores = self.model.predict(pairs)

        scored = [(idx, float(score), text)
                  for (idx, text), score in zip(chunks, scores)]
        scored.sort(key=lambda x: x[1], reverse=True)

        return scored[:top_n]
```

The Anthropic contextual retrieval + reranking result: 67% reduction in retrieval failure rate (5.7% to 1.9%). This is the most impactful single addition to a naive RAG pipeline.

## Combining the Stack: Full Pipeline Architecture

```python
class AdvancedRAGPipeline:
    """
    Full advanced RAG pipeline combining:
    1. Contextual chunk generation
    2. Late chunking embeddings (for long documents)
    3. Hybrid BM25 + vector retrieval
    4. Reranking
    """

    def __init__(self, embed_fn, reranker, llm_client):
        self.retriever = HybridRetriever(embed_fn)
        self.reranker = Reranker()
        self.llm = llm_client

    async def index_document(self, document: str,
                               use_late_chunking: bool = True,
                               use_contextual_retrieval: bool = True):
        """Full indexing pipeline for a document."""
        # 1. Semantic chunking (structure-aware)
        chunks = semantic_chunk(document)  # Not shown: structure-aware chunking

        # 2. Contextual retrieval: generate context for each chunk
        if use_contextual_retrieval:
            chunks = await create_contextual_chunks(document, chunks)

        # 3. Index in hybrid retriever
        if use_late_chunking and len(document.split()) < 6000:
            # Late chunking for manageable-length docs
            boundaries = [(document.find(c), document.find(c) + len(c)) for c in chunks]
            embeddings = late_chunking_embed(document, boundaries)
            self.retriever.index_with_embeddings(chunks, embeddings)
        else:
            self.retriever.index(chunks)

    async def query(self, query: str, top_k_retrieve: int = 20,
                     top_n_rerank: int = 5) -> dict:
        """Full retrieval + generation pipeline."""
        # 1. Hybrid retrieval
        retrieved = self.retriever.retrieve(query, top_k=top_k_retrieve)

        # 2. Rerank
        chunks_for_rerank = [(idx, text) for idx, _, text in retrieved]
        reranked = self.reranker.rerank(query, chunks_for_rerank, top_n=top_n_rerank)

        # 3. Generate answer
        context = "\n\n".join(f"[Source {i+1}]\n{text}" for i, (_, _, text) in enumerate(reranked))
        answer = await self.llm.complete(
            f"Based on these sources:\n{context}\n\nAnswer: {query}"
        )

        return {
            "answer": answer,
            "sources": [{"rank": i+1, "score": score, "text": text[:200]}
                        for i, (_, score, text) in enumerate(reranked)],
            "n_retrieved": len(retrieved),
            "n_reranked": len(reranked),
        }
```

## Cost Analysis: What Each Technique Adds

| Technique | Indexing cost added | Query cost added | Retrieval improvement |
|---|---|---|---|
| Baseline (dense only) | embedding cost | 1 embed + ANN search | baseline |
| + Contextual retrieval | ~$1/million tokens (with cache) | none | -35% failures |
| + BM25 hybrid | near zero | near zero | -49% failures (combined) |
| + Reranking | none | ~10-50ms, ~$0.001/query | -67% failures (combined) |
| + ColBERT reranking | 180x embedding storage | higher | marginal vs cross-encoder |
| + Late chunking | same as dense (different order) | none | +1-6% nDCG@10 |

The highest-ROI sequence: contextual retrieval + BM25 hybrid + cross-encoder reranking. This combination produces 67% fewer retrieval failures and approximately $0.001-0.002 per query additional cost. Almost always economically positive given the value of correct answers.

Late chunking is worth adding for document collections with strong cross-reference patterns (technical documentation, legal texts, long-form reports). For short independent documents or FAQ databases, its contribution is smaller.

## Key Takeaways

- Contextual retrieval (prepending an LLM-generated 50-100 token context to each chunk before embedding) reduces top-20 retrieval failures by 35% alone and 67% when combined with BM25 and reranking (5.7% to 1.9% failure rate). With prompt caching, the preprocessing cost is approximately $1 per million tokens using a fast model like Claude Haiku.

- Late chunking processes the full document through the embedding model before chunking, giving each chunk's embedding access to the full document context through transformer attention. It improves retrieval by 1-6% nDCG@10 on standard benchmarks, with larger gains on longer documents with cross-references.

- Hybrid BM25 + vector retrieval is the fastest, cheapest, and most impactful improvement to naive RAG after contextual retrieval. BM25 captures exact terminology matches (abbreviations, product names, technical codes) that semantic embeddings miss. Reciprocal Rank Fusion (k=60) is more robust than score-weighted combination for merging results.

- Cross-encoder reranking adds 10-50ms per query and approximately $0.001 per query but is responsible for the largest single quality jump in the full stack. The combination of contextual retrieval + BM25 + reranking achieves 67% fewer retrieval failures. Use a small, fast cross-encoder (MiniLM-L6 or similar) for the latency target.

- ColBERT late interaction provides token-level matching quality between standard bi-encoder and full cross-encoder, but requires approximately 180x more storage per document than standard dense vectors. The production pattern is ColBERT as a reranker over 100 dense-retrieved candidates, not as primary retrieval.

- The recommended implementation order for maximum ROI: (1) add contextual retrieval to your indexing pipeline (preprocessing step, no query changes), (2) add BM25 index alongside your vector index with RRF fusion, (3) add cross-encoder reranking as the final step. Each addition is independently valuable and compounds with the others.

## FAQ

### What is contextual retrieval in RAG?

Contextual retrieval is an RAG technique developed by Anthropic that prepends a brief, LLM-generated context to each chunk before embedding, helping the embedding model capture the chunk's role within the larger document. Without context, a chunk like "These are query, key, and value projections" lacks information about what system these belong to. With contextual retrieval, the same chunk is prepended with context like "This chunk describes the core attention mechanism components of the transformer architecture introduced in the previous section." The contextual version embeds more specifically and retrieves more accurately for relevant queries. Anthropic reports that contextual retrieval alone reduces top-20 retrieval failures by 35%, and combined with BM25 and reranking reduces failures by 67%. The preprocessing cost is approximately $1 per million tokens using Claude Haiku with prompt caching.

### What is late chunking and how does it differ from standard chunking?

Late chunking is an embedding technique where the full document passes through the embedding model before being divided into chunks, rather than embedding pre-divided chunks independently. In standard chunking, each chunk is embedded without knowing its document context. In late chunking, the transformer's self-attention mechanism operates over the full document, giving each token an embedding that incorporates bidirectional context from the entire document. Chunks are then formed by mean-pooling the token embeddings for each chunk's position range. Each chunk embedding therefore reflects its local content plus its document context. Late chunking improves retrieval by 1-6% nDCG@10 on standard benchmarks, with larger gains on longer documents where cross-references and pronouns are common. It requires an embedding model that supports long context windows (8K+ tokens). Standard 512-token sentence transformers cannot use late chunking effectively.

### How does hybrid search work in RAG systems?

Hybrid search in RAG combines dense vector retrieval (semantic similarity via embedding dot products) with sparse BM25 retrieval (term frequency-based exact matching) to capture retrieval signals that each method misses alone. Dense retrieval finds semantically similar passages even with different terminology ("car" matches "automobile"). BM25 finds passages with exact query terms even when the overall meaning differs. The two result sets are combined using Reciprocal Rank Fusion (RRF): for each retrieved passage, compute 1/(k + rank) for each retrieval method and sum the values, where k=60 is the RRF constant. The passages with the highest summed RRF scores are returned. Hybrid search typically improves recall@20 by 5-15% over dense-only retrieval, with the largest gains on queries involving technical terminology, abbreviations, product names, or exact phrases that semantic embeddings frequently miss.

Naive RAG fails at the retrieval step. The rest of the pipeline is good enough. LLMs can reason well from relevant context. The problem is that 5-7% of queries don't get the relevant context. That failure rate is the gap that these techniques close.

The 67% reduction in retrieval failures from the contextual retrieval + BM25 + reranking stack translates directly to fewer wrong answers per day, fewer user complaints, and higher application quality. For a system handling 10,000 queries per day, reducing the failure rate from 5.7% to 1.9% means 380 fewer failures every day.

The techniques are not exotic. Contextual retrieval is a preprocessing step that adds context text before embedding. BM25 is 30-year-old IR technology available in every Python package manager. Reranking is a small model pass over a short candidate list. The full stack is 2-3 days of implementation work for teams that have built a naive RAG system.

The comparison to make: the cost of 380 daily retrieval failures (in user trust, in support tickets, in incorrect automated decisions) versus the engineering time and compute cost of the improvement. The math is nearly always in favor of implementing the advanced stack.
