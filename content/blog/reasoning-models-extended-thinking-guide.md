---
title: "Reasoning Models and Extended Thinking: A Practical Guide to Getting More From o1, Claude, and DeepSeekR1"
description: "For simple tasks like summarization, translation, factual lookup, and basic formatting, reasoning models provide no benefit over standard models at higher cost."
date: "2026-03-29"
tags: ["Dev Tools","reasoning models LLM","extended thinking Claude"]
readTime: "20 min read"
ogImage: "/og/reasoning-models-extended-thinking-guide.png"
canonical: "https://chaitanyaprabuddha.com/blog/reasoning-models-extended-thinking-guide"
published: true
---

Reasoning models are not simply better language models. They are a different tool with different strengths, different failure modes, and prompting conventions that conflict with everything you know about prompting standard LLMs.

The most common mistake when switching from GPT-4 or Claude Sonnet to a reasoning model is over-specifying. With standard LLMs, detailed step-by-step instructions improve output quality. With reasoning models (o1, Claude with extended thinking, DeepSeek-R1), detailed instructions constrain the model's reasoning process and often produce worse results. The model is already going to think step by step. Telling it exactly how to think interferes with that.

The second mistake is using reasoning models for everything. Reasoning models are more expensive and slower than standard models. Asking them to think costs 5-50x more per query depending on the thinking budget. For simple tasks like summarization, translation, factual lookup, and basic formatting, reasoning models provide no benefit over standard models at higher cost.

Working with reasoning models effectively requires different strategies for prompting, thinking budget management, and task selection. The patterns here come from real deployment experience with Claude's extended thinking on agent and analysis tasks, not benchmark optimization.

## What Reasoning Models Actually Are (And How They Work)

Reasoning models are language models trained using reinforcement learning on problems with verifiable correct answers (typically mathematics, formal logic, and code), where the reward signal is whether the final answer is correct, not whether the reasoning looks good. The model learns to explore reasoning paths, backtrack from wrong paths, and find correct answers through search rather than retrieval.

The "extended thinking" output (visible as `<think>...</think>` blocks in some models, or as a separate API field in Claude) is not post-hoc rationalization. It is computation that the model performs before producing its final response. The thinking trace contains the model's search process: partial hypotheses, discovered contradictions, revised approaches, intermediate calculations.

**RLVR training (Reinforcement Learning from Verifiable Rewards)**: The training loop:
1. Present a problem with a verifiable answer
2. Let the model generate a thinking trace + answer
3. Check whether the answer is correct
4. Reward correct answers, penalize incorrect ones
5. Update the policy to generate thinking traces that lead to correct answers

No human labeling of reasoning quality is needed, only binary outcome verification. This makes it scalable to millions of training problems. The model develops "reasoning behaviors" (self-correction, exploration, verification steps) as instrumental strategies for producing correct answers.

The key implication for users: **the model has learned to use its thinking trace as computation**. The thinking trace is not output to be read; it is working memory that the model uses to process the problem. Structuring prompts to constrain the thinking trace (e.g., "think step by step as follows: first A, then B, then C") interferes with this learned capability.

## When Reasoning Models Help and When They Hurt

**Tasks where reasoning models are significantly better:**

| Task | Why reasoning helps | Quality improvement |
|---|---|---|
| Mathematics | Multi-step computation, error checking | +30-50% on hard problems |
| Code debugging | Hypothesis testing, trace execution | +20-35% on complex bugs |
| Formal logic / constraints | Backtracking, consistency checking | +25-40% |
| Long-form analysis | Considering multiple perspectives | +15-25% |
| Planning with dependencies | Constraint satisfaction, ordering | +20-35% |
| Security analysis | Systematic threat modeling | +25-40% |

**Tasks where reasoning models provide no benefit or hurt:**

| Task | Why reasoning doesn't help | Recommended model |
|---|---|---|
| Simple factual questions | Answer is immediate, no search needed | Standard fast model |
| Translation | No reasoning; fluency/accuracy are training-based | Standard model |
| Summarization | Extraction task, not reasoning | Standard model |
| Format conversion | Direct transformation | Standard model |
| Casual conversation | Reasoning overhead makes responses stilted | Standard model |
| Creative writing | Reasoning constrains creativity | Standard model without CoT |

**The cost calculation before choosing a reasoning model:**

```python
def should_use_reasoning_model(
    task_type: str,
    quality_requirement: float,    # 0-1: how important is quality?
    latency_budget_ms: float,      # Maximum acceptable latency
    cost_multiplier_acceptance: float = 10.0,  # How much more are you willing to pay?
) -> dict:
    """Simple heuristic for reasoning model selection."""

    reasoning_task_types = {
        "mathematics", "formal_logic", "code_debugging", "security_analysis",
        "constraint_planning", "multi_step_analysis", "theorem_proving",
    }

    standard_task_types = {
        "translation", "summarization", "classification", "extraction",
        "creative_writing", "factual_qa", "formatting", "casual_chat",
    }

    use_reasoning = (
        task_type in reasoning_task_types
        and quality_requirement > 0.85        # High quality required
        and latency_budget_ms > 5000          # Can tolerate 5+ second response
    )

    return {
        "use_reasoning_model": use_reasoning,
        "reason": (
            f"Task type '{task_type}' benefits from reasoning"
            if task_type in reasoning_task_types
            else f"Task type '{task_type}' does not benefit from extended thinking"
        ),
        "estimated_cost_multiplier": 15 if use_reasoning else 1,
        "estimated_latency_ms": 8000 if use_reasoning else 500,
    }
```

## Prompting Patterns That Work for Reasoning Models

The core prompting principle for reasoning models is to **state the goal clearly, minimize the method constraints**. The model will figure out how to think about the problem. Your job is to ensure it has the right goal, the right context, and clear evaluation criteria.

**What to include in your prompt:**
- Clear, unambiguous statement of what you want
- All relevant context and constraints
- Success criteria (what does a good answer look like?)
- Any constraints on the answer (format, scope, time)

**What to omit from your prompt:**
- Step-by-step instructions on how to reason
- "Think step by step" (it will; don't instruct it)
- Intermediate steps you want to see
- Instructions about the thinking process

**Bad (standard LLM pattern applied to reasoning model):**

```
You are an expert security researcher. Think step by step.

First, analyze the authentication flow:
1. Identify input validation points
2. Check for injection possibilities
3. Verify session management
4. Test for privilege escalation

Then provide your findings.

Here is the code: [code]
```

**Good (reasoning model pattern):**

```
Perform a security review of this authentication implementation.
Identify all potential vulnerabilities, rated by severity (Critical/High/Medium/Low).
For each vulnerability, provide: the code location, the attack vector, and a remediation.

Here is the code: [code]
```

The good version gives the model freedom to reason about the problem however it finds most productive. The step-by-step constraint in the bad version may cause the model to follow the specified steps even when its reasoning would find a different, better path.

**Useful prompt elements specific to reasoning models:**

1. **Explicit uncertainty elicitation**: "If you are uncertain about any aspect of your analysis, say so explicitly."

2. **Constraint satisfaction format**: For planning problems, state constraints as explicit requirements: "The solution must satisfy all of these constraints: [list]. If any constraint cannot be satisfied simultaneously, explain which tradeoff you are making and why."

3. **Confidence in conclusions**: "Rate your confidence in the final conclusion: High/Medium/Low, and explain what would change the conclusion."

```python
# Effective reasoning model prompts for different task types

SECURITY_ANALYSIS_PROMPT = """Analyze the security of this code.

Requirements:
- Identify all security vulnerabilities you find
- Rate each: Critical, High, Medium, Low
- For each vulnerability: location, attack vector, exploitability, remediation
- If you find no vulnerabilities, state this explicitly with your confidence level
- Do not miss edge cases in input handling

Code:
{code}"""

MATH_PROBLEM_PROMPT = """Solve this problem and verify your solution.

Problem: {problem}

Requirements:
- Show your work
- Check your answer by substituting back or using a different approach
- If the problem is ambiguous, state which interpretation you used and why
- Express your answer as: {answer_format}"""

ARCHITECTURE_DECISION_PROMPT = """Evaluate these architecture options for our system.

Context: {system_context}

Options: {options}

Requirements:
- Evaluate each option against these criteria: {criteria}
- Consider failure modes and recovery paths
- Give a clear recommendation with tradeoffs
- State what information would change your recommendation"""
```

## Managing the Thinking Budget

Reasoning models have a configurable thinking budget: the number of tokens available for internal reasoning before generating the output. More tokens = more compute = higher cost + better performance on hard problems.

The thinking budget decision is not "use maximum tokens." Calibrate to task difficulty.

```python
def select_thinking_budget(task_difficulty: str, max_answer_tokens: int = 2000) -> int:
    """
    Select thinking budget based on task difficulty.
    Calibrated from empirical testing. Adjust for your workload.
    """
    budgets = {
        "simple":      1024,    # Simple arithmetic, basic logic
        "medium":      4096,    # Multi-step math, code debugging
        "hard":       16000,    # Complex proofs, multi-constraint planning
        "very_hard":  32000,    # Extended analysis, complex security research
    }
    return budgets.get(task_difficulty, 4096)

async def call_with_calibrated_thinking(
    problem: str,
    task_difficulty: str = "medium",
    model: str = "claude-opus-4-6",
) -> dict:
    """
    Call Claude with calibrated thinking budget.
    """
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic()

    budget = select_thinking_budget(task_difficulty)

    response = await client.messages.create(
        model=model,
        max_tokens=budget + 4096,  # Total: thinking + answer
        thinking={
            "type": "enabled",
            "budget_tokens": budget,
        },
        messages=[{"role": "user", "content": problem}],
    )

    thinking_content = ""
    answer_content = ""

    for block in response.content:
        if block.type == "thinking":
            thinking_content = block.thinking
        elif block.type == "text":
            answer_content = block.text

    thinking_tokens_approx = len(thinking_content.split()) * 1.3  # Rough token estimate

    return {
        "answer": answer_content,
        "thinking_preview": thinking_content[:500] + "...",  # First 500 chars for logging
        "thinking_budget": budget,
        "thinking_tokens_used_approx": thinking_tokens_approx,
        "thinking_budget_utilization": thinking_tokens_approx / budget,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
    }
```

**When to increase the thinking budget:**
- The model reaches a wrong answer with low thinking utilization; it may not have explored enough paths
- The model expresses uncertainty in its final answer ("I'm not sure if...")
- You observe the thinking trace ending abruptly without resolution

**When to decrease the thinking budget:**
- The thinking trace fills with circular reasoning or repetitive exploration
- The thinking utilization is consistently below 40%; the model doesn't need the budget
- The problem is easy (validate by running with reduced budget and checking quality)

**Thinking budget calibration workflow:**

```python
async def calibrate_budget_for_task_type(
    sample_problems: list[str],
    ground_truth: list[str],
    budgets_to_test: list[int] = [1024, 4096, 16000, 32000],
    model: str = "claude-opus-4-6",
) -> dict:
    """
    Find the minimum thinking budget that achieves target quality.
    """
    import json
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic()

    results = {}

    for budget in budgets_to_test:
        correct = 0
        total_thinking_tokens = 0

        for problem, truth in zip(sample_problems, ground_truth):
            response = await client.messages.create(
                model=model,
                max_tokens=budget + 2000,
                thinking={"type": "enabled", "budget_tokens": budget},
                messages=[{"role": "user", "content": problem}],
            )

            answer = next((b.text for b in response.content if b.type == "text"), "")
            thinking = next((b.thinking for b in response.content if b.type == "thinking"), "")

            if truth.lower() in answer.lower():
                correct += 1
            total_thinking_tokens += len(thinking.split()) * 1.3

        accuracy = correct / len(sample_problems)
        results[budget] = {
            "accuracy": accuracy,
            "avg_thinking_tokens": total_thinking_tokens / len(sample_problems),
        }

    # Find minimum budget achieving target accuracy
    target_accuracy = max(r["accuracy"] for r in results.values()) * 0.97  # 97% of best
    optimal_budget = min(
        (b for b, r in results.items() if r["accuracy"] >= target_accuracy),
        key=lambda b: b,
    )

    return {"calibration_results": results, "optimal_budget": optimal_budget}
```

## Claude Extended Thinking: API and Implementation

Claude's extended thinking API (Claude 3.7 Sonnet and Claude Opus 4.6) exposes the thinking process directly.

```python
from anthropic import Anthropic

client = Anthropic()

def analyze_with_extended_thinking(
    problem: str,
    budget_tokens: int = 10000,
    model: str = "claude-opus-4-6",
) -> dict:
    """
    Use Claude's extended thinking for complex analysis.
    Returns both the thinking trace and final answer.
    """
    response = client.messages.create(
        model=model,
        max_tokens=budget_tokens + 8192,
        thinking={
            "type": "enabled",
            "budget_tokens": budget_tokens,
        },
        messages=[{
            "role": "user",
            "content": problem,
        }],
    )

    result = {
        "thinking": [],
        "answer": "",
        "usage": {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        }
    }

    for block in response.content:
        if block.type == "thinking":
            result["thinking"].append(block.thinking)
        elif block.type == "text":
            result["answer"] = block.text

    result["thinking_combined"] = "\n\n".join(result["thinking"])

    return result

# Multi-turn conversation with thinking preserved
def build_thinking_conversation(
    system: str,
    turns: list[dict],
    budget_tokens: int = 10000,
    model: str = "claude-opus-4-6",
) -> list[dict]:
    """
    Build a multi-turn conversation preserving thinking blocks.
    Thinking blocks must be preserved in conversation history for continuity.
    """
    client = Anthropic()
    messages = []

    for turn in turns:
        messages.append({"role": "user", "content": turn["user"]})

        response = client.messages.create(
            model=model,
            max_tokens=budget_tokens + 4096,
            system=system,
            thinking={"type": "enabled", "budget_tokens": budget_tokens},
            messages=messages,
        )

        # Preserve the full content list including thinking blocks
        messages.append({"role": "assistant", "content": response.content})

    return messages
```

**Extended thinking best practices specific to Claude:**

1. **Use extended thinking with multi-turn conversations:** Claude uses the thinking trace from previous turns to inform current reasoning. Preserving the full content list (including thinking blocks) enables more coherent multi-step analysis.

2. **Don't summarize the thinking trace for the model:** Some developers try to compress previous thinking by summarizing it in the user message. This loses the token-level fidelity the model needs for continuation.

3. **Budget_tokens is a maximum, not a guarantee:** If the problem is simple, Claude will use far fewer thinking tokens than the budget allows. Monitor usage and calibrate accordingly.

## DeepSeekR1 and Open Reasoning Models

DeepSeek-R1 (January 2025) is an open-weights reasoning model trained using RLVR, releasing both the full model and distilled versions (1.5B to 70B parameters). The R1 series made reasoning model capabilities accessible to teams that need to run models locally or need lower cost per query than commercial API pricing.

**R1 architecture and training:** DeepSeek-R1 uses cold-start supervised fine-tuning (on a small set of manually verified reasoning chains) followed by large-scale RLVR on mathematics and code problems. The training produces emergent "reasoning behaviors" including:

- **Self-verification:** the model checks its work before finalizing answers
- **Backtracking:** explicitly revisiting and revising intermediate conclusions
- **Multi-path exploration:** considering alternative approaches before committing

**Using DeepSeek-R1 via API or locally:**

```python
# Via DeepSeek API (cloud)
from openai import OpenAI  # DeepSeek API is OpenAI-compatible

deepseek_client = OpenAI(
    api_key="your_deepseek_api_key",
    base_url="https://api.deepseek.com/v1",
)

def reason_with_r1(problem: str, temperature: float = 0.6) -> dict:
    """
    Call DeepSeek-R1 for complex reasoning.
    Temperature 0.6 is recommended for reasoning tasks.
    """
    response = deepseek_client.chat.completions.create(
        model="deepseek-reasoner",   # R1 model
        messages=[{"role": "user", "content": problem}],
        temperature=temperature,
    )

    message = response.choices[0].message

    return {
        "thinking": getattr(message, "reasoning_content", ""),
        "answer": message.content,
        "input_tokens": response.usage.prompt_tokens,
        "output_tokens": response.usage.completion_tokens,
    }

# Via Ollama (local deployment) with R1 distilled models
def reason_with_r1_local(
    problem: str,
    model: str = "deepseek-r1:32b",  # Or deepseek-r1:7b for lower hardware requirements
) -> dict:
    """Run DeepSeek-R1 distilled model locally via Ollama."""
    import requests

    response = requests.post("http://localhost:11434/api/generate", json={
        "model": model,
        "prompt": problem,
        "stream": False,
        "options": {"temperature": 0.6, "num_predict": 4096},
    })

    raw = response.json()["response"]

    # R1 uses <think>...</think> markers for reasoning
    import re
    thinking_match = re.search(r"<think>(.*?)</think>", raw, re.DOTALL)
    thinking = thinking_match.group(1).strip() if thinking_match else ""
    answer = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()

    return {"thinking": thinking, "answer": answer}
```

**R1 distilled models performance vs size:**

| Model | AIME 2024 | MATH 500 | HumanEval | Memory (bf16) |
|---|---|---|---|---|
| DeepSeek-R1 671B | 79.8% | 97.3% | 92.2% | ~1.3 TB |
| DeepSeek-R1-Distill-70B | 70.0% | 94.5% | 86.7% | ~140 GB |
| DeepSeek-R1-Distill-32B | 72.6% | 94.3% | 83.1% | ~64 GB |
| DeepSeek-R1-Distill-14B | 69.7% | 93.9% | 76.8% | ~28 GB |
| DeepSeek-R1-Distill-8B  | 50.4% | 89.1% | 68.3% | ~16 GB |
| DeepSeek-R1-Distill-1.5B | 28.9% | 72.0% | 45.1% | ~3 GB |

The 32B distilled model is the practical sweet spot for teams running locally. It fits on 2× RTX 4090 (quantized), provides 72.6% AIME accuracy (competitive with GPT-4o), and runs at 15-25 tok/s on modern GPUs.

## Evaluating Whether Reasoning Is Helping

```python
async def compare_reasoning_vs_standard(
    problems: list[str],
    ground_truths: list[str],
    standard_model: str = "claude-haiku-4-5-20251001",
    reasoning_model: str = "claude-opus-4-6",
    thinking_budget: int = 10000,
    n_trials: int = 3,
) -> dict:
    """
    Compare reasoning model vs standard model on a problem set.
    Run multiple trials to measure consistency.
    """
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic()

    standard_results = []
    reasoning_results = []

    for problem, truth in zip(problems, ground_truths):
        # Standard model
        std_trials = []
        for _ in range(n_trials):
            resp = await client.messages.create(
                model=standard_model,
                max_tokens=1024,
                messages=[{"role": "user", "content": problem}],
            )
            answer = resp.content[0].text
            std_trials.append(truth.lower() in answer.lower())

        # Reasoning model
        reas_trials = []
        for _ in range(n_trials):
            resp = await client.messages.create(
                model=reasoning_model,
                max_tokens=thinking_budget + 2000,
                thinking={"type": "enabled", "budget_tokens": thinking_budget},
                messages=[{"role": "user", "content": problem}],
            )
            answer = next((b.text for b in resp.content if b.type == "text"), "")
            reas_trials.append(truth.lower() in answer.lower())

        standard_results.append({
            "accuracy": sum(std_trials) / n_trials,
            "pass_k": all(std_trials),
        })
        reasoning_results.append({
            "accuracy": sum(reas_trials) / n_trials,
            "pass_k": all(reas_trials),
        })

    std_acc = sum(r["accuracy"] for r in standard_results) / len(standard_results)
    reas_acc = sum(r["accuracy"] for r in reasoning_results) / len(reasoning_results)

    return {
        "standard_accuracy": std_acc,
        "reasoning_accuracy": reas_acc,
        "quality_improvement": reas_acc - std_acc,
        "reasoning_worth_it": (reas_acc - std_acc) > 0.05,  # 5% threshold
        "cost_multiplier_estimate": 15,  # Approximate for this budget
        "quality_per_dollar": (reas_acc - std_acc) / (15 - 1),  # Marginal quality per marginal cost
    }
```

**The decision rule**: If reasoning model accuracy exceeds standard model accuracy by more than 5% on your task type, and cost is acceptable, use reasoning. If the improvement is under 5%, the reasoning overhead is not justified.

## Failure Modes Specific to Reasoning Models

**1. Overthinking simple problems:** For simple questions, reasoning models may spend thousands of tokens on elaborate analysis and then produce an overly hedged, caveat-laden answer that is worse than a simple direct answer from a standard model. Sign: the thinking trace spends more time considering edge cases than the core problem.

**2. Confirmation bias in thinking trace:** The model may decide on an answer early in the thinking trace and then rationalize it rather than searching. The thinking trace looks like reasoning but is motivated reasoning. Sign: the answer in the thinking trace appears early and subsequent thinking is all justification.

**3. Unnecessary verbosity in final answer:** Reasoning models sometimes produce longer final answers than needed, describing their reasoning process rather than giving the answer directly. Standard prompting: "Give a concise answer. Your thinking is internal. The answer should be direct."

**4. Hallucinated intermediate steps:** In long reasoning chains, especially on factual claims within mathematical reasoning, the model may hallucinate a number or fact that is used in subsequent steps. The final answer looks well-reasoned but is based on a fabricated intermediate.

**5. Reasoning that ignores provided context:** Models trained heavily on mathematical reasoning may try to re-derive answers from first principles even when the context provides the answer. Mitigation: explicitly state "Use the provided context to answer. Do not derive independently."

## Key Takeaways

- Reasoning models are trained with RLVR (reinforcement learning on verifiable rewards) which teaches them to search for correct answers through their thinking trace, not retrieve cached patterns. The thinking trace is computation, not narration. Constraining it with step-by-step instructions hurts performance.

- Use reasoning models for tasks with hard correctness criteria: mathematics, formal logic, code debugging, multi-constraint planning, security analysis. Do not use them for tasks where the answer is direct: translation, summarization, casual conversation, simple factual queries. The cost multiplier (10-50x) is justified only when quality improvement is significant (over 5%).

- Thinking budget calibration is essential. For most reasoning tasks, 4,000-8,000 tokens is sufficient. Problems that are genuinely hard may need 16,000-32,000 tokens. Monitor thinking_budget_utilization: if consistently below 40%, reduce the budget. If the model reaches wrong answers with full budget utilization, the problem may require a different approach, not more thinking tokens.

- DeepSeek-R1 distilled models provide accessible reasoning capabilities for teams needing local deployment or lower API costs. The 32B distilled model achieves 72.6% AIME 2024 accuracy (competitive with GPT-4o) and fits on 2× RTX 4090 in quantized form. Distillation successfully transfers reasoning capabilities to smaller models.

- Extended thinking multi-turn conversations require preserving the full content list including thinking blocks in conversation history. Summarizing previous thinking into user messages degrades performance: the model uses the token-level thinking content, not a summary of it.

- The primary failure mode to watch for is reasoning model overthinking: spending large thinking budgets on analysis, then producing overly hedged answers worse than what a standard model would give. Monitor for this pattern by comparing reasoning model output on your easy tasks against standard model output.

## FAQ

### What is extended thinking in Claude and how does it work?

Extended thinking in Claude is a feature that enables the model to generate an internal reasoning trace before producing its final response. The thinking trace is allocated a configurable token budget (up to 32,000+ tokens) and contains the model's working through of the problem: exploring hypotheses, catching errors, considering alternatives, and verifying conclusions. This thinking trace is not shown to end users by default but is available via the API. It is computation, not post-hoc rationalization. The model's final answer is directly conditioned on the thinking trace, and changes to the thinking trace (if artificially modified) change the final answer. The thinking budget is controllable: allocating more tokens allows more extensive reasoning on hard problems, at proportionally higher cost.

### When should I use a reasoning model vs a standard LLM?

Use a reasoning model when the task has a verifiable correct answer (mathematics, code debugging, formal logic), the task requires multi-step reasoning where errors compound, or quality is critical enough to justify 10-50x higher cost. Do not use a reasoning model when the task is straightforward (translation, summarization, factual lookup), latency below 2 seconds is required, or cost is the primary constraint. The practical test: run your task on both a standard model and a reasoning model on 20-30 representative examples. If the reasoning model improves accuracy by more than 5%, the quality gain justifies the cost for high-stakes tasks. For most production applications, routing the top 10-20% of difficult queries to reasoning models while handling the majority with standard models is the economically optimal approach.

### How do you prompt o1 and reasoning models differently from standard LLMs?

The key difference is removing method constraints and trusting the model's reasoning process. For standard LLMs, prompts often specify the reasoning approach: "Think step by step. First analyze A, then B, then C." This helps because standard models don't automatically reason. The prompt scaffolds their process. Reasoning models have already learned to reason; constraining their process with your preferred steps interferes with their learned search strategies. For reasoning models, state the goal clearly and let the model determine the approach: what you want, what context is relevant, what the success criteria are, and what format the answer should take. Omit instructions about the reasoning process. The exception: constraint statements are helpful ("all three of these constraints must be satisfied simultaneously") because they define the problem space, not the reasoning process.

Reasoning models are the most significant capability shift in the LLM landscape since the introduction of instruction tuning. RLVR training produces models that search for correct answers rather than pattern-matching to training distributions. For hard problems with verifiable answers, the quality improvement over standard models is large and real.

The practical challenge is that everything making reasoning models better at hard problems makes them worse as drop-in replacements for standard models. The prompting conventions are different. The cost structure is different. The task fit is narrower. Using a reasoning model for everything is like using a specialized tool for general work: expensive and often counterproductive.

The optimal deployment pattern is the one I use on EdgeLM and Authos: route the small fraction of hard queries to reasoning models (5-15% of production traffic), handle the majority with fast standard models, and monitor quality continuously to adjust the routing threshold. The reasoning model handles the tail of hard queries where its capabilities matter; the standard model handles the bulk where its lower latency and cost matter more than marginal quality.

The thinking trace is one of the most underused features in the reasoning model API. Reading what the model thought about your problem (not its final answer but its search process) is often more valuable than the answer itself for understanding where your task is difficult and where your prompts are underspecified.
