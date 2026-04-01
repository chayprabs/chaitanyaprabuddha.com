---
title: "LLM Model Routing: Sending the Right Query to the Right Model to Cut Costs 2x"
description: "The second genuinely needs a frontier model at $0.02. Using GPT-4 or Claude Opus for everything is 20x overpaying for simple queries."
date: "2026-03-29"
tags: ["Dev Tools","LLM model routing","LLM routing cost optimization"]
readTime: "18 min read"
ogImage: "/og/llm-model-routing-cost-optimization.png"
canonical: "https://chaitanyaprabuddha.com/blog/llm-model-routing-cost-optimization"
published: true
---

Most LLM applications use a single model for every query. A customer support chatbot handles both "what are your store hours?" and "explain why my refund hasn't arrived after 30 days with these three extenuating circumstances" with the same model. The first query could be answered correctly by a 7B model at $0.001. The second genuinely needs a frontier model at $0.02. Using GPT-4 or Claude Opus for everything is 20x overpaying for simple queries.

Model routing solves this by dynamically selecting which model to use for each query at runtime. The router, a lightweight classifier, evaluates the incoming query, estimates its complexity, and routes it to the cheapest model that can handle it at the required quality level. Easy queries go to cheap models. Hard queries go to expensive models. The overall cost drops while overall quality stays high.

The research results are compelling: RouteLLM (Ong et al., Lmarena, 2024) demonstrates that well-designed routers achieve 2x cost reduction while maintaining the quality equivalent to routing all queries to the stronger model. At scale, the savings compound: an application spending $50,000/month on Claude Opus could spend $25,000 with routing, achieving the same quality on 95%+ of queries.

Production model routing involves routing strategies (semantic, cascade, trained classifier), implementation patterns, quality measurement, and operational considerations for deployment.

## Routing Fundamentals: The QualityCost Tradeoff

The economics of model routing depend on two empirical observations:

**Observation 1: Query complexity is not uniformly distributed.** In most production LLM applications, 60-75% of queries are routine: simple questions, short-form answers, factual lookups, basic formatting tasks. These queries are handled correctly by 7B-13B models at a fraction of frontier model cost. The remaining 25-40% of queries require multi-step reasoning, complex synthesis, long-form generation, or careful instruction following that smaller models handle poorly.

**Observation 2: Model quality differences are largest at the tail.** For routine queries, a 7B model achieves 90-95% of frontier model quality. For hard queries, the same 7B model achieves 60-70% quality. The quality gap between models is not uniform; it concentrates in the hard fraction of queries.

Together, these observations mean that routing easy queries to cheap models and hard queries to expensive models can approach the quality of routing everything to the expensive model, at a cost close to the cheap model cost for the majority fraction.

**The routing math:**

```
Total cost = p_cheap * cost_cheap + p_expensive * cost_expensive
Total quality = p_cheap * quality_cheap(easy) + p_expensive * quality_expensive(hard)

vs. All-expensive baseline:
Total cost = cost_expensive
Total quality = quality_expensive(all)
```

For typical values (p_cheap=0.70, cost_cheap=$0.001, cost_expensive=$0.020, quality preservation 95%+):
- All-expensive cost: $0.020
- Routed cost: 0.70 × $0.001 + 0.30 × $0.020 = $0.007
- Cost reduction: 0.020 / 0.007 = 2.86x

The router must have low latency (adds to query latency) and must not route hard queries to cheap models (quality loss is unacceptable for hard queries). A bad router that misclassifies hard queries as easy can cause significant quality degradation, making the routing worse than using the expensive model everywhere.

## Routing Strategies: Semantic, Cascade, and ClassifierBased

Three main routing strategies, with different tradeoffs:

**1. Semantic routing**: Embed the query and compare to predefined "easy" and "hard" cluster centroids. Queries similar to easy examples go to cheap models; queries similar to hard examples go to expensive models.

*Pros*: No training data needed, fast inference (one embedding + distance computation)
*Cons*: Requires manually defining example clusters, brittle to novel query types

**2. Cascade routing**: Send every query to the cheap model first; if the cheap model expresses uncertainty (low confidence or explicit "I don't know"), escalate to the expensive model.

*Pros*: No training data, no separate router model, self-calibrating
*Cons*: Adds latency for the escalated fraction (cheap model call + expensive model call), cheap models often don't know when they don't know

**3. Classifier-based routing**: Train a lightweight classifier on examples of "strong model needed" vs. "weak model sufficient" to predict which model to use.

*Pros*: Highest routing accuracy, generalizes to novel query types
*Cons*: Requires training data (typically 1,000-5,000 labeled examples), additional model to maintain

The RouteLLM paper uses strategy 3 with human preference data (which model produced the preferred response for a given query) as training labels for the difficulty classifier.

## RouteLLM: Trained Routers on Human Preference Data

RouteLLM trains routers using human preference data from Chatbot Arena (a platform where users compare model responses). For each query, if human annotators preferred the stronger model's response, it is labeled "strong model needed." If they preferred or didn't distinguish the weaker model's response, it is labeled "weak model sufficient."

The router is a lightweight model (logistic regression, small BERT classifier, or embedding similarity model) trained on these labels. At inference time, it predicts whether the strong model is needed for a given query.

The paper tests four router architectures:
- **BERT classifier**: Fine-tuned BERT on the preference labels, ~110M parameters
- **Matrix factorization**: Collaborative filtering-style model, ~1M parameters
- **CAWR (Calibrated Weighted Random)**: Embedding-based with calibration
- **SW (Similarity Weighted)**: Embedding nearest-neighbor to training examples

Key findings: The matrix factorization and CAWR approaches achieve 2x cost reduction while maintaining quality equivalent to routing everything to GPT-4, at less than 10ms additional latency. The BERT classifier is slightly more accurate but slower.

**Implementing a RouteLLM-style difficulty router:**

```python
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
import numpy as np
import pickle
from dataclasses import dataclass

@dataclass
class RouterConfig:
    strong_model: str = "claude-opus-4-6"
    weak_model: str = "claude-haiku-4-5-20251001"
    cost_threshold: float = 0.5   # Route to strong if P(strong_needed) > threshold

class DifficultyRouter:
    """
    Lightweight logistic regression router trained on query difficulty labels.
    """

    def __init__(self, embed_fn: callable, config: RouterConfig):
        self.embed = embed_fn
        self.config = config
        self.classifier = LogisticRegression(C=1.0, max_iter=1000)
        self.scaler = StandardScaler()
        self._fitted = False

    def train(self, queries: list[str],
               labels: list[int],   # 1=strong model needed, 0=weak model sufficient
               sample_weights: list[float] = None):
        """
        Train the difficulty classifier.

        queries: list of query strings
        labels: 1 if strong model needed (human preferred strong), 0 otherwise
        sample_weights: optional per-example weights (e.g., based on annotator confidence)
        """
        embeddings = np.array([self.embed(q) for q in queries])
        embeddings_scaled = self.scaler.fit_transform(embeddings)

        self.classifier.fit(
            embeddings_scaled, labels,
            sample_weight=sample_weights,
        )
        self._fitted = True

        # Calibration check
        train_preds = self.classifier.predict_proba(embeddings_scaled)[:, 1]
        threshold_at_80_recall = np.percentile(
            train_preds[np.array(labels) == 1], 20  # 80th percentile of strong-needed examples
        )
        print(f"Threshold for 80% recall on strong-needed queries: {threshold_at_80_recall:.2f}")

    def route(self, query: str) -> dict:
        """Route a query to the appropriate model."""
        if not self._fitted:
            return {"model": self.config.strong_model, "confidence": 1.0, "reason": "untrained"}

        embedding = np.array(self.embed(query)).reshape(1, -1)
        embedding_scaled = self.scaler.transform(embedding)

        prob_strong_needed = self.classifier.predict_proba(embedding_scaled)[0, 1]
        use_strong = prob_strong_needed > self.config.cost_threshold

        return {
            "model": self.config.strong_model if use_strong else self.config.weak_model,
            "prob_strong_needed": float(prob_strong_needed),
            "routed_to_strong": use_strong,
        }

    def route_batch(self, queries: list[str]) -> list[dict]:
        """Efficiently route a batch of queries."""
        embeddings = np.array([self.embed(q) for q in queries])
        embeddings_scaled = self.scaler.transform(embeddings)
        probs = self.classifier.predict_proba(embeddings_scaled)[:, 1]

        return [
            {
                "query": q,
                "model": (self.config.strong_model if p > self.config.cost_threshold
                          else self.config.weak_model),
                "prob_strong_needed": float(p),
                "routed_to_strong": p > self.config.cost_threshold,
            }
            for q, p in zip(queries, probs)
        ]

    def save(self, path: str):
        with open(path, "wb") as f:
            pickle.dump({"classifier": self.classifier, "scaler": self.scaler}, f)

    def load(self, path: str):
        with open(path, "rb") as f:
            data = pickle.load(f)
        self.classifier = data["classifier"]
        self.scaler = data["scaler"]
        self._fitted = True
```

**Generating training data without human labeling:**

The bootstrapping problem for a new deployment: you need labeled training examples, but you haven't deployed yet. Two practical approaches:

1. **Quality-based labeling**: Run 500-1,000 representative queries through both the weak and strong model. Use a judge model (Claude Opus) to compare outputs. Label "strong model needed" when the strong model's output is meaningfully better.

2. **Failure-based labeling**: Run all queries through the weak model initially. Label queries where the weak model fails (incorrect answer, refused to answer, used wrong format) as "strong model needed."

```python
async def generate_training_data_from_comparison(
    queries: list[str],
    weak_model: str,
    strong_model: str,
    judge_model: str,
    llm_client,
    n_sample: int = 500,
) -> list[dict]:
    """
    Generate router training labels by comparing model outputs.
    """
    sample = queries[:n_sample]
    training_data = []

    for query in sample:
        # Get both model responses
        weak_response = await llm_client.complete(query, model=weak_model)
        strong_response = await llm_client.complete(query, model=strong_model)

        # Judge which is better
        judge_prompt = f"""Query: {query}

Response A: {weak_response}
Response B: {strong_response}

Is Response B meaningfully better than Response A for this query?
Answer with only: YES or NO"""

        judgment = await llm_client.complete(judge_prompt, model=judge_model, max_tokens=5)
        strong_needed = "yes" in judgment.lower()

        training_data.append({
            "query": query,
            "label": 1 if strong_needed else 0,
            "weak_response": weak_response,
            "strong_response": strong_response,
        })

    return training_data
```

## Semantic Routing: EmbeddingBased Query Classification

Semantic routing uses embedding similarity to predefined cluster examples instead of a trained classifier. It is faster to deploy (no training data collection needed) but less accurate for novel query types.

```python
import numpy as np
from dataclasses import dataclass

@dataclass
class RouteDefinition:
    name: str              # e.g., "simple_factual", "complex_reasoning"
    description: str
    examples: list[str]    # Representative queries for this route
    model: str             # Model to use for this route

class SemanticRouter:
    """
    Route queries based on embedding similarity to predefined route examples.
    """

    def __init__(self, routes: list[RouteDefinition], embed_fn: callable):
        self.routes = routes
        self.embed = embed_fn
        self.route_embeddings: list[np.ndarray] = []
        self._build_route_embeddings()

    def _build_route_embeddings(self):
        """Compute centroid embedding for each route's example queries."""
        for route in self.routes:
            example_embeddings = np.array([self.embed(ex) for ex in route.examples])
            # Route centroid = mean of example embeddings
            centroid = example_embeddings.mean(axis=0)
            centroid /= np.linalg.norm(centroid) + 1e-8
            self.route_embeddings.append(centroid)

    def route(self, query: str) -> dict:
        """Route query to the most similar route."""
        query_emb = np.array(self.embed(query))
        query_emb /= np.linalg.norm(query_emb) + 1e-8

        similarities = [
            float(query_emb @ centroid)
            for centroid in self.route_embeddings
        ]

        best_route_idx = int(np.argmax(similarities))
        best_route = self.routes[best_route_idx]

        return {
            "route": best_route.name,
            "model": best_route.model,
            "similarity": similarities[best_route_idx],
            "all_similarities": {r.name: s for r, s in zip(self.routes, similarities)},
        }

# Example route configuration for a customer support system
ROUTES = [
    RouteDefinition(
        name="simple_lookup",
        description="Simple factual questions about store/product information",
        examples=[
            "What are your store hours?",
            "Where are you located?",
            "What is your return policy?",
            "Do you ship internationally?",
            "What payment methods do you accept?",
        ],
        model="claude-haiku-4-5-20251001",
    ),
    RouteDefinition(
        name="order_inquiry",
        description="Order status and tracking questions",
        examples=[
            "Where is my order?",
            "My tracking number isn't working",
            "I haven't received my package",
            "Can I change my shipping address?",
            "When will my order arrive?",
        ],
        model="claude-haiku-4-5-20251001",
    ),
    RouteDefinition(
        name="complex_complaint",
        description="Complex complaints requiring reasoning and judgment",
        examples=[
            "I've been charged three times and your support has ignored me for 2 weeks",
            "The product is defective and dangerous and I need immediate resolution",
            "I need to escalate this issue about the wrong product arriving despite multiple corrections",
            "My account was incorrectly suspended and I'm losing business",
        ],
        model="claude-opus-4-6",
    ),
]
```

## Cascade Routing: Progressive Quality Escalation

Cascade routing sends every query to the cheap model first and escalates to the expensive model only when the cheap model's response is insufficient. The challenge is detecting "insufficient" responses automatically.

```python
import re
from typing import Optional

class CascadeRouter:
    """
    Progressive quality routing: cheap model first, escalate on uncertainty.
    """

    def __init__(self, weak_model: str, strong_model: str, llm_client,
                  escalation_threshold: float = 0.7):
        self.weak_model = weak_model
        self.strong_model = strong_model
        self.llm = llm_client
        self.threshold = escalation_threshold
        self.escalation_rate_tracker: list[bool] = []

    async def route(self, query: str) -> dict:
        """
        Attempt weak model first, escalate if confidence is low.
        """
        # Prompt weak model to include confidence
        weak_prompt = f"""{query}

Provide your answer. At the end, add a line:
CONFIDENCE: <number 0.0-1.0> (how confident you are in this answer)"""

        weak_response = await self.llm.complete(weak_prompt, model=self.weak_model)
        confidence = self._extract_confidence(weak_response)
        cleaned_response = self._remove_confidence_line(weak_response)

        escalated = False
        final_response = cleaned_response
        final_model = self.weak_model

        if confidence < self.threshold or self._should_escalate(cleaned_response):
            strong_response = await self.llm.complete(query, model=self.strong_model)
            final_response = strong_response
            final_model = self.strong_model
            escalated = True

        self.escalation_rate_tracker.append(escalated)

        return {
            "response": final_response,
            "model_used": final_model,
            "escalated": escalated,
            "weak_confidence": confidence,
        }

    def _extract_confidence(self, response: str) -> float:
        match = re.search(r"CONFIDENCE:\s*([0-9.]+)", response, re.IGNORECASE)
        if match:
            try:
                conf = float(match.group(1))
                return min(max(conf, 0.0), 1.0)
            except ValueError:
                pass
        return 0.5  # Default to medium confidence

    def _remove_confidence_line(self, response: str) -> str:
        return re.sub(r"\nCONFIDENCE:.*", "", response, flags=re.IGNORECASE).strip()

    def _should_escalate(self, response: str) -> bool:
        """Escalate based on content signals indicating uncertainty."""
        uncertainty_phrases = [
            "i'm not sure", "i don't know", "i cannot determine",
            "insufficient information", "i would need more context",
            "i'm uncertain", "i'm unable to", "i don't have enough",
        ]
        response_lower = response.lower()
        return any(phrase in response_lower for phrase in uncertainty_phrases)

    @property
    def escalation_rate(self) -> float:
        if not self.escalation_rate_tracker:
            return 0.0
        return sum(self.escalation_rate_tracker) / len(self.escalation_rate_tracker)

    def cost_estimate(self, n_queries: int,
                       weak_cost: float, strong_cost: float) -> dict:
        rate = self.escalation_rate
        expected_cost = n_queries * (
            weak_cost + rate * strong_cost
        )
        all_strong_cost = n_queries * strong_cost
        return {
            "escalation_rate": rate,
            "expected_cost_usd": expected_cost,
            "all_strong_cost_usd": all_strong_cost,
            "savings_percent": (1 - expected_cost / all_strong_cost) * 100,
        }
```

Cascade routing limitation: small models often don't know what they don't know. A 7B model may confidently give a wrong answer with "CONFIDENCE: 0.9" because it doesn't have the metacognitive awareness to recognize the limits of its knowledge. The escalation signal is unreliable.

The practical fix: use cascade routing with domain-specific calibration. Run a calibration set of 200 queries with known correct answers, measure the weak model's accuracy per confidence level, and set the escalation threshold at the confidence level where accuracy drops below your target.

## Production Implementation: A Complete Router

```python
from anthropic import AsyncAnthropic
import asyncio
import time
from typing import Optional

client = AsyncAnthropic()

class ProductionModelRouter:
    """
    Production-ready model router combining difficulty classification
    with fallback cascade logic and full observability.
    """

    def __init__(self, router: DifficultyRouter,
                  strong_model: str = "claude-opus-4-6",
                  weak_model: str = "claude-haiku-4-5-20251001",
                  force_strong_probability: float = 0.05):
        self.router = router
        self.strong_model = strong_model
        self.weak_model = weak_model
        # Always route force_strong_probability fraction to strong for quality monitoring
        self.force_strong_rate = force_strong_probability
        self._metrics: list[dict] = []

    async def complete(self, query: str, system: Optional[str] = None,
                        **kwargs) -> dict:
        start_time = time.monotonic()

        # 1. Route the query
        routing_decision = self.router.route(query)

        # 2. Quality monitoring: occasionally force strong model for calibration
        if hash(query) % 100 < (self.force_strong_rate * 100):
            routing_decision["model"] = self.strong_model
            routing_decision["forced"] = True

        selected_model = routing_decision["model"]

        # 3. Build messages
        messages = [{"role": "user", "content": query}]

        # 4. Call the selected model
        try:
            response = await client.messages.create(
                model=selected_model,
                max_tokens=kwargs.get("max_tokens", 1024),
                system=system or "",
                messages=messages,
            )

            duration_ms = (time.monotonic() - start_time) * 1000
            result = {
                "content": response.content[0].text,
                "model": selected_model,
                "routing": routing_decision,
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "duration_ms": duration_ms,
            }

            self._record_metric(result)
            return result

        except Exception as e:
            # On failure, escalate to strong model
            if selected_model == self.weak_model:
                response = await client.messages.create(
                    model=self.strong_model,
                    max_tokens=kwargs.get("max_tokens", 1024),
                    system=system or "",
                    messages=messages,
                )
                return {
                    "content": response.content[0].text,
                    "model": self.strong_model,
                    "routing": {**routing_decision, "fallback": True},
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                }
            raise

    def _record_metric(self, result: dict):
        self._metrics.append({
            "model": result["model"],
            "routed_to_strong": result["model"] == self.strong_model,
            "prob_strong": result["routing"].get("prob_strong_needed", 0.5),
            "input_tokens": result["input_tokens"],
            "duration_ms": result["duration_ms"],
        })

    def metrics_summary(self) -> dict:
        if not self._metrics:
            return {}

        strong_calls = [m for m in self._metrics if m["routed_to_strong"]]
        weak_calls = [m for m in self._metrics if not m["routed_to_strong"]]

        return {
            "total_calls": len(self._metrics),
            "strong_fraction": len(strong_calls) / len(self._metrics),
            "avg_strong_tokens": (sum(m["input_tokens"] for m in strong_calls) /
                                   max(len(strong_calls), 1)),
            "avg_weak_tokens": (sum(m["input_tokens"] for m in weak_calls) /
                                  max(len(weak_calls), 1)),
            "estimated_savings_vs_all_strong": self._compute_savings(),
        }

    def _compute_savings(self) -> str:
        """Estimate cost savings vs routing everything to strong model."""
        # Approximate pricing (as of early 2026)
        strong_input_price = 15.0 / 1e6   # $15 per M tokens
        weak_input_price = 0.80 / 1e6     # $0.80 per M tokens

        actual_cost = sum(
            m["input_tokens"] * (strong_input_price if m["routed_to_strong"]
                                  else weak_input_price)
            for m in self._metrics
        )
        all_strong_cost = sum(m["input_tokens"] * strong_input_price for m in self._metrics)

        if all_strong_cost > 0:
            return f"{(1 - actual_cost / all_strong_cost) * 100:.1f}% saved"
        return "N/A"
```

## Cost Modeling: Estimating Savings Before Deployment

Before implementing routing, estimate the savings potential for your specific query distribution:

```python
def estimate_routing_savings(
    query_sample: list[str],
    weak_model_cost_per_token: float,     # Input + output blended
    strong_model_cost_per_token: float,
    estimated_weak_fraction: float = 0.70,  # Fraction you can route to weak
    quality_threshold: float = 0.95,        # Minimum quality vs all-strong
) -> dict:
    """
    Estimate routing savings before building the full router.
    """
    n = len(query_sample)
    avg_tokens = 500   # Estimate for your workload

    # Current cost: all strong
    all_strong_cost = n * avg_tokens * strong_model_cost_per_token

    # Routed cost
    weak_calls = int(n * estimated_weak_fraction)
    strong_calls = n - weak_calls
    routed_cost = (
        weak_calls * avg_tokens * weak_model_cost_per_token +
        strong_calls * avg_tokens * strong_model_cost_per_token
    )

    # Per-call costs
    strong_cost_per_call = avg_tokens * strong_model_cost_per_token
    weak_cost_per_call = avg_tokens * weak_model_cost_per_token

    return {
        "n_queries": n,
        "weak_fraction": estimated_weak_fraction,
        "all_strong_monthly_cost_usd": all_strong_cost * 30,  # Monthly
        "routed_monthly_cost_usd": routed_cost * 30,
        "monthly_savings_usd": (all_strong_cost - routed_cost) * 30,
        "cost_reduction_multiplier": all_strong_cost / routed_cost,
        "strong_per_call_usd": strong_cost_per_call,
        "weak_per_call_usd": weak_cost_per_call,
        "cost_ratio": strong_cost_per_call / weak_cost_per_call,
    }

# Example: 1M daily queries, Claude Opus vs Claude Haiku
print(estimate_routing_savings(
    query_sample=[""] * 1_000_000,   # 1M daily queries
    weak_model_cost_per_token=0.80 / 1e6,   # Haiku
    strong_model_cost_per_token=15.0 / 1e6,  # Opus 4.6
    estimated_weak_fraction=0.70,
))
# Monthly savings: ~$220,000 on 1M daily queries at 500 avg tokens
```

## Key Takeaways

- Model routing achieves 2x cost reduction by sending easy queries (60-70% of typical workloads) to cheap models and hard queries to expensive models. RouteLLM demonstrates this on Chatbot Arena data with negligible quality loss, using lightweight classifiers trained on human preference data.

- Three routing strategies exist with different tradeoffs: semantic routing (embedding similarity to examples, no training needed, brittle to novel types), cascade routing (cheap model first + escalate on uncertainty, self-calibrating but small models don't know what they don't know), and classifier-based routing (highest accuracy, requires training data).

- Classifier-based routers can be bootstrapped without pre-existing labels by running representative queries through both models and using a judge model to label which model's output was meaningfully better. This generates 1,000-5,000 training examples in hours without human annotation.

- Always force a small fraction (5%) of queries to the strong model regardless of routing decision. This creates a quality monitoring sample that detects when the router is systematically misrouting hard queries to the weak model, the most dangerous failure mode in production routing.

- The cost ratio between models (e.g., Claude Opus at $15/M tokens vs Haiku at $0.80/M tokens = 18.75x) is the primary lever: higher ratio means greater savings potential. At 70% weak routing fraction, the cost reduction multiplier is approximately 1 / (0.30 + 0.70 × 1/18.75) ≈ 2.6x savings.

- Routing adds ~5-15ms latency for the routing decision (embedding + classification). This is acceptable for most applications but may not be for latency-sensitive real-time applications with <200ms total budget. Semantic routing with precomputed centroids adds less latency (~2-5ms) than classifier-based approaches (~10-15ms).

## FAQ

### What is LLM model routing and how does it reduce costs?

LLM model routing is a system that dynamically selects which language model to use for each incoming query based on an estimate of the query's complexity. Simple queries (factual lookups, basic formatting, short-answer questions) are routed to cheaper, smaller models (like Claude Haiku or Gemini Flash) that handle them correctly at a fraction of the cost. Complex queries requiring multi-step reasoning, synthesis, or careful judgment are routed to expensive frontier models. The cost reduction comes from the distribution of query complexity: most production queries are routine (60-75%), so routing the majority to cheap models significantly reduces average cost. RouteLLM demonstrates 2x cost reduction while maintaining quality equivalent to routing everything to the strong model, by using a lightweight classifier trained on human preference data.

### What is RouteLLM?

RouteLLM is an open-source LLM routing framework from LMArena (the organization behind Chatbot Arena) that provides trained routers for directing queries between strong and weak language models. RouteLLM trains its routers on human preference data from Chatbot Arena: when human annotators preferred the stronger model's response, the query is labeled "strong model needed"; when they preferred the weak model or couldn't distinguish, the query is labeled "weak model sufficient." The trained classifiers (including logistic regression on embeddings, matrix factorization, and small BERT classifiers) achieve 2x cost reduction at test time by accurately identifying which queries need the strong model and routing only those to the expensive model. The framework supports configurable quality-cost tradeoffs via a threshold parameter.

### How do you measure the quality impact of LLM routing?

Measuring routing quality requires comparing routed query outcomes to all-strong-model outcomes on a held-out evaluation set. The standard approach: (1) Run 500-1,000 evaluation queries through both the routing system and through the strong model only; (2) use a judge model (strongest available) to rate each response on task completion and accuracy; (3) compute the mean quality gap between routed and all-strong baselines; (4) report at different routing thresholds (fraction sent to weak model). A routing system is considered acceptable when the quality gap is under 5% at the target cost reduction level. Additionally, force 5% of production queries to the strong model regardless of routing decision. This creates a continuous quality monitoring sample that detects if the router starts systematically misrouting hard queries.

The model pricing gap between frontier and lightweight models is 15-20x and growing. Frontier model capabilities improve faster than commodity model capabilities, widening the performance gap for hard tasks. The price differential exists because the capability differential exists. Model routing extracts value from this pricing structure: pay frontier prices only for the queries that genuinely need frontier performance.

The implementation investment is modest: 2-3 days of engineering work for a classifier-based router with production monitoring. The savings are immediate and scale linearly with query volume. At $50,000/month on frontier models with 70% routine queries, routing saves approximately $30,000/month.

The quality risk is real but manageable. A miscalibrated router that sends hard queries to cheap models produces bad answers. The mitigation (forcing 5% to the strong model, monitoring quality continuously, setting conservative thresholds initially) turns routing into a controlled optimization. Start at 50% weak routing, measure quality, increase the threshold until you find the accuracy-cost optimum for your workload.

The economics are straightforward. Build the router.
