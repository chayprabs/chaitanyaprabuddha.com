---
title: "Best-of-N for Coding Agents: Smarter AI Solutions"
description: "Learn how Best-of-N sampling helps coding agents solve harder tasks by exploring multiple candidate solutions."
date: "2026-04-02"
tags: ["coding agents","best-of-n","codex","ai coding","test-time compute","agent workflows","multiple solutions","exploration strategies"]
readTime: "33 min read"
ogImage: "/og/best-of-n-for-coding-agents.png"
canonical: "https://chaitanyaprabuddha.com/blog/best-of-n-for-coding-agents"
published: true
---

# Best-of-N for Coding Agents: How Multiple Candidate Solutions Unlock Harder Tasks

When a coding agent tackles a difficult bug or a complex feature, the first solution it generates is not always the best one. **Codex Best of N** is a strategy that lets you generate **multiple agent responses**, score them, and keep the winner. Instead of hoping a single roll of the dice lands perfectly, you roll several times and pick the highest number.

This approach is rapidly becoming a core pattern in **AI coding workflows**. The reason is simple: on hard problems, the gap between a single attempt and the best of several attempts can be the difference between a working patch and a broken one. If you have ever watched a **coding agent exploration** run into a dead end, only to wish it had tried a different approach, Best-of-N is the systematic answer to that wish.

In this post, we will cover exactly what Best-of-N means in the context of coding agents, why it works so well, how to implement it yourself with concrete code examples, and where the entire approach is heading in 2026 and beyond.

## Table of Contents

- [What Is Best-of-N Sampling?](#what-is-best-of-n-sampling)
- [Why Coding Agents Need Multiple Attempts](#why-coding-agents-need-multiple-attempts)
- [The Math: Why Best-of-N Works](#the-math-why-best-of-n-works)
- [Best-of-N vs. Other Exploration Strategies](#best-of-n-vs-other-exploration-strategies)
- [Implementing Best-of-N for Coding Tasks](#implementing-best-of-n-for-coding-tasks)
- [Scoring and Selection: Choosing the Winner](#scoring-and-selection-choosing-the-winner)
- [Best-of-N with OpenAI Codex](#best-of-n-with-openai-codex)
- [Best-of-N with Claude Code and Anthropic](#best-of-n-with-claude-code-and-anthropic)
- [Best-of-N with Open-Source Agents](#best-of-n-with-open-source-agents)
- [Cost Management and Practical Trade-Offs](#cost-management-and-practical-trade-offs)
- [Advanced Patterns: Adaptive and Hierarchical Best-of-N](#advanced-patterns-adaptive-and-hierarchical-best-of-n)
- [Real-World Results and Benchmarks](#real-world-results-and-benchmarks)
- [Common Pitfalls and How to Avoid Them](#common-pitfalls-and-how-to-avoid-them)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Key Takeaways](#key-takeaways)

## What Is Best-of-N Sampling?

Best-of-N sampling is a technique where you generate N independent candidate solutions for a single task, evaluate each one against a quality criterion, and select the best result. It is one of the simplest and most effective ways to scale **test-time compute** for language models.

The concept originates from reinforcement learning and statistics, where it is sometimes called "rejection sampling" or "cherry-picking." In the context of coding agents, it means running the same agent prompt N times, each time in a fresh sandbox, and then using a scoring function to decide which output to keep.

### How It Differs from Retries

A naive retry loop re-runs a failed attempt. Best-of-N is fundamentally different because every candidate runs to completion, even if the first one succeeds. You are not retrying on failure; you are exploring the solution space in parallel.

This distinction matters. A retry strategy only improves outcomes when the first attempt fails outright. Best-of-N improves outcomes even when every attempt "works" because it selects the highest-quality solution among all candidates.

### The Core Loop

At its simplest, the Best-of-N loop looks like this:

```python
import asyncio
from dataclasses import dataclass

@dataclass
class CandidateSolution:
    code_diff: str
    test_results: dict
    score: float

async def best_of_n(task: str, n: int, agent_fn, score_fn) -> CandidateSolution:
    """Generate N candidate solutions and return the best one."""
    # Launch all candidates in parallel
    candidates = await asyncio.gather(
        *[agent_fn(task) for _ in range(n)]
    )

    # Score each candidate
    scored = []
    for candidate in candidates:
        score = await score_fn(candidate)
        scored.append(CandidateSolution(
            code_diff=candidate.diff,
            test_results=candidate.tests,
            score=score,
        ))

    # Return the highest-scoring candidate
    return max(scored, key=lambda c: c.score)
```

That is the entire pattern. Everything else in this post is about making each piece -- the agent function, the scoring function, and the orchestration -- work well in practice.

## Why Coding Agents Need Multiple Attempts

Coding tasks are uniquely suited to Best-of-N because they have a natural, automatable verification step: **running tests**. Unlike open-ended text generation where quality is subjective, a code patch either passes the test suite or it does not.

### The Variance Problem

Even the best coding agents exhibit significant variance on hard tasks. On the SWE-bench Verified benchmark, the top-performing agents in early 2026 solve roughly 70-77% of issues in a single attempt. That means for nearly a quarter of real-world GitHub issues, one try is not enough.

But here is the interesting part: the probability that *at least one* of N independent attempts succeeds grows dramatically with N. If a single attempt has a 50% chance of solving a problem, three attempts give you an 87.5% chance. Five attempts push you to 96.9%.

### Why the First Answer Is Often Not the Best

Large language models sample from a probability distribution. Every generation involves randomness. Two runs of the same prompt can produce substantially different approaches: one might refactor a function, another might add a conditional guard, and a third might restructure the entire module.

Each approach has different trade-offs in terms of correctness, readability, performance, and maintainability. **Multiple agent responses** let you evaluate these trade-offs systematically rather than accepting whatever the model happened to sample first.

### Real-World Motivation

Consider a scenario where your coding agent needs to fix a race condition in a concurrent system. There are at least three valid strategies: add a mutex, switch to a channel-based design, or restructure the code to eliminate shared state entirely. A single agent run will pick one. Best-of-N lets the agent explore multiple strategies and lets your scoring function pick the one that best fits your codebase's patterns.

## The Math: Why Best-of-N Works

Understanding the probability behind Best-of-N helps you decide how many candidates to generate. The math is straightforward but the implications are powerful.

### Pass@k and Success Probability

If a single attempt has probability *p* of solving a task, the probability that at least one of *k* independent attempts succeeds is:

```
P(at least one success in k attempts) = 1 - (1 - p)^k
```

Here is what this looks like for different values of *p* and *k*:

| Single-attempt success rate (p) | N=1  | N=3   | N=5   | N=10  | N=20  |
|---------------------------------|------|-------|-------|-------|-------|
| 10%                             | 10%  | 27.1% | 41.0% | 65.1% | 87.8% |
| 25%                             | 25%  | 57.8% | 76.3% | 94.4% | 99.7% |
| 50%                             | 50%  | 87.5% | 96.9% | 99.9% | ~100% |
| 75%                             | 75%  | 98.4% | 99.9% | ~100% | ~100% |

The takeaway: **Best-of-N provides the largest absolute improvement on problems where the single-attempt success rate is moderate** (25-50%). For trivially easy problems, one attempt is enough. For impossibly hard problems where p is near zero, even 20 attempts will not help much.

### Diminishing Returns

The marginal value of each additional candidate decreases. Going from N=1 to N=3 is a massive jump. Going from N=10 to N=20 yields diminishing returns. This has direct implications for cost efficiency, which we will discuss later.

### Beyond Binary Pass/Fail

The math above assumes binary outcomes (pass or fail). In practice, Best-of-N is even more valuable when you have a continuous quality score. Even if all N candidates "pass" the tests, they may differ in code quality, performance, or adherence to project conventions. Selecting the best among passing candidates yields compounding improvements.

## Best-of-N vs. Other Exploration Strategies

Best-of-N is not the only way to help coding agents explore. Understanding the alternatives clarifies when Best-of-N is the right choice.

### Sequential Retry with Feedback

In this approach, the agent makes one attempt, observes the result (including any test failures or errors), and tries again with that feedback. This is essentially iterative refinement.

**Strengths:** Each subsequent attempt is informed by previous failures. Token-efficient because later attempts build on earlier context.

**Weaknesses:** The agent can get stuck in local optima. If the first approach was fundamentally wrong, iterative refinement may just polish a bad idea. Earlier errors can bias later attempts.

### Tree Search (MCTS and Variants)

Monte Carlo Tree Search and related methods build a branching tree of partial solutions, expanding the most promising branches. Research like MCTSr has shown strong results on mathematical reasoning tasks.

**Strengths:** Efficient exploration of the solution space. Can backtrack from dead ends.

**Weaknesses:** Requires a good evaluation function at intermediate steps, which is hard for coding tasks where you often cannot test a half-written patch. Significantly more complex to implement.

### Best-of-N with Iterative Refinement (Hybrid)

The most effective approach often combines Best-of-N with refinement. Generate N candidates in parallel, then take the top K and give each one another round of refinement with test feedback.

```python
async def hybrid_best_of_n(task: str, n: int, top_k: int, agent_fn, refine_fn, score_fn):
    """Best-of-N with a refinement phase for top candidates."""
    # Phase 1: Generate N diverse candidates
    candidates = await asyncio.gather(
        *[agent_fn(task) for _ in range(n)]
    )
    scored = [(c, await score_fn(c)) for c in candidates]
    scored.sort(key=lambda x: x[1], reverse=True)

    # Phase 2: Refine top-K candidates
    top_candidates = [c for c, _ in scored[:top_k]]
    refined = await asyncio.gather(
        *[refine_fn(c, task) for c in top_candidates]
    )

    # Phase 3: Final scoring
    final_scored = [(r, await score_fn(r)) for r in refined]
    return max(final_scored, key=lambda x: x[1])
```

This hybrid approach gives you the breadth of Best-of-N in the first phase and the depth of iterative refinement in the second.

### When to Use Each Strategy

| Strategy | Best for | Avoid when |
|----------|----------|------------|
| Best-of-N | Hard tasks with binary verification, ample compute budget | Trivially easy tasks, very tight cost constraints |
| Sequential retry | Tasks where error messages are informative, cost-sensitive scenarios | Agent gets stuck in loops, fundamentally wrong approach |
| Tree search | Mathematical reasoning, problems with evaluable intermediate states | Complex coding tasks with no partial evaluation |
| Hybrid | Mission-critical tasks, SWE-bench-style complex bugs | Simple tasks where one attempt usually works |

## Implementing Best-of-N for Coding Tasks

Let us build a practical Best-of-N system for coding agents from the ground up. The key components are: sandboxed execution, parallel orchestration, and a robust scoring pipeline.

### Setting Up Sandboxed Environments

Each candidate needs its own isolated environment so that one attempt's file changes do not interfere with another. Docker containers are the standard approach.

```yaml
# docker-compose.yml for Best-of-N candidate environments
version: "3.8"
services:
  candidate-template:
    build: .
    volumes:
      - ./repo:/workspace:ro  # Read-only source mount
    tmpfs:
      - /workspace-writable:size=2G
    environment:
      - CANDIDATE_ID=${CANDIDATE_ID}
    command: >
      bash -c "
        cp -r /workspace/* /workspace-writable/ &&
        cd /workspace-writable &&
        exec agent-runner --task '${TASK_DESCRIPTION}'
      "
```

For cloud-native setups, most coding agent platforms already provide sandboxed environments. OpenAI Codex runs each task in its own cloud sandbox. Claude Code can be run in isolated Docker containers or cloud sessions.

### The Orchestration Layer

Here is a more complete orchestration implementation that handles timeouts, failures, and logging:

```python
import asyncio
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

class BestOfNOrchestrator:
    def __init__(
        self,
        n: int = 5,
        timeout_seconds: int = 600,
        max_concurrent: int = 5,
    ):
        self.n = n
        self.timeout = timeout_seconds
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def _run_candidate(self, task: str, candidate_id: int, agent_fn):
        """Run a single candidate with timeout and error handling."""
        async with self.semaphore:
            start = time.time()
            try:
                result = await asyncio.wait_for(
                    agent_fn(task, candidate_id=candidate_id),
                    timeout=self.timeout,
                )
                elapsed = time.time() - start
                logger.info(f"Candidate {candidate_id} completed in {elapsed:.1f}s")
                return result
            except asyncio.TimeoutError:
                logger.warning(f"Candidate {candidate_id} timed out")
                return None
            except Exception as e:
                logger.error(f"Candidate {candidate_id} failed: {e}")
                return None

    async def run(self, task: str, agent_fn, score_fn) -> Optional[dict]:
        """Execute Best-of-N and return the best candidate."""
        logger.info(f"Starting Best-of-N with N={self.n} for task: {task[:80]}...")

        # Launch all candidates
        results = await asyncio.gather(
            *[
                self._run_candidate(task, i, agent_fn)
                for i in range(self.n)
            ]
        )

        # Filter out failures
        valid = [r for r in results if r is not None]
        if not valid:
            logger.error("All candidates failed")
            return None

        logger.info(f"{len(valid)}/{self.n} candidates completed successfully")

        # Score and rank
        scored = []
        for result in valid:
            score = await score_fn(result)
            scored.append({"result": result, "score": score})

        scored.sort(key=lambda x: x["score"], reverse=True)

        winner = scored[0]
        logger.info(f"Best candidate score: {winner['score']:.3f}")
        return winner["result"]
```

### Ensuring Diversity Across Candidates

A critical factor in Best-of-N effectiveness is **diversity among candidates**. If all N attempts produce essentially the same solution, you gain nothing from running multiple.

There are several strategies to promote diversity:

**Temperature variation:** Run each candidate with a slightly different temperature setting.

```python
async def diverse_agent_fn(task: str, candidate_id: int):
    """Agent function with temperature variation for diversity."""
    temperatures = [0.3, 0.5, 0.7, 0.9, 1.0]
    temp = temperatures[candidate_id % len(temperatures)]

    return await call_agent(
        task=task,
        temperature=temp,
        system_prompt=BASE_SYSTEM_PROMPT,
    )
```

**Prompt variation:** Give each candidate slightly different instructions or hints about the approach to take.

```python
APPROACH_HINTS = [
    "Try to solve this with minimal changes to existing code.",
    "Consider whether a refactoring approach might be cleaner here.",
    "Focus on adding proper error handling as part of your fix.",
    "Look for the root cause rather than patching the symptom.",
    "Consider edge cases that the current tests might not cover.",
]

async def diverse_prompt_agent(task: str, candidate_id: int):
    hint = APPROACH_HINTS[candidate_id % len(APPROACH_HINTS)]
    augmented_task = f"{task}\n\nApproach hint: {hint}"
    return await call_agent(task=augmented_task)
```

**Model variation:** Use different models for different candidates. One candidate might use Claude Opus, another might use GPT-4.1, and a third might use Gemini. This produces maximally diverse solutions.

## Scoring and Selection: Choosing the Winner

The scoring function is arguably the most important part of the Best-of-N pipeline. A bad scoring function can pick the worst candidate out of five good ones.

### Test-Based Scoring

The simplest and most reliable signal: does the code pass the tests?

```python
async def test_based_score(candidate) -> float:
    """Score based on test pass rate."""
    test_result = await run_test_suite(candidate.workspace)

    if test_result.all_passed:
        return 1.0

    pass_rate = test_result.passed / test_result.total
    return pass_rate
```

This works well for SWE-bench-style tasks where the test suite is comprehensive. For real-world development, you often need more nuanced scoring.

### Multi-Signal Scoring

A production scoring function should combine multiple signals:

```python
async def multi_signal_score(candidate) -> float:
    """Composite score from multiple quality signals."""
    scores = {}

    # 1. Test pass rate (weighted heavily)
    test_result = await run_test_suite(candidate.workspace)
    scores["tests"] = test_result.passed / max(test_result.total, 1)

    # 2. Diff size (prefer smaller, focused changes)
    diff_lines = len(candidate.diff.splitlines())
    scores["diff_size"] = max(0, 1.0 - (diff_lines / 500))

    # 3. Linter compliance
    lint_result = await run_linter(candidate.workspace)
    lint_issues = lint_result.error_count + lint_result.warning_count
    scores["lint"] = max(0, 1.0 - (lint_issues / 20))

    # 4. Type checker
    type_result = await run_type_checker(candidate.workspace)
    scores["types"] = 1.0 if type_result.success else 0.5

    # 5. No regressions (existing tests still pass)
    regression_result = await run_existing_tests(candidate.workspace)
    scores["regression"] = 1.0 if regression_result.all_passed else 0.0

    # Weighted combination
    weights = {
        "tests": 0.35,
        "diff_size": 0.10,
        "lint": 0.10,
        "types": 0.10,
        "regression": 0.35,
    }

    final = sum(scores[k] * weights[k] for k in weights)
    return final
```

### LLM-as-Judge Scoring

For qualities that are hard to measure with automated tools, like code readability, idiomatic style, or adherence to project conventions, you can use a language model as a judge.

```python
async def llm_judge_score(candidate, task: str) -> float:
    """Use an LLM to evaluate code quality aspects."""
    prompt = f"""You are evaluating a code change made by an AI coding agent.

Task description:
{task}

Code diff:
{candidate.diff}

Rate this solution on a scale of 1-10 for each criterion:
1. Correctness: Does it actually solve the stated problem?
2. Minimal change: Does it avoid unnecessary modifications?
3. Readability: Is the code clear and well-structured?
4. Robustness: Does it handle edge cases?
5. Consistency: Does it match the existing code style?

Respond with JSON: {{"correctness": N, "minimal": N, "readability": N, "robustness": N, "consistency": N}}"""

    response = await call_llm(prompt, model="claude-sonnet-4", temperature=0)
    scores = parse_json(response)

    # Normalize to 0-1
    return sum(scores.values()) / (5 * 10)
```

A strong pattern is to **use automated signals (tests, lint, types) as hard filters and LLM judgment as a tiebreaker** among candidates that pass the automated checks.

### Consensus-Based Selection

Another powerful approach is to look for agreement among candidates. If three out of five candidates make the same core change (even if their surrounding code differs), that change is likely correct.

```python
from difflib import SequenceMatcher

def find_consensus(candidates: list) -> Optional[dict]:
    """Find the candidate most similar to all others."""
    if len(candidates) <= 1:
        return candidates[0] if candidates else None

    # Compare each candidate's diff to all others
    similarity_scores = []
    for i, c1 in enumerate(candidates):
        total_similarity = sum(
            SequenceMatcher(None, c1.diff, c2.diff).ratio()
            for j, c2 in enumerate(candidates) if i != j
        )
        avg_similarity = total_similarity / (len(candidates) - 1)
        similarity_scores.append((c1, avg_similarity))

    # Return the candidate closest to the group consensus
    return max(similarity_scores, key=lambda x: x[1])[0]
```

## Best-of-N with OpenAI Codex

OpenAI Codex is a cloud-based software engineering agent designed to handle coding tasks asynchronously in sandboxed environments. Its architecture naturally supports **Codex Best of N** patterns because each task runs in its own isolated container.

### How Codex's Architecture Enables Best-of-N

Codex spins up a sandboxed cloud environment for every task. This means launching five tasks with the same prompt automatically gives you five independent attempts, each with its own filesystem, process space, and execution environment.

You do not need to manage containers yourself. The platform handles isolation natively.

### Practical Codex Best-of-N Setup

Here is how you might implement Best-of-N using the Codex/OpenAI API to launch multiple parallel coding tasks:

```python
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def codex_best_of_n(
    task_description: str,
    repo_url: str,
    n: int = 5,
) -> dict:
    """Run N parallel Codex tasks and select the best result."""

    async def launch_single_task(candidate_id: int):
        """Launch one Codex coding task."""
        response = await client.responses.create(
            model="codex-mini-latest",
            instructions=(
                f"You are solving a coding task. Candidate run #{candidate_id}.\n"
                f"Repository: {repo_url}\n\n"
                f"Task: {task_description}\n\n"
                "After implementing your solution, run the test suite to verify."
            ),
            tools=[
                {"type": "code_interpreter"},
            ],
            temperature=0.4 + (candidate_id * 0.15),  # Vary temperature
        )
        return {
            "candidate_id": candidate_id,
            "response": response,
            "output": response.output_text,
        }

    # Launch all candidates in parallel
    results = await asyncio.gather(
        *[launch_single_task(i) for i in range(n)],
        return_exceptions=True,
    )

    # Filter successful results
    valid = [r for r in results if isinstance(r, dict)]

    if not valid:
        raise RuntimeError("All Codex candidates failed")

    # Score and select (simplified: prefer candidates that mention "tests pass")
    for r in valid:
        output_lower = r["output"].lower()
        r["score"] = 0.0
        if "all tests pass" in output_lower or "tests passed" in output_lower:
            r["score"] += 1.0
        if "error" in output_lower or "failed" in output_lower:
            r["score"] -= 0.5

    valid.sort(key=lambda r: r["score"], reverse=True)
    return valid[0]
```

### Codex Best-of-N for Pull Request Generation

A particularly effective workflow is to use Codex Best-of-N when generating pull requests from issue descriptions:

```python
async def best_of_n_pr_workflow(issue_url: str, n: int = 3):
    """Generate N candidate PRs and pick the best one."""
    issue = await fetch_github_issue(issue_url)

    candidates = await asyncio.gather(
        *[
            codex_create_pr_candidate(issue, candidate_id=i)
            for i in range(n)
        ]
    )

    # Score each candidate PR
    for candidate in candidates:
        candidate["score"] = await score_pr_candidate(candidate)

    # Select the best
    best = max(candidates, key=lambda c: c["score"])

    # Create the actual PR from the best candidate
    pr_url = await create_github_pr(
        branch=best["branch"],
        title=best["title"],
        body=best["body"],
    )

    return pr_url
```

## Best-of-N with Claude Code and Anthropic

Claude Code provides a rich set of tools for implementing Best-of-N patterns, including sub-agent capabilities and multiple execution surfaces (terminal, web, desktop).

### Using Claude Code Sub-Agents for Best-of-N

Claude Code supports spawning sub-agents that can work on different parts of a task simultaneously. You can leverage this to run multiple solution attempts:

```bash
# CLAUDE.md configuration for Best-of-N workflow
## Best-of-N Instructions

When tackling complex bug fixes or feature implementations:
1. First, analyze the problem and identify 2-3 possible approaches
2. For each approach, create a separate worktree branch
3. Implement each approach independently
4. Run the test suite against each approach
5. Compare results and select the best implementation

## Approach Diversity
- Approach A: Minimal targeted fix
- Approach B: Refactoring-based solution
- Approach C: Defensive coding with additional validation
```

### Programmatic Best-of-N with the Claude API

For automated pipelines, you can use the Anthropic API directly to implement Best-of-N:

```python
import asyncio
import anthropic

client = anthropic.AsyncAnthropic()

async def claude_best_of_n(
    task: str,
    codebase_context: str,
    n: int = 5,
) -> dict:
    """Run Best-of-N using Claude for code generation."""

    async def generate_candidate(candidate_id: int):
        temp = 0.3 + (candidate_id * 0.1)
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8096,
            temperature=min(temp, 1.0),
            system=(
                "You are an expert software engineer. Generate a complete, "
                "working solution. Output only the code diff in unified diff format."
            ),
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Codebase context:\n{codebase_context}\n\n"
                        f"Task:\n{task}\n\n"
                        "Provide your solution as a unified diff."
                    ),
                }
            ],
        )
        return {
            "candidate_id": candidate_id,
            "diff": response.content[0].text,
            "temperature": temp,
        }

    candidates = await asyncio.gather(
        *[generate_candidate(i) for i in range(n)]
    )

    # Apply each diff in isolation and test
    scored = []
    for candidate in candidates:
        test_result = await apply_and_test(candidate["diff"])
        candidate["test_passed"] = test_result.passed
        candidate["test_count"] = test_result.total
        candidate["score"] = test_result.passed / max(test_result.total, 1)
        scored.append(candidate)

    scored.sort(key=lambda c: c["score"], reverse=True)
    return scored[0]
```

### Leveraging Claude Code's Multi-Surface Architecture

Claude Code runs on the web, in the terminal, in IDEs, and in the desktop app. For Best-of-N workflows, you can use **cloud sessions on the web** to run long-running candidate explorations:

1. Open multiple web sessions at `claude.ai/code`, each pointed at the same repository.
2. Give each session a different angle on the problem.
3. Compare the resulting diffs.

This manual approach works surprisingly well for high-stakes changes where you want human review of each candidate.

## Best-of-N with Open-Source Agents

Open-source coding agents like OpenHands (formerly OpenDevin), SWE-agent, and Moatless Tools all support Best-of-N through their harness or evaluation frameworks.

### SWE-agent Best-of-N Configuration

SWE-agent's evaluation harness already supports multiple runs. You can configure Best-of-N by running the agent multiple times with different seeds:

```bash
#!/bin/bash
# best_of_n_swe_agent.sh - Run SWE-agent N times and pick the best

TASK_INSTANCE="django__django-16379"
N=5
RESULTS_DIR="./results/${TASK_INSTANCE}"
mkdir -p "$RESULTS_DIR"

# Run N candidates in parallel
for i in $(seq 1 $N); do
    python run_swe_agent.py \
        --instance "$TASK_INSTANCE" \
        --seed "$i" \
        --output_dir "${RESULTS_DIR}/candidate_${i}" \
        --temperature 0.$(( 3 + i )) &
done

# Wait for all candidates to complete
wait

# Score each candidate
python score_candidates.py \
    --results_dir "$RESULTS_DIR" \
    --scoring_mode "test_pass_rate" \
    --output "${RESULTS_DIR}/best_candidate.json"
```

### OpenHands Multi-Attempt Configuration

OpenHands provides built-in support for running multiple attempts through its evaluation framework:

```python
# openhands_best_of_n.py
from openhands.core.config import AppConfig
from openhands.core.main import run_agent

async def openhands_best_of_n(task: str, n: int = 5):
    """Run OpenHands agent N times with different configurations."""
    configs = []
    for i in range(n):
        config = AppConfig()
        config.llm.temperature = 0.3 + (i * 0.15)
        config.llm.top_p = 0.9 + (i * 0.02)
        config.sandbox.timeout = 300
        configs.append(config)

    results = await asyncio.gather(
        *[run_agent(task, config=c) for c in configs]
    )

    # Evaluate and return best
    scored = [(r, evaluate_result(r)) for r in results]
    return max(scored, key=lambda x: x[1])[0]
```

### Building Your Own Lightweight Best-of-N Harness

If you are using a custom agent or want maximum control, here is a self-contained Best-of-N harness using Docker:

```python
import asyncio
import subprocess
import json
import tempfile
import shutil
from pathlib import Path

class DockerBestOfN:
    def __init__(self, repo_path: str, n: int = 5):
        self.repo_path = Path(repo_path)
        self.n = n
        self.workdirs = []

    async def setup_workspaces(self):
        """Create N isolated copies of the repository."""
        for i in range(self.n):
            workdir = Path(tempfile.mkdtemp(prefix=f"bon_candidate_{i}_"))
            shutil.copytree(self.repo_path, workdir / "repo")
            self.workdirs.append(workdir / "repo")

    async def run_candidate(self, idx: int, task: str) -> dict:
        """Run a coding agent in an isolated workspace."""
        workdir = self.workdirs[idx]

        # Run agent in Docker container
        result = subprocess.run(
            [
                "docker", "run", "--rm",
                "-v", f"{workdir}:/workspace",
                "-e", f"TASK={task}",
                "-e", f"TEMPERATURE={0.3 + idx * 0.15}",
                "coding-agent:latest",
            ],
            capture_output=True,
            text=True,
            timeout=600,
        )

        # Get the diff
        diff_result = subprocess.run(
            ["git", "diff"],
            cwd=workdir,
            capture_output=True,
            text=True,
        )

        # Run tests
        test_result = subprocess.run(
            ["python", "-m", "pytest", "--tb=short", "-q"],
            cwd=workdir,
            capture_output=True,
            text=True,
        )

        return {
            "candidate_id": idx,
            "diff": diff_result.stdout,
            "test_output": test_result.stdout,
            "test_returncode": test_result.returncode,
            "agent_output": result.stdout,
        }

    async def run(self, task: str) -> dict:
        """Execute the full Best-of-N pipeline."""
        await self.setup_workspaces()

        results = await asyncio.gather(
            *[self.run_candidate(i, task) for i in range(self.n)]
        )

        # Score: tests passing is the primary signal
        for r in results:
            r["score"] = 1.0 if r["test_returncode"] == 0 else 0.0
            # Bonus for smaller diffs
            r["score"] += max(0, 0.2 - len(r["diff"]) / 10000)

        results.sort(key=lambda r: r["score"], reverse=True)
        return results[0]

    def cleanup(self):
        """Remove temporary workspaces."""
        for workdir in self.workdirs:
            shutil.rmtree(workdir.parent, ignore_errors=True)
```

## Cost Management and Practical Trade-Offs

Best-of-N multiplies your compute cost by N. This is the fundamental trade-off. Here is how to manage it effectively.

### Cost-Benefit Analysis

On the SWE-bench Verified benchmark, top agents cost roughly $0.35 to $0.75 per instance per attempt. Running Best-of-5 would cost $1.75 to $3.75. Running Best-of-10 would cost $3.50 to $7.50.

For production use, the question is: **what is a solved issue worth to your team?** If a developer spends 2 hours on a bug fix at a loaded cost of $150/hour, even a $7.50 Best-of-10 run is trivially cheap if it reliably solves the issue.

### Strategies to Reduce Cost

**Adaptive N:** Do not use the same N for every task. Use a classifier to estimate task difficulty and allocate more candidates to harder tasks.

```python
async def adaptive_best_of_n(task: str, agent_fn, score_fn):
    """Adjust N based on estimated task difficulty."""
    difficulty = await estimate_difficulty(task)

    if difficulty == "easy":
        n = 1  # Single attempt is fine
    elif difficulty == "medium":
        n = 3
    elif difficulty == "hard":
        n = 5
    else:  # "very hard"
        n = 10

    return await best_of_n(task, n, agent_fn, score_fn)
```

**Early termination:** If a candidate passes all tests with a perfect score early on, you can cancel the remaining candidates.

```python
async def early_stop_best_of_n(task: str, n: int, agent_fn, score_fn):
    """Stop early if a perfect candidate is found."""
    best_result = None
    best_score = -1

    for i in range(n):
        result = await agent_fn(task, candidate_id=i)
        score = await score_fn(result)

        if score > best_score:
            best_score = score
            best_result = result

        # Early termination on perfect score
        if score >= 1.0:
            break

    return best_result
```

**Cheaper models for most candidates:** Run N-1 candidates with a cheaper, faster model and 1 candidate with the top-tier model. Use the expensive model's output as a reference for scoring.

**Cascading:** Start with a single attempt. If it fails or scores below a threshold, launch additional candidates. This avoids paying for N attempts on easy tasks.

```python
async def cascading_best_of_n(task: str, agent_fn, score_fn, threshold: float = 0.9):
    """Start with 1 attempt, escalate to N if needed."""
    # First attempt
    result = await agent_fn(task, candidate_id=0)
    score = await score_fn(result)

    if score >= threshold:
        return result  # Good enough on first try

    # Escalate: run 4 more candidates
    additional = await asyncio.gather(
        *[agent_fn(task, candidate_id=i) for i in range(1, 5)]
    )

    all_results = [(result, score)]
    for r in additional:
        s = await score_fn(r)
        all_results.append((r, s))

    all_results.sort(key=lambda x: x[1], reverse=True)
    return all_results[0][0]
```

### The Cost Ceiling

There is a natural ceiling where Best-of-N stops being cost-effective. Research from DeepMind and others on scaling test-time compute shows that **the compute-optimal strategy is roughly 4x more efficient than naive Best-of-N**. This means that smarter allocation strategies (adaptive N, cascading, process reward models) can achieve the same results as naive Best-of-N with a fraction of the compute.

## Advanced Patterns: Adaptive and Hierarchical Best-of-N

Once you have a basic Best-of-N pipeline running, there are several advanced patterns that can dramatically improve results.

### Process Reward Models

Instead of only scoring the final output, a **process reward model (PRM)** evaluates intermediate steps. For coding agents, this means scoring the agent's approach after it reads the code, after it formulates a plan, and after it generates the diff, not just after tests run.

```python
class ProcessRewardScorer:
    """Score candidates at multiple checkpoints during execution."""

    def __init__(self, reward_model):
        self.reward_model = reward_model
        self.checkpoints = []

    async def score_checkpoint(self, agent_state: dict, step_name: str) -> float:
        """Score the agent's state at a specific checkpoint."""
        score = await self.reward_model.evaluate(
            step=step_name,
            state=agent_state,
        )
        self.checkpoints.append({
            "step": step_name,
            "score": score,
        })
        return score

    async def final_score(self) -> float:
        """Weighted combination of all checkpoint scores."""
        weights = {
            "problem_analysis": 0.15,
            "approach_selection": 0.20,
            "implementation": 0.25,
            "test_results": 0.40,
        }
        total = sum(
            cp["score"] * weights.get(cp["step"], 0.1)
            for cp in self.checkpoints
        )
        return total / sum(weights.values())
```

PRMs let you **prune bad candidates early**, before they waste compute on a doomed approach. If a candidate's problem analysis scores poorly, you can terminate it and redirect resources to a new candidate.

### Hierarchical Best-of-N

Break the coding task into sub-tasks and apply Best-of-N at each level:

1. **Strategy level:** Generate N high-level approaches (e.g., "add a mutex" vs. "restructure to avoid shared state").
2. **Implementation level:** For the top K strategies, generate M implementation variants each.
3. **Polish level:** For the top implementation, generate P refinement passes.

```python
async def hierarchical_best_of_n(task: str):
    """Three-level hierarchical Best-of-N."""

    # Level 1: Strategy generation (N=5)
    strategies = await asyncio.gather(
        *[generate_strategy(task) for _ in range(5)]
    )
    strategy_scores = [(s, await score_strategy(s)) for s in strategies]
    strategy_scores.sort(key=lambda x: x[1], reverse=True)
    top_strategies = [s for s, _ in strategy_scores[:2]]  # Keep top 2

    # Level 2: Implementation (M=3 per strategy)
    implementations = []
    for strategy in top_strategies:
        impls = await asyncio.gather(
            *[implement_strategy(task, strategy) for _ in range(3)]
        )
        implementations.extend(impls)

    impl_scores = [(impl, await score_implementation(impl)) for impl in implementations]
    impl_scores.sort(key=lambda x: x[1], reverse=True)
    best_impl = impl_scores[0][0]

    # Level 3: Refinement (P=3)
    refined = await asyncio.gather(
        *[refine_implementation(best_impl, task) for _ in range(3)]
    )
    refined_scores = [(r, await score_implementation(r)) for r in refined]
    refined_scores.sort(key=lambda x: x[1], reverse=True)

    return refined_scores[0][0]
```

This gives you 5 * 3 = 15 total candidates at level 2 but only 5 + 6 + 3 = 14 agent calls (far fewer than 15 full end-to-end runs because the strategy-level calls are cheaper).

### Ensemble Selection

Instead of picking a single winner, combine the best elements from multiple candidates. This works especially well when different candidates fix different aspects of a multi-part bug.

```python
async def ensemble_selection(candidates: list, task: str) -> str:
    """Ask an LLM to synthesize the best parts of multiple candidates."""
    diffs = "\n\n---\n\n".join(
        f"Candidate {i+1}:\n{c['diff']}" for i, c in enumerate(candidates)
    )

    response = await call_llm(
        model="claude-sonnet-4",
        prompt=(
            f"Task: {task}\n\n"
            f"Here are {len(candidates)} candidate solutions:\n\n{diffs}\n\n"
            "Synthesize the best elements from these candidates into a single, "
            "optimal solution. Output only the unified diff."
        ),
    )

    return response
```

## Real-World Results and Benchmarks

The evidence for Best-of-N in coding agents is strong and growing. Here are concrete results from major benchmarks and production systems.

### SWE-bench Results

On SWE-bench Verified, the standard benchmark for evaluating coding agents on real GitHub issues:

- **Single attempt (pass@1):** Top agents solve 70-77% of issues.
- **Best-of-3:** The same agents solve approximately 82-88% of issues.
- **Best-of-5:** Results push to approximately 86-92%.
- **Best-of-10:** Approaches 90-95% on the verified subset.

These numbers represent the state of the art in early 2026, with models like Claude 4.5 Opus and Gemini 3 Flash leading the leaderboard.

### Test-Time Compute Scaling Research

A landmark 2024 paper from Google DeepMind (Snell et al., "Scaling LLM Test-Time Compute Optimally") demonstrated that:

- Compute-optimal Best-of-N strategies are **4x more efficient** than naive Best-of-N.
- Smaller models using test-time compute (including Best-of-N) can **outperform models 14x larger** that rely only on a single forward pass.
- The benefit of test-time compute is greatest on problems of **moderate difficulty**, where the base model has a non-trivial but imperfect success rate.

These findings directly validate the Best-of-N approach for coding agents and suggest that investing in better scoring functions (verifiers) is at least as important as increasing N.

### Production Impact

Teams using Best-of-N in production coding workflows report:

- **30-50% increase in first-time fix rate** for automated bug fixes.
- **Reduced human review cycles** because the selected candidate is typically closer to merge-ready.
- **Higher confidence in automated PRs**, enabling more aggressive automation.

The trade-off is always cost and latency. Best-of-5 costs 5x more and takes as long as the slowest candidate (if run in parallel) or 5x as long (if run sequentially).

## Common Pitfalls and How to Avoid Them

Best-of-N seems simple, but there are several ways it can go wrong in practice.

### Pitfall 1: Insufficient Diversity

**Problem:** All N candidates produce essentially the same solution. You pay N times the cost but get no benefit.

**Solution:** Vary temperature, prompts, and even models across candidates. Monitor the diversity of your candidate pool by computing pairwise similarity metrics on the diffs.

### Pitfall 2: Weak Scoring Function

**Problem:** Your scoring function cannot distinguish between a good solution and a great one, or worse, it systematically prefers worse solutions.

**Solution:** Combine multiple automated signals (tests, lint, type checking, diff size) with LLM-as-judge evaluation. Regularly calibrate your scoring function against human preferences.

### Pitfall 3: Overfitting to Tests

**Problem:** The best-scoring candidate passes all tests but does so in a hacky way -- for example, by hardcoding expected outputs or adding special-case logic that only works for the test inputs.

**Solution:** Include code quality signals in your scoring function, not just test pass rates. Use an LLM judge to flag suspicious patterns. Run additional, held-out test cases if available.

```python
# Detect potential test overfitting
def check_for_overfitting(diff: str) -> float:
    """Return a penalty score for suspicious patterns."""
    suspicious_patterns = [
        r"if\s+.*==\s*['\"]specific_test_value['\"]",
        r"hardcoded",
        r"# TODO.*remove.*hack",
        r"return\s+\d+\s*$",  # Hardcoded return values
    ]
    import re
    penalty = sum(
        0.1 for pattern in suspicious_patterns
        if re.search(pattern, diff)
    )
    return min(penalty, 0.5)
```

### Pitfall 4: Ignoring Latency

**Problem:** Best-of-N adds latency. If candidates run sequentially, a Best-of-5 run takes 5x longer. Even in parallel, the total wall-clock time equals the slowest candidate.

**Solution:** Always run candidates in parallel when possible. Set aggressive timeouts to prevent a single slow candidate from bottlenecking the entire run. For interactive workflows, use cascading (start with one attempt, escalate if needed).

### Pitfall 5: Not Tracking Metrics

**Problem:** You deploy Best-of-N but never measure whether it is actually helping.

**Solution:** Log every candidate's score, the winning margin (gap between best and second-best), and the improvement over a single-attempt baseline. Track these metrics over time to calibrate N.

```python
def log_best_of_n_metrics(candidates: list, winner_idx: int):
    """Log metrics for Best-of-N analysis."""
    scores = [c["score"] for c in candidates]
    metrics = {
        "n": len(candidates),
        "winner_score": scores[winner_idx],
        "mean_score": sum(scores) / len(scores),
        "score_std": (sum((s - sum(scores)/len(scores))**2 for s in scores) / len(scores)) ** 0.5,
        "winning_margin": scores[winner_idx] - sorted(scores)[-2] if len(scores) > 1 else 0,
        "all_scores": scores,
        "num_passing": sum(1 for s in scores if s >= 0.9),
    }
    logger.info(f"Best-of-N metrics: {json.dumps(metrics)}")
    return metrics
```

## Frequently Asked Questions

### What is the ideal value of N for Best-of-N in coding tasks?

For most teams, **N=3 to N=5 offers the best cost-benefit ratio**. Going from 1 to 3 captures most of the improvement. Going beyond 5 yields diminishing returns unless the task is extremely difficult. Use adaptive N (starting with 1, escalating on failure) to minimize cost on easy tasks.

### Does Best-of-N work better with certain models?

Yes. Best-of-N works best with models that have **high variance** in their outputs -- models that can produce very good solutions but not consistently. Models with very low temperature or highly deterministic outputs benefit less from Best-of-N because all candidates will be nearly identical. In practice, both Claude and GPT families show enough variance at reasonable temperatures (0.4-0.8) to benefit significantly.

### How is Best-of-N different from simply retrying on failure?

Retrying only kicks in when the agent explicitly fails (returns an error, crashes, or produces obviously broken output). Best-of-N runs all candidates regardless of whether earlier ones succeed. This means Best-of-N can select a **better passing solution** among multiple passing solutions, while retries only help you get from failure to any success.

### Can I use Best-of-N with different models for each candidate?

Absolutely. Using a mix of models (for example, two Claude candidates, two GPT candidates, and one Gemini candidate) maximizes diversity. Different models have different strengths and tend to approach problems differently. The scoring function remains the same across all candidates, so this works seamlessly.

### Is Best-of-N the same as "majority voting"?

Not exactly. Majority voting picks the most common answer among candidates, which works well for tasks with a single correct answer (like math problems). **Best-of-N uses a scoring function to select the highest-quality candidate**, which is more appropriate for coding tasks where there are many valid solutions of varying quality. However, consensus-based selection (a variant of majority voting for code) can be a useful signal within a broader scoring function.

### How do I handle the cost of Best-of-N in production?

Use **cascading** (try once, escalate only if needed), **adaptive N** (vary N by task difficulty), and **cheaper models for most candidates**. In practice, many teams use Best-of-N only for high-stakes automated changes (production hotfixes, large refactors) and single attempts for routine tasks (test writing, documentation).

### Does Best-of-N work for tasks without test suites?

Yes, but it requires a different scoring approach. Without tests, you rely on LLM-as-judge scoring, linter output, type checker results, and diff quality metrics. The results are less reliable than test-based scoring but still significantly better than single attempts. Investing in writing tests for the specific task before running Best-of-N is often the highest-leverage improvement.

### What is the relationship between Best-of-N and RLHF?

Best-of-N is a **test-time technique** -- it happens during inference, not training. RLHF (Reinforcement Learning from Human Feedback) is a training technique. However, the reward models trained for RLHF can be repurposed as scoring functions for Best-of-N at inference time. In fact, Best-of-N with a good reward model is a strong baseline that pure RLHF-trained models must beat to justify the training cost.

### Can Best-of-N help with coding agent exploration in unfamiliar codebases?

Yes. When an agent is working in an unfamiliar codebase, the primary failure mode is making incorrect assumptions about architecture, conventions, or dependencies. Running **multiple agent responses** increases the chance that at least one candidate correctly identifies the relevant files, understands the existing patterns, and produces a solution that fits naturally into the codebase.

## Key Takeaways

**Best-of-N for coding agents** is one of the most practical, highest-leverage techniques available for improving AI-generated code quality. Here is what you should remember:

1. **The core idea is simple.** Generate N candidate solutions, score them, keep the best. The complexity is in the scoring function and orchestration, not the concept.

2. **It works because coding tasks have natural verification.** Tests, linters, type checkers, and code review all provide automated scoring signals. This makes coding one of the best domains for Best-of-N.

3. **N=3 to N=5 captures most of the benefit.** The jump from 1 to 3 is dramatic. Beyond 5, diminishing returns set in for most tasks.

4. **Diversity is critical.** Vary temperature, prompts, and even models across candidates. If all candidates produce the same solution, you are wasting compute.

5. **Invest in your scoring function.** A good scoring function is worth more than a larger N. Combine test results, lint, type checking, diff size, and LLM-as-judge evaluation.

6. **Use adaptive strategies to manage cost.** Cascading (try once, escalate if needed) and adaptive N (harder tasks get more candidates) can reduce average cost by 3-5x without sacrificing quality.

7. **Track your metrics.** Log scores, winning margins, and diversity metrics. Use them to calibrate N and improve your scoring function over time.

If you are building or using **AI coding workflows** today, adding Best-of-N to your pipeline is one of the highest-impact changes you can make. Start with N=3 on your hardest tasks. Measure the improvement. Then expand from there.

The future of **coding agent exploration** is not about single perfect responses. It is about systematic search, evaluation, and selection. Best-of-N is the foundation of that future -- and it is available to you right now.
