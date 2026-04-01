---
title: "AI Agent Evaluation: How to Benchmark MultiStep Agentic Systems in Production"
description: "SWE-bench established a high bar for software engineering agents in 2023 and became the dominant leaderboard, but it measures only one type of agent task."
date: "2026-03-29"
tags: ["AI Agents","AI agent evaluation","agent benchmarking"]
readTime: "23 min read"
ogImage: "/og/ai-agent-evaluation-benchmarking.png"
canonical: "https://chaitanyaprabuddha.com/blog/ai-agent-evaluation-benchmarking"
published: true
---

A language model benchmark measures what a model knows and whether it can reason. An agent benchmark measures something different and much harder: whether the agent can navigate a multi-step process, use tools correctly, recover from errors, and reach a goal state. For agents, consistency matters more than peak performance.

The distinction matters because agents fail in ways that benchmarks optimized for single-turn LLM outputs cannot detect. An agent might answer the question correctly on 80% of trials but fail to complete the full task because it misuses a tool on step 7 of 12. An agent might succeed on a task the first time but fail on 60% of repeated trials due to stochasticity in its decision-making. An agent might achieve the right final state through a sequence of actions that would be unacceptably expensive or risky in production.

The AI agent evaluation field is approximately two years old and still fragmented. SWE-bench established a high bar for software engineering agents in 2023 and became the dominant leaderboard, but it measures only one type of agent task. The tau-bench paper introduced the pass^k metric (the probability that an agent succeeds on all k trials of the same task), which is more relevant to production deployment than single-trial success rate. GAIA measures general-purpose agent reasoning across diverse domains.

The leading benchmarks measure different aspects of agent capability. Some capture software engineering skill (SWE-bench), others measure reliability (tau-bench), and still others test general reasoning (GAIA). Implementation requires custom metrics, domain-specific test cases, and evaluation infrastructure that drives improvements instead of producing numbers for reports.

## Why Agent Evaluation Is Different From LLM Evaluation

Standard LLM benchmarks (MMLU, HumanEval, GSM8K, etc.) measure single-turn performance: given a prompt, produce the right output. Success is binary and easy to define. The output either matches the expected answer or it doesn't.

Agent evaluation has five properties that make it fundamentally different:

**1. Multi-step trajectories**: An agent produces a sequence of actions, not a single output. The final state depends on every step in the sequence. A single wrong intermediate action can invalidate all subsequent correct actions. Evaluation must consider the full trajectory, not just the terminal state.

**2. Tool call correctness**: Agents use tools with specific APIs. A tool call can be syntactically correct (valid JSON) but semantically wrong (querying the wrong file, searching for the wrong term). Standard output comparison doesn't capture tool-call quality.

**3. Stochasticity and consistency**: LLMs are stochastic. An agent that succeeds on trial 1 might fail on trial 2 with identical inputs due to sampling variance. Production systems need consistent performance, not high-watermark performance. Evaluation must measure distribution over trials, not single-trial outcomes.

**4. Task completion vs. answer correctness**: Many agent tasks are not question-answering. "Fix this bug" or "complete this purchase" has a binary success criterion (code passes tests, purchase is recorded in the database) that is orthogonal to whether any specific output matches an expected string.

**5. Efficiency and cost**: Two agents that both solve a task may differ by 10x in the number of API calls and compute cost. Production evaluation must include efficiency metrics, not just accuracy.

These five properties require different evaluation infrastructure, different metrics, and different test case design compared to standard LLM benchmarks.

## SWEbench: Real Code, Real Repositories, Real Pull Requests

SWE-bench (Jimenez et al., 2023) evaluates coding agents on real GitHub issues: given a repository and an issue description, can the agent produce a patch that makes the existing test suite pass?

The benchmark is constructed from merged pull requests across 12 Python repositories (including scikit-learn, sympy, django). Each instance is:
- A GitHub issue description (the task)
- The repository state before the fix
- A set of failing tests that the fix must make pass
- The gold patch (not shown to the agent)

Success criterion: the agent's patch makes the failing tests pass without breaking previously passing tests.

Current leaderboard top performers (as of early 2026):
- Claude Opus 4.6: 76.8% resolution rate at approximately $0.75/instance (33-40 API calls)
- Gemini 3 Flash: 75.8% resolution rate at approximately $0.36/instance (lower cost, comparable accuracy)
- GPT-4o: approximately 48-55% resolution rate (varies by scaffolding)

**What SWE-bench measures well:**
- Code editing and patch generation quality
- Repository navigation and file understanding
- Test-driven development capability
- Multi-file change coordination

**What SWE-bench does not measure:**
- Real-time task performance (all tasks are static, pre-committed)
- Tool reliability under non-ideal conditions
- Efficiency on non-coding tasks
- Multi-turn interactive work

**Implementing SWE-bench evaluation locally:**

```python
import subprocess
import json
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

@dataclass
class SWEBenchInstance:
    instance_id: str
    repo: str
    base_commit: str
    problem_statement: str
    hints_text: str
    test_patch: str           # Tests that must pass after fix
    fail_to_pass: list[str]   # Tests that fail before and must pass after
    pass_to_pass: list[str]   # Tests that pass before and must still pass after

@dataclass
class SWEBenchResult:
    instance_id: str
    resolved: bool
    patch_applied: bool
    tests_passed: list[str]
    tests_failed: list[str]
    api_calls: int
    cost_usd: float
    time_seconds: float
    patch: Optional[str] = None

class SWEBenchEvaluator:
    """Local SWE-bench evaluation runner."""

    def __init__(self, workspace_dir: str = "/tmp/swebench"):
        self.workspace = Path(workspace_dir)
        self.workspace.mkdir(exist_ok=True)

    def evaluate_patch(self, instance: SWEBenchInstance, patch: str) -> SWEBenchResult:
        """Apply a patch and run the test suite."""
        repo_dir = self.workspace / instance.instance_id

        # Clone repo at base commit
        subprocess.run([
            "git", "clone", f"https://github.com/{instance.repo}",
            str(repo_dir)
        ], check=True, capture_output=True)
        subprocess.run(
            ["git", "checkout", instance.base_commit],
            cwd=repo_dir, check=True, capture_output=True
        )

        # Apply test patch (adds the validation tests)
        test_patch_path = repo_dir / "test.patch"
        test_patch_path.write_text(instance.test_patch)
        test_result = subprocess.run(
            ["git", "apply", str(test_patch_path)],
            cwd=repo_dir, capture_output=True
        )

        # Apply agent's patch
        agent_patch_path = repo_dir / "agent.patch"
        agent_patch_path.write_text(patch)
        apply_result = subprocess.run(
            ["git", "apply", str(agent_patch_path)],
            cwd=repo_dir, capture_output=True
        )
        patch_applied = apply_result.returncode == 0

        if not patch_applied:
            return SWEBenchResult(
                instance_id=instance.instance_id,
                resolved=False,
                patch_applied=False,
                tests_passed=[], tests_failed=instance.fail_to_pass,
                api_calls=0, cost_usd=0, time_seconds=0,
                patch=patch,
            )

        # Run tests
        test_output = subprocess.run(
            ["python", "-m", "pytest", "--no-header", "-rN", "--tb=no"] +
            instance.fail_to_pass + instance.pass_to_pass,
            cwd=repo_dir, capture_output=True, text=True, timeout=120
        )

        passed, failed = self._parse_pytest_output(test_output.stdout, instance)
        resolved = (
            all(t in passed for t in instance.fail_to_pass) and
            all(t in passed for t in instance.pass_to_pass)
        )

        return SWEBenchResult(
            instance_id=instance.instance_id,
            resolved=resolved,
            patch_applied=True,
            tests_passed=passed,
            tests_failed=failed,
            api_calls=0, cost_usd=0, time_seconds=0,
            patch=patch,
        )

    def _parse_pytest_output(self, output: str,
                              instance: SWEBenchInstance) -> tuple[list, list]:
        passed = []
        failed = []
        for line in output.split("\n"):
            if " PASSED" in line:
                test_name = line.split("::")[0].strip()
                passed.append(test_name)
            elif " FAILED" in line:
                test_name = line.split("::")[0].strip()
                failed.append(test_name)
        return passed, failed
```

## taubench and pass^k: Measuring Reliability, Not Just Accuracy

The tau-bench paper (Yao et al., 2024) introduced a critical insight: single-trial success rate misleads teams deploying production agents. An agent that succeeds 80% of the time looks good on a leaderboard but has a 20% failure rate in production. If the task runs daily, that's about 73 failures per year.

The pass^k metric (p^k, pronounced "pass hat k") measures the probability that an agent succeeds on all k independent trials of the same task. For an agent with single-trial success rate p, the pass^k rate is:

```
pass^k = p^k
```

At p = 0.80 (80% single-trial success), the pass^k rates are:
- pass^1 = 0.80
- pass^2 = 0.64
- pass^4 = 0.41
- pass^8 = 0.17

An agent with 80% single-trial accuracy has only 17% probability of succeeding when run 8 times on the same task. Production systems that handle the same task type repeatedly across many users need this metric more than single-trial success rate.

The tau-bench evaluation framework:

```python
import asyncio
import random
from typing import Callable, Awaitable
from dataclasses import dataclass
import numpy as np

@dataclass
class TauBenchTask:
    task_id: str
    initial_state: dict    # Database/environment state before task
    user_goal: str         # What the user wants to accomplish
    goal_state: dict       # Expected database/environment state after task
    tool_definitions: list[dict]

@dataclass
class TauBenchResult:
    task_id: str
    trial_id: int
    success: bool
    final_state: dict
    n_tool_calls: int
    tool_call_log: list[dict]

class TauBenchEvaluator:
    """
    Evaluates agent reliability using the pass^k metric.
    """

    def __init__(self, agent_fn: Callable[[TauBenchTask], Awaitable[dict]],
                 state_comparator: Callable[[dict, dict], bool]):
        """
        agent_fn: async function that takes a task and returns final environment state
        state_comparator: function that checks if final_state matches goal_state
        """
        self.agent = agent_fn
        self.compare = state_comparator

    async def run_trials(self, task: TauBenchTask, k: int = 8) -> dict:
        """Run k independent trials of the same task and compute pass^k."""
        results = []

        for trial in range(k):
            # Fresh environment state for each trial
            result = await self.agent(task)
            success = self.compare(result["final_state"], task.goal_state)
            results.append(TauBenchResult(
                task_id=task.task_id,
                trial_id=trial,
                success=success,
                final_state=result["final_state"],
                n_tool_calls=result.get("n_tool_calls", 0),
                tool_call_log=result.get("tool_call_log", []),
            ))

        successes = [r.success for r in results]
        single_trial_rate = sum(successes) / k

        # pass^k: all trials must succeed
        all_pass = all(successes)

        # Estimated pass^k for various k values
        estimated_pass_k = {k: single_trial_rate ** k for k in [1, 2, 4, 8, 16]}

        return {
            "task_id": task.task_id,
            "trials": k,
            "single_trial_success_rate": single_trial_rate,
            "pass_k_all": all_pass,
            "estimated_pass_k": estimated_pass_k,
            "avg_tool_calls": np.mean([r.n_tool_calls for r in results]),
            "results": results,
        }

    async def evaluate_suite(self, tasks: list[TauBenchTask], k: int = 8) -> dict:
        """Evaluate the full task suite with pass^k metric."""
        task_results = await asyncio.gather(
            *[self.run_trials(task, k) for task in tasks]
        )

        # Aggregate metrics
        single_trial_rates = [r["single_trial_success_rate"] for r in task_results]
        pass_k_rates = [r["pass_k_all"] for r in task_results]

        return {
            "n_tasks": len(tasks),
            "k": k,
            "mean_single_trial_accuracy": np.mean(single_trial_rates),
            "pass_k_accuracy": np.mean(pass_k_rates),  # Fraction of tasks that always succeed
            "reliability_gap": np.mean(single_trial_rates) - np.mean(pass_k_rates),
            "per_task": task_results,
        }

def compare_database_states(final: dict, goal: dict,
                              tolerance: float = 0.01) -> bool:
    """
    Compare final database state to goal state.
    Handles numeric fields with tolerance and missing field detection.
    """
    for key, expected in goal.items():
        actual = final.get(key)
        if actual is None:
            return False  # Required field missing

        if isinstance(expected, (int, float)):
            if abs(actual - expected) / max(abs(expected), 1) > tolerance:
                return False
        elif isinstance(expected, list):
            if set(actual) != set(expected):  # Order-insensitive
                return False
        else:
            if actual != expected:
                return False

    return True
```

**tau-bench findings on production models:** GPT-4o with function calling achieves approximately 40-50% single-trial task success rate but drops to under 25% on pass^8. Any task requiring consistent execution across multiple users or repeated runs will have production reliability far below what single-trial benchmarks suggest.

The reliability gap (single_trial_accuracy minus pass_k_accuracy) is the most actionable metric for production improvement. A large reliability gap indicates that the agent sometimes works and sometimes doesn't for identical tasks. Common causes include stochastic tool selection (sometimes calls the right tool, sometimes the wrong one), context-sensitive errors (small variations in retrieved context lead to different decisions), and cascading failures (one wrong early decision leads to systematically wrong later decisions).

## GAIA: GeneralPurpose Agent Capability Assessment

GAIA (Mialon et al., 2023) is a benchmark for general-purpose agent capability: 466 questions across three difficulty levels requiring web browsing, code execution, file analysis, and multi-step reasoning.

**Level 1**: Single-tool tasks answerable with one web search or computation
**Level 2**: Multi-step tasks requiring 2-5 tool calls across different tool types
**Level 3**: Complex multi-stage tasks requiring planning, iteration, and error recovery

Sample tasks:
- Level 1: "What is the population of Tokyo as of 2023?" (web search + extract)
- Level 2: "Download this PDF, extract the table on page 3, compute the average of the third column" (download + parse + compute)
- Level 3: "Research the current top 5 Python web frameworks, compare their GitHub stars, weekly downloads, and latest release dates, and produce a summary table" (multi-search + scraping + comparison + formatting)

**Implementing GAIA-style evaluation:**

```python
from dataclasses import dataclass
from typing import Optional, Any

@dataclass
class GAIAQuestion:
    question_id: str
    level: int               # 1, 2, or 3
    question: str
    expected_answer: str
    annotator_metadata: dict  # Tool types needed, number of steps, etc.
    file_attachment: Optional[str] = None  # Path to attached file if any

class GAIAEvaluator:
    """GAIA evaluation with exact and normalized matching."""

    def evaluate_answer(self, predicted: str, expected: str,
                         level: int) -> dict:
        """
        GAIA uses exact match after normalization.
        Numbers, dates, and lists require special normalization.
        """
        pred_norm = self._normalize(predicted)
        exp_norm = self._normalize(expected)

        exact_match = pred_norm == exp_norm
        partial_match = exp_norm in pred_norm or pred_norm in exp_norm

        return {
            "exact_match": exact_match,
            "partial_match": partial_match,
            "normalized_prediction": pred_norm,
            "normalized_expected": exp_norm,
        }

    def _normalize(self, answer: str) -> str:
        """Normalize an answer for comparison."""
        import re
        # Remove trailing punctuation
        answer = answer.strip().rstrip(".")

        # Normalize numbers: "1,234.5" → "1234.5"
        answer = re.sub(r"(\d),(\d)", r"\1\2", answer)

        # Lowercase
        answer = answer.lower()

        # Normalize units: "3 km" → "3 km", "3km" → "3 km"
        answer = re.sub(r"(\d)([a-zA-Z])", r"\1 \2", answer)

        return answer.strip()

    def compute_metrics(self, results: list[dict]) -> dict:
        """Compute GAIA metrics by level and overall."""
        by_level = {1: [], 2: [], 3: []}

        for r in results:
            by_level[r["level"]].append(r["exact_match"])

        return {
            "overall": sum(r["exact_match"] for r in results) / len(results),
            "level_1": sum(by_level[1]) / max(len(by_level[1]), 1),
            "level_2": sum(by_level[2]) / max(len(by_level[2]), 1),
            "level_3": sum(by_level[3]) / max(len(by_level[3]), 1),
        }
```

## LLMasJudge: Scalable Evaluation for OpenEnded Tasks

For agent tasks where the output cannot be exactly matched (written reports, explanations, summaries, plans), LLM-as-judge provides scalable evaluation by using a strong language model to score outputs against rubrics.

Reliable LLM-as-judge evaluation requires structured rubrics with specific, measurable criteria, not holistic quality scoring.

```python
from anthropic import AsyncAnthropic
import json

client = AsyncAnthropic()

EVALUATION_RUBRIC = """You are evaluating an AI agent's response to a user task.
Score each dimension from 1-5 using the criteria below. Return ONLY JSON.

Dimensions:
1. task_completion (1-5): Did the agent fully complete what was asked?
   1=Did not attempt, 3=Partial completion, 5=Fully complete with no gaps

2. accuracy (1-5): Are the facts, data, and claims in the response correct?
   1=Multiple errors, 3=Mostly correct with minor errors, 5=Fully accurate

3. tool_efficiency (1-5): Did the agent use tools efficiently?
   1=Unnecessary redundant calls or wrong tools, 3=Reasonable use, 5=Optimal tool use

4. format_quality (1-5): Is the output well-formatted and readable?
   1=Hard to read, 3=Adequate, 5=Well-structured and clear

5. safety (1-5): Did the agent avoid risky or undesired side effects?
   1=Took risky actions, 3=Cautious but unnecessary, 5=Appropriate caution

Return format:
{
  "task_completion": <1-5>,
  "accuracy": <1-5>,
  "tool_efficiency": <1-5>,
  "format_quality": <1-5>,
  "safety": <1-5>,
  "reasoning": "<brief explanation of scores>"
}"""

async def evaluate_agent_response(
    task: str,
    agent_response: str,
    tool_call_log: list[dict],
    model: str = "claude-opus-4-6",
) -> dict:
    """
    Evaluate an agent's response using LLM-as-judge.
    Returns structured scores across dimensions.
    """
    tool_summary = "\n".join([
        f"- {call['tool']}: {str(call.get('args', {}))[:100]}"
        for call in tool_call_log[:20]
    ])

    judgment_prompt = f"""Task given to agent:
{task}

Agent's tool calls:
{tool_summary}

Agent's final response:
{agent_response}

{EVALUATION_RUBRIC}"""

    response = await client.messages.create(
        model=model,
        max_tokens=500,
        messages=[{"role": "user", "content": judgment_prompt}]
    )

    try:
        scores = json.loads(response.content[0].text)
        scores["composite"] = sum([
            scores.get("task_completion", 3) * 0.35,    # Highest weight
            scores.get("accuracy", 3) * 0.30,
            scores.get("tool_efficiency", 3) * 0.15,
            scores.get("format_quality", 3) * 0.10,
            scores.get("safety", 3) * 0.10,
        ])
        return scores
    except json.JSONDecodeError:
        return {"error": "Failed to parse judge response", "raw": response.content[0].text}

async def evaluate_with_position_bias_control(
    task: str,
    response_a: str,
    response_b: str,
    tool_log_a: list[dict],
    tool_log_b: list[dict],
) -> dict:
    """
    Pairwise evaluation with position bias control.
    Runs A vs B and B vs A, averages results to reduce position bias.
    """
    scores_ab = await evaluate_agent_response(task, response_a, tool_log_a)
    scores_ba = await evaluate_agent_response(task, response_b, tool_log_b)

    # Account for position effect (judge may favor the first response)
    composite_a = (scores_ab.get("composite", 3) + (6 - scores_ba.get("composite", 3))) / 2
    composite_b = ((6 - scores_ab.get("composite", 3)) + scores_ba.get("composite", 3)) / 2

    return {
        "response_a_score": composite_a,
        "response_b_score": composite_b,
        "winner": "A" if composite_a > composite_b else "B" if composite_b > composite_a else "tie",
        "margin": abs(composite_a - composite_b),
    }
```

**LLM-as-judge reliability:** Research shows that LLM judges agree with human raters at approximately 80-85% for pairwise comparisons and 70-75% for absolute scoring. Key practices that improve reliability include using the most capable available model as judge (judge quality matters), using rubrics with specific criteria instead of holistic scoring, controlling for position bias with A/B and B/A runs, calibrating with human annotations on a held-out sample, and running multiple judge runs and averaging to reduce variance.

## Trajectory Evaluation: Measuring How, Not Just What

The final state tells you if the agent succeeded. The trajectory tells you if the agent is reliable, efficient, and safe. Two agents that both solve a task may take wildly different paths: one through a direct 4-step sequence, one through a 20-step sequence with several wrong turns that happen to be recoverable.

```python
@dataclass
class AgentTrajectory:
    task_id: str
    steps: list[dict]      # [{tool, args, result, timestamp, success}]
    final_state: dict
    success: bool
    total_tokens: int
    total_cost_usd: float
    wall_time_seconds: float

def evaluate_trajectory(trajectory: AgentTrajectory,
                         optimal_n_steps: int) -> dict:
    """
    Evaluate the quality of an agent trajectory.
    """
    n_steps = len(trajectory.steps)
    failed_steps = [s for s in trajectory.steps if not s.get("success", True)]
    redundant_steps = _find_redundant_steps(trajectory.steps)
    risky_steps = _find_risky_steps(trajectory.steps)

    # Efficiency ratio: optimal steps / actual steps
    efficiency = min(optimal_n_steps / max(n_steps, 1), 1.0)

    # Error recovery rate: agent recovers from failures
    failure_followed_by_success = 0
    for i, step in enumerate(failed_steps):
        if any(s.get("success") for s in trajectory.steps[i+1:i+4]):
            failure_followed_by_success += 1

    recovery_rate = (failure_followed_by_success / max(len(failed_steps), 1)
                     if failed_steps else 1.0)

    return {
        "n_steps": n_steps,
        "optimal_n_steps": optimal_n_steps,
        "efficiency": efficiency,
        "n_failed_steps": len(failed_steps),
        "n_redundant_steps": len(redundant_steps),
        "n_risky_steps": len(risky_steps),
        "error_recovery_rate": recovery_rate,
        "cost_per_success": (trajectory.total_cost_usd if trajectory.success
                              else float("inf")),
        "tokens_per_step": trajectory.total_tokens / max(n_steps, 1),
    }

def _find_redundant_steps(steps: list[dict]) -> list[dict]:
    """Find steps that repeat the same tool call with the same arguments."""
    seen = set()
    redundant = []
    for step in steps:
        signature = f"{step.get('tool')}:{str(sorted(step.get('args', {}).items()))}"
        if signature in seen:
            redundant.append(step)
        seen.add(signature)
    return redundant

def _find_risky_steps(steps: list[dict]) -> list[dict]:
    """Flag tool calls that are potentially risky/irreversible."""
    risky_tools = {"delete_file", "send_email", "execute_code", "database_write",
                   "deploy", "payment", "api_post"}
    return [s for s in steps if s.get("tool") in risky_tools]
```

**Key trajectory metrics for production improvement:**

| Metric | What it reveals | Action |
|---|---|---|
| Steps per task (vs. optimal) | Efficiency gap | Simplify task decomposition, add direct tools |
| Redundant step rate | Agent is confused | Improve context management, add state tracking |
| Error recovery rate | Resilience under adversity | Improve retry logic, clarify error messages |
| Risky step frequency | Risk management | Add confirmation gates, improve planning |
| Cost per successful completion | Production economics | Optimize which model handles which sub-task |

## Building Custom Evals for Your Specific Agent

Public benchmarks measure general capability. Production evals measure your specific agent on your specific tasks. Both are necessary. Only production evals drive meaningful improvements.

**The production eval design process:**

1. **Sample from production logs**: Collect 200-500 real tasks the agent handled in production. Include both successes and failures.

2. **Annotate outcomes**: For each sampled task, determine the ground-truth outcome (manually or using a reference system). This is expensive but necessary for calibration.

3. **Identify failure mode clusters**: Group failures by type (tool selection errors, context confusion, planning failures, output format issues). The most common cluster is your highest-priority eval coverage gap.

4. **Create targeted test cases**: For each failure cluster, create 20-50 test cases that specifically probe that failure mode. These test cases will detect regression if the failure mode recurs.

5. **Build evaluation fixtures**: For each test case, specify the initial state, the expected outcome, and the verification function.

```python
class ProductionEvalSuite:
    """
    Production eval suite for a specific agent deployment.
    """

    def __init__(self, agent, suite_name: str):
        self.agent = agent
        self.suite_name = suite_name
        self.test_cases: list[dict] = []
        self.evaluators: dict[str, callable] = {}

    def add_test_case(self, task: str, initial_state: dict,
                       expected_outcome: dict, category: str,
                       verifier: callable):
        """Add a test case with its verification function."""
        self.test_cases.append({
            "task": task,
            "initial_state": initial_state,
            "expected_outcome": expected_outcome,
            "category": category,
            "verifier": verifier,
        })

    async def run(self, k_trials: int = 3) -> dict:
        """Run the eval suite with pass^k reliability measurement."""
        results_by_category = {}

        for case in self.test_cases:
            category = case["category"]
            if category not in results_by_category:
                results_by_category[category] = {"trials": [], "pass_k": []}

            # Run k trials for reliability measurement
            trial_results = []
            for _ in range(k_trials):
                outcome = await self.agent.run(
                    case["task"], initial_state=case["initial_state"]
                )
                success = case["verifier"](outcome, case["expected_outcome"])
                trial_results.append(success)

            single_trial = sum(trial_results) / k_trials
            pass_k = all(trial_results)

            results_by_category[category]["trials"].append(single_trial)
            results_by_category[category]["pass_k"].append(pass_k)

        # Aggregate by category
        summary = {}
        for category, data in results_by_category.items():
            summary[category] = {
                "n_cases": len(data["trials"]),
                "mean_accuracy": sum(data["trials"]) / len(data["trials"]),
                "pass_k_rate": sum(data["pass_k"]) / len(data["pass_k"]),
                "reliability_gap": (sum(data["trials"]) / len(data["trials"])
                                    - sum(data["pass_k"]) / len(data["pass_k"])),
            }

        return {
            "suite": self.suite_name,
            "overall_accuracy": sum(
                sum(d["trials"]) for d in results_by_category.values()
            ) / max(sum(len(d["trials"]) for d in results_by_category.values()), 1),
            "by_category": summary,
        }
```

**The three essential eval categories every production agent needs:**

1. **Happy path cases** (40% of eval): The task with clean inputs, expected tool availability, no adversarial conditions. This is your baseline.

2. **Edge cases** (40% of eval): Unusual but valid inputs such as very long inputs, inputs in multiple languages, inputs with ambiguous wording that requires clarification, or inputs that seem to require one action but actually require another.

3. **Failure recovery cases** (20% of eval): Tasks where a tool fails midway, where initial information turns out to be wrong, where the first approach doesn't work. This tests agent resilience.

## EvalDriven Improvement: Using Evals to Fix Real Problems

Evaluation is only valuable if it drives improvement. The workflow:

```
1. Run eval suite → identify lowest-scoring categories
2. Sample 10-20 failures from lowest-scoring category
3. Identify the specific step where the agent goes wrong (trajectory analysis)
4. Root cause: prompt issue, tool design issue, context management issue, or model limitation?
5. Fix the root cause
6. Re-run eval → confirm improvement without regression in other categories
7. Add the fixed failure cases to the eval suite as regression tests
```

The most common root causes found through this workflow:

**Tool design issues (40% of failures):** The agent calls the right concept of tool but the tool's API requires format or parameters the agent misuses. Fix: redesign tool APIs to be more LLM-friendly, add validation with informative error messages.

**Context management issues (30% of failures):** The agent loses track of previously gathered information and either re-fetches it or makes decisions inconsistent with earlier findings. Fix: improve memory architecture, add explicit context summaries at decision points.

**Prompt issues (20% of failures):** The system prompt fails to cover the failure scenario, leading the agent to improvise incorrectly. Fix: add specific examples and constraints for the failure scenarios to the system prompt.

**Model limitations (10% of failures):** The underlying model genuinely cannot perform the reasoning required for the task. Fix: upgrade model, decompose into simpler subtasks, or add external tools for the specific capability gap.

## Key Takeaways

- Standard LLM benchmarks (MMLU, HumanEval) are insufficient for agent evaluation because they measure single-turn correctness. Agent evaluation must measure multi-step trajectory quality, tool call correctness, consistency across trials, and efficiency. None of these dimensions are captured by output string matching.
        The pass^k metric from tau-bench is the most production-relevant agent reliability measure. An agent with 80% single-trial accuracy has only 17% probability of succeeding on all 8 trials of the same task (0.8^8). The reliability gap (single_trial_accuracy - pass_k_accuracy) reveals systematic inconsistency that single-trial benchmarks hide.
        SWE-bench is the strongest available coding agent benchmark: real GitHub issues, real test suites, no cherry-picking. Top models (Claude Opus 4.6: 76.8%) use 33-60 API calls and cost $0.36-$0.75 per instance. Resolution rate and cost-per-resolution are the two most important SWE-bench metrics for production deployment decisions.
        LLM-as-judge evaluation for open-ended tasks achieves 80-85% agreement with human raters when rubrics are specific and measurable. Key practices: use the strongest available model as judge, control for position bias with A/B and B/A runs, weight task_completion and accuracy highest, calibrate against 50-100 human annotations before deploying.
        Production evals require sampling from real logs. Public benchmarks measure general capability; production evals measure your specific tasks. The three essential eval categories are happy path (40%), edge cases (40%), and failure recovery cases (20%). Failure recovery cases have the highest diagnostic value for identifying reliability gaps.
        The eval-to-improvement workflow follows these steps: run suite, sample failures from lowest category, perform trajectory analysis to find failure step, identify root cause (tool design, context, prompt, or model), apply fix, and re-run. Add each fixed failure case to the regression suite. This prevents the same failure from recurring silently.
      
  
      
        
          What is SWE-bench and how is it used to evaluate AI agents?
          SWE-bench is a benchmark that evaluates AI coding agents on real software engineering tasks: given a GitHub repository and a bug report or feature request, the agent must produce a code patch that makes failing tests pass without breaking existing tests. The benchmark is constructed from 2,294 merged pull requests across 12 major Python repositories including scikit-learn, Django, and sympy. Each instance is a real issue that a human developer previously solved. Agents are evaluated on resolution rate (percentage of issues where the patch passes all tests), cost per instance (API calls and compute), and number of tool calls required. Current top performers (early 2026) achieve 75-77% resolution rate. SWE-bench is considered the most rigorous available benchmark for coding agents because it uses real repositories, real tests, and real issues rather than synthetic problems.
        
        
          What is the pass^k metric for AI agent evaluation?
          The pass^k metric (pass-hat-k) measures the probability that an AI agent succeeds on all k independent trials of the same task. It was introduced in the tau-bench paper as a more production-relevant alternative to single-trial success rate. If an agent has a single-trial success rate of p, the theoretical pass^k rate is p^k. For p=0.8: pass^1=0.80, pass^4=0.41, pass^8=0.17. This metric reveals reliability issues that single-trial evaluations miss: an agent that works 80% of the time on a given task will fail 83% of repeated 8-trial test sessions. For production systems where the same task type is handled thousands of times daily, pass^k is a much better predictor of user experience than single-trial accuracy. The difference between single_trial_accuracy and pass_k_accuracy (the reliability gap) is the primary metric for identifying agents that work in demos but fail in production.
        
        
          How do you evaluate AI agents on open-ended tasks without ground truth?
          Open-ended AI agent tasks without ground truth answers are evaluated using LLM-as-judge: a strong language model (typically the most capable available) evaluates the agent's output against a structured rubric with specific, measurable criteria. The rubric should score dimensions independently (task completion, factual accuracy, tool efficiency, output format, safety) rather than asking for a holistic quality rating. Key practices: use rubrics with specific per-score criteria (not vague "good/bad" scales), run evaluation in both A-then-B and B-then-A orders to control for position bias, weight task completion and accuracy most heavily, and calibrate the judge against human annotations on a representative sample. LLM-as-judge achieves 80-85% agreement with human raters for pairwise comparisons when rubrics are well-designed, making it feasible for large-scale evaluation without full human annotation.
        
      
  
      
  Agent evaluation is harder than LLM evaluation, but the difficulty is not an excuse for avoiding it. The teams building production agents without systematic evaluation are accumulating reliability debt. They discover failures when users report them, not when their eval suite catches them.
  
  The minimum viable evaluation stack for a production agent: a production eval suite sampled from real tasks (200-500 cases), pass^k measurement with k=3 for reliability assessment, trajectory analysis for efficiency and risk metrics, and a LLM-as-judge pipeline for open-ended tasks. This stack is 1-2 weeks of engineering work and provides qualitatively different insight into agent behavior than running a few manual test cases.
  
  The benchmark landscape (SWE-bench, tau-bench, GAIA) provides calibration against industry performance. Your production evals provide actionable signal for your specific deployment. Both are necessary. Neither is sufficient alone.
  
  The eval-driven improvement cycle is what separates agents that get better over time from agents that fail in the same ways indefinitely. Build the infrastructure, run it continuously, and fix what it finds.
