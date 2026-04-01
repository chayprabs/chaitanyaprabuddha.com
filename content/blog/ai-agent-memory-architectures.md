---
title: "AI Agent Memory Architectures: Episodic, Semantic, and Working Memory in Production"
description: "When they are not, agents confidently repeat mistakes made three sessions ago and forget critical user preferences the moment a conversation ends."
date: "2026-03-29"
tags: ["AI Agents","AI agent memory architecture","episodic memory AI agents"]
readTime: "33 min read"
ogImage: "/og/ai-agent-memory-architectures.png"
canonical: "https://chaitanyaprabuddha.com/blog/ai-agent-memory-architectures"
published: true
---

Most tutorials on AI agent memory stop at `ConversationBufferMemory`. Store the last N messages, inject them into the prompt, done. This is not a memory architecture. It is a scrollback buffer with a token limit. It works until it doesn't. When it fails, it fails in ways that are hard to debug and expensive to fix.

Production AI agents need memory systems designed the same way human memory works: different stores for different types of information, each with its own retrieval mechanism, decay function, and storage cost. When those systems are designed well, agents can maintain context across sessions, recall relevant past interactions, reason over accumulated facts, and learn from corrected mistakes. When they are not, agents confidently repeat mistakes made three sessions ago and forget critical user preferences the moment a conversation ends.

The three primary memory types (episodic, semantic, and working memory), their storage mechanisms, retrieval strategies, and compaction patterns. Every section includes Python code you can use directly.

The framework comes from cognitive science, but the implementation details are specific to LLM-based agents in 2025. If you have built agents that work well in demos but degrade over long sessions, this is what you need.

## The Three Memory Types and Why They Map to Agents

The cognitive science taxonomy of human memory is not an analogy. It is a design framework. The reasons human brains developed different memory systems are the same reasons AI agents need them: different types of information have different access patterns, different relevance decay curves, and different storage costs.

**Working memory** holds the current context of a task: what you are doing right now, what you read, what decision you are in the middle of making. It is fast, limited in capacity, and relevant to the immediate task. For an LLM agent, this maps directly to the context window.

**Episodic memory** records specific events and experiences: this particular conversation, this particular error, this specific user interaction on March 15th at 2pm. It is organized by time and event identity, not by semantic content. When you ask "what did we discuss last week?", you are querying episodic memory.

**Semantic memory** stores general facts and structured knowledge: not "what happened" but "what is true." The user's preferred programming language. The domain ontology for a product. The set of constraints that always apply. Semantic memory is organized by meaning and relationship, not by time.

The reason most agent memory implementations are bad is that they try to serve all three functions with a single mechanism: usually the context window (working memory overflow into episodic) or a vector store (conflating episodic events with semantic facts). The retrieval strategies that work for episodic recall (recency, event identity) harm semantic retrieval (relevance, relationship traversal), and vice versa.

The full taxonomy mapped to implementation:

| Memory Type | Human Analog | Agent Implementation | Access Pattern | Decay |
|---|---|---|---|---|
| Working | Prefrontal cortex | Context window | Always present | Hard cutoff at token limit |
| Episodic | Hippocampus | Event log + vector index | Similarity + recency | Time-weighted |
| Semantic | Cortex (distributed) | Knowledge graph + vector index | Similarity + relationship | Manual invalidation |
| Procedural | Cerebellum | System prompt + tool definitions | Always present | Version-controlled |

A fifth category, **procedural memory** (how to do things), maps to the system prompt and tool definitions. It is always present and not subject to retrieval. Not covered extensively here, but it belongs in the taxonomy.

## Working Memory: The Context Window as a Cognitive Resource

The context window is working memory, but most agent implementations treat it as a dump. Everything goes in (system prompt, conversation history, retrieved memories, tool results, intermediate reasoning) until the limit is hit, at which point something (usually the oldest content) gets truncated.

Treating the context window as a managed cognitive resource means being intentional about what occupies it at each step. The framework below:

**Fixed slots** (always present, positionally stable):
- System prompt (role, constraints, current date, user identity)
- Active task specification
- Tool definitions

**Dynamic slots** (retrieved or generated per-turn):
- Retrieved episodic memories (top-K relevant past interactions)
- Retrieved semantic facts (user preferences, domain facts relevant to current task)
- Active tool call results
- Current reasoning scratchpad

**Compressible slots** (summarized or truncated when pressure increases):
- Recent conversation history (verbatim → summary as context fills)
- Intermediate tool results no longer needed

Here is a context manager that enforces this discipline:

```python
from dataclasses import dataclass, field
from typing import Optional
import tiktoken

@dataclass
class ContextSlot:
    name: str
    content: str
    priority: int          # 1=fixed, 2=dynamic, 3=compressible
    token_count: int = 0
    compressor: Optional[callable] = None

class WorkingMemoryManager:
    """Manages context window allocation across named slots."""

    def __init__(self, model: str = "claude-sonnet-4-6", max_tokens: int = 180_000):
        self.max_tokens = max_tokens
        self.reserve_tokens = 8000   # reserve for completion
        self.budget = max_tokens - reserve_tokens
        self.slots: dict[str, ContextSlot] = {}
        self.encoder = tiktoken.get_encoding("cl100k_base")

    def count_tokens(self, text: str) -> int:
        return len(self.encoder.encode(text))

    def set_slot(self, name: str, content: str, priority: int = 2,
                 compressor: Optional[callable] = None):
        token_count = self.count_tokens(content)
        self.slots[name] = ContextSlot(
            name=name,
            content=content,
            priority=priority,
            token_count=token_count,
            compressor=compressor,
        )

    def total_tokens(self) -> int:
        return sum(s.token_count for s in self.slots.values())

    def assemble(self) -> str:
        """Assemble context, compressing low-priority slots if needed."""
        while self.total_tokens() > self.budget:
            # Find lowest-priority compressible slot
            candidates = [
                s for s in self.slots.values()
                if s.priority == 3 and s.compressor is not None
            ]
            if not candidates:
                # Hard truncate the largest compressible slot
                candidates = [s for s in self.slots.values() if s.priority == 3]
                if not candidates:
                    break  # Can't compress further

            # Compress the largest candidate
            target = max(candidates, key=lambda s: s.token_count)
            compressed = target.compressor(target.content)
            self.set_slot(target.name, compressed, target.priority, target.compressor)

        # Assemble in priority order
        ordered = sorted(self.slots.values(), key=lambda s: s.priority)
        return "\n\n".join(f"<!-- {s.name} -->\n{s.content}" for s in ordered)

    def token_report(self) -> dict:
        return {
            "total": self.total_tokens(),
            "budget": self.budget,
            "utilization": self.total_tokens() / self.budget,
            "by_slot": {s.name: s.token_count for s in self.slots.values()}
        }
```

The key design decision is the **priority system**. Fixed slots (priority 1) never get compressed. Truncating the system prompt to save space is always wrong. Dynamic slots (priority 2) represent the core reasoning material for the current turn. Compressible slots (priority 3) hold history and intermediate results that can be summarized when pressure increases.

**Working memory discipline** means you know at every point in an agent loop exactly what is consuming your context budget and why. Token budget reports should be logged at the start of every turn.

## Episodic Memory: What Happened, When, and Why It Mattered

Episodic memory records specific interactions: individual conversations, tool call sequences, decisions made and their outcomes. The defining property of episodic memory is that it is indexed by time and event identity, not by semantic content alone.

The standard vector store approach to episodic memory makes a mistake. It indexes conversation chunks by semantic embedding and retrieves them by similarity to the current query. This works well when the current topic is similar to past topics. It fails when the user asks "what did we work on last Tuesday?" or "did I mention my database connection issue before?" These are queries where recency and event identity matter more than semantic similarity.

A production episodic memory system needs three things:

1. **Structured event records** (not just raw text)
2. **Dual indexing** (time-based for recency queries, embedding-based for semantic queries)
3. **Salience scoring** (not all events are equally worth remembering)

Here is the event record schema and storage implementation:

```python
import uuid
import json
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from typing import Optional
import numpy as np

@dataclass
class EpisodicEvent:
    """A single recorded agent interaction event."""
    event_id: str
    session_id: str
    timestamp: str               # ISO 8601
    event_type: str              # conversation_turn | tool_call | decision | error
    actor: str                   # user | agent | tool
    content: str                 # the actual content
    summary: str                 # 1-2 sentence summary for quick retrieval
    entities: list[str]          # extracted entities (names, topics, tools)
    outcome: Optional[str]       # success | failure | pending (for tool calls)
    salience_score: float        # 0.0-1.0: how important is this to remember?
    embedding: Optional[list[float]] = None

    @classmethod
    def create(cls, session_id: str, event_type: str, actor: str,
               content: str, summary: str, entities: list[str],
               outcome: Optional[str] = None,
               salience_score: float = 0.5) -> "EpisodicEvent":
        return cls(
            event_id=str(uuid.uuid4()),
            session_id=session_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            event_type=event_type,
            actor=actor,
            content=content,
            summary=summary,
            entities=entities,
            outcome=outcome,
            salience_score=salience_score,
        )

class EpisodicMemoryStore:
    """
    Dual-indexed episodic memory: SQLite for temporal/structured queries,
    vector index for semantic similarity retrieval.
    """

    def __init__(self, db_path: str, embedding_fn: callable):
        import sqlite3
        self.db_path = db_path
        self.embed = embedding_fn
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self._init_schema()

    def _init_schema(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                event_id    TEXT PRIMARY KEY,
                session_id  TEXT NOT NULL,
                timestamp   TEXT NOT NULL,
                event_type  TEXT NOT NULL,
                actor       TEXT NOT NULL,
                content     TEXT NOT NULL,
                summary     TEXT NOT NULL,
                entities    TEXT NOT NULL,  -- JSON array
                outcome     TEXT,
                salience    REAL NOT NULL DEFAULT 0.5,
                embedding   BLOB           -- numpy float32 array
            )
        """)
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp)"
        )
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_session ON events(session_id)"
        )
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_salience ON events(salience DESC)"
        )
        self.conn.commit()

    def store(self, event: EpisodicEvent):
        """Store an event with its embedding."""
        embedding = self.embed(event.summary + " " + event.content[:500])
        embedding_bytes = np.array(embedding, dtype=np.float32).tobytes()

        self.conn.execute("""
            INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (
            event.event_id, event.session_id, event.timestamp,
            event.event_type, event.actor, event.content,
            event.summary, json.dumps(event.entities),
            event.outcome, event.salience_score, embedding_bytes,
        ))
        self.conn.commit()

    def query_recent(self, n: int = 10, session_id: Optional[str] = None) -> list[EpisodicEvent]:
        """Retrieve the N most recent events, optionally filtered by session."""
        if session_id:
            cursor = self.conn.execute(
                "SELECT * FROM events WHERE session_id=? ORDER BY timestamp DESC LIMIT ?",
                (session_id, n)
            )
        else:
            cursor = self.conn.execute(
                "SELECT * FROM events ORDER BY timestamp DESC LIMIT ?", (n,)
            )
        return [self._row_to_event(row) for row in cursor.fetchall()]

    def query_semantic(self, query: str, top_k: int = 5,
                       min_salience: float = 0.3) -> list[tuple[EpisodicEvent, float]]:
        """Retrieve events by semantic similarity to query."""
        query_embedding = np.array(self.embed(query), dtype=np.float32)

        cursor = self.conn.execute(
            "SELECT * FROM events WHERE salience >= ? AND embedding IS NOT NULL",
            (min_salience,)
        )
        rows = cursor.fetchall()

        scored = []
        for row in rows:
            event = self._row_to_event(row)
            stored_embedding = np.frombuffer(row[10], dtype=np.float32)
            # Cosine similarity
            sim = float(np.dot(query_embedding, stored_embedding) /
                       (np.linalg.norm(query_embedding) * np.linalg.norm(stored_embedding) + 1e-8))
            scored.append((event, sim))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def query_time_weighted(self, query: str, top_k: int = 5,
                             recency_weight: float = 0.3) -> list[EpisodicEvent]:
        """
        Retrieve events combining semantic similarity and recency.
        recency_weight=0.0 means pure semantic, 1.0 means pure recency.
        """
        semantic_results = self.query_semantic(query, top_k=top_k * 3)
        if not semantic_results:
            return self.query_recent(top_k)

        now = datetime.now(timezone.utc)
        scored = []
        for event, sem_score in semantic_results:
            event_time = datetime.fromisoformat(event.timestamp)
            age_days = (now - event_time).total_seconds() / 86400
            recency_score = np.exp(-age_days / 30)  # 30-day half-life

            combined = (1 - recency_weight) * sem_score + recency_weight * recency_score
            scored.append((event, combined))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [e for e, _ in scored[:top_k]]

    def _row_to_event(self, row) -> EpisodicEvent:
        return EpisodicEvent(
            event_id=row[0], session_id=row[1], timestamp=row[2],
            event_type=row[3], actor=row[4], content=row[5],
            summary=row[6], entities=json.loads(row[7]),
            outcome=row[8], salience_score=row[9],
        )
```

**Salience scoring** is the piece most implementations skip. Not every event deserves to be remembered with equal weight. Events that should have high salience scores include:

- Explicit user corrections ("no, that's wrong, my database uses PostgreSQL not MySQL")
- Task completions with outcomes ("successfully deployed to production")
- User preference statements ("I prefer to see code before explanation")
- Error events that changed the approach

A simple salience heuristic that works in practice:

```python
def score_salience(event_type: str, actor: str, content: str,
                   outcome: Optional[str]) -> float:
    base = 0.4

    # Corrections and preferences are highly salient
    correction_signals = ["actually", "that's wrong", "no,", "incorrect",
                          "i prefer", "i want", "always", "never"]
    if any(s in content.lower() for s in correction_signals):
        base = max(base, 0.85)

    # Failed outcomes are salient (learn from errors)
    if outcome == "failure":
        base = max(base, 0.75)

    # Successful completions are moderately salient
    if outcome == "success" and event_type == "tool_call":
        base = max(base, 0.6)

    # User-initiated content generally more salient than agent output
    if actor == "user":
        base = min(base + 0.1, 1.0)

    return base
```

## Semantic Memory: Facts, Preferences, and World Knowledge

Semantic memory is the most powerful and the most dangerous memory type for agents. Done well, it makes an agent feel like it knows the user and domain, recalling preferences, applying constraints automatically, building context over hundreds of sessions. Done badly, it produces confident hallucination: the agent "remembers" facts it extracted incorrectly and applies them indefinitely until someone explicitly corrects it.

The key difference from episodic memory is that **semantic memory stores facts extracted from events, not the events themselves**. It answers "what is true" not "what happened."

The data model for semantic memory should reflect this:

```python
from enum import Enum
from typing import Optional
import sqlite3
import json
from datetime import datetime, timezone

class FactConfidence(Enum):
    STATED = "stated"          # user explicitly stated this
    INFERRED = "inferred"      # agent inferred from behavior
    CONFIRMED = "confirmed"    # user confirmed after inference
    INVALIDATED = "invalidated"  # known to be false now

@dataclass
class SemanticFact:
    """A structured fact extracted from agent interactions."""
    fact_id: str
    subject: str               # who/what this fact is about
    predicate: str             # what relationship/property
    value: str                 # the actual value
    confidence: FactConfidence
    source_event_ids: list[str]   # episodic events this was extracted from
    created_at: str
    updated_at: str
    last_accessed_at: str
    access_count: int

    def to_natural_language(self) -> str:
        return f"{self.subject} {self.predicate} {self.value}"

class SemanticMemoryStore:
    """
    Structured fact store for agent semantic memory.
    Supports extraction, update, invalidation, and retrieval.
    """

    def __init__(self, db_path: str, embedding_fn: callable):
        self.db_path = db_path
        self.embed = embedding_fn
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self._init_schema()

    def _init_schema(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS facts (
                fact_id      TEXT PRIMARY KEY,
                subject      TEXT NOT NULL,
                predicate    TEXT NOT NULL,
                value        TEXT NOT NULL,
                confidence   TEXT NOT NULL,
                source_events TEXT NOT NULL,  -- JSON array
                created_at   TEXT NOT NULL,
                updated_at   TEXT NOT NULL,
                last_accessed TEXT NOT NULL,
                access_count INTEGER DEFAULT 0,
                embedding    BLOB
            )
        """)
        # Unique constraint: one fact per subject+predicate
        self.conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_predicate
            ON facts(subject, predicate)
        """)
        self.conn.commit()

    def upsert(self, subject: str, predicate: str, value: str,
               confidence: FactConfidence, source_event_id: str):
        """Insert or update a fact. Handles conflict resolution."""
        now = datetime.now(timezone.utc).isoformat()
        fact_text = f"{subject} {predicate} {value}"
        embedding = self.embed(fact_text)
        embedding_bytes = np.array(embedding, dtype=np.float32).tobytes()

        # Check if fact exists
        existing = self.conn.execute(
            "SELECT fact_id, source_events, confidence FROM facts WHERE subject=? AND predicate=?",
            (subject, predicate)
        ).fetchone()

        if existing:
            # Update: merge source events, upgrade confidence if stronger
            sources = json.loads(existing[1])
            if source_event_id not in sources:
                sources.append(source_event_id)

            # Confidence hierarchy: STATED > CONFIRMED > INFERRED
            conf_priority = {
                FactConfidence.STATED: 3,
                FactConfidence.CONFIRMED: 2,
                FactConfidence.INFERRED: 1,
                FactConfidence.INVALIDATED: 0,
            }
            current_conf = FactConfidence(existing[2])
            new_conf = confidence if (conf_priority[confidence] > conf_priority[current_conf]) else current_conf

            self.conn.execute("""
                UPDATE facts SET value=?, confidence=?, source_events=?,
                updated_at=?, embedding=?
                WHERE subject=? AND predicate=?
            """, (value, new_conf.value, json.dumps(sources), now,
                  embedding_bytes, subject, predicate))
        else:
            fact_id = str(uuid.uuid4())
            self.conn.execute("""
                INSERT INTO facts VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """, (fact_id, subject, predicate, value, confidence.value,
                  json.dumps([source_event_id]), now, now, now, 0, embedding_bytes))

        self.conn.commit()

    def invalidate(self, subject: str, predicate: str):
        """Mark a fact as no longer valid (but keep it for audit trail)."""
        now = datetime.now(timezone.utc).isoformat()
        self.conn.execute(
            "UPDATE facts SET confidence=?, updated_at=? WHERE subject=? AND predicate=?",
            (FactConfidence.INVALIDATED.value, now, subject, predicate)
        )
        self.conn.commit()

    def get_for_subject(self, subject: str,
                         exclude_invalidated: bool = True) -> list[SemanticFact]:
        """Get all facts about a subject."""
        if exclude_invalidated:
            cursor = self.conn.execute(
                "SELECT * FROM facts WHERE subject=? AND confidence != 'invalidated'",
                (subject,)
            )
        else:
            cursor = self.conn.execute("SELECT * FROM facts WHERE subject=?", (subject,))

        results = [self._row_to_fact(r) for r in cursor.fetchall()]
        self._update_access(subject)
        return results

    def query_semantic(self, query: str, top_k: int = 10,
                        exclude_invalidated: bool = True) -> list[SemanticFact]:
        """Retrieve facts by semantic similarity to query context."""
        query_embedding = np.array(self.embed(query), dtype=np.float32)

        if exclude_invalidated:
            cursor = self.conn.execute(
                "SELECT * FROM facts WHERE confidence != 'invalidated' AND embedding IS NOT NULL"
            )
        else:
            cursor = self.conn.execute("SELECT * FROM facts WHERE embedding IS NOT NULL")

        rows = cursor.fetchall()
        scored = []
        for row in rows:
            fact = self._row_to_fact(row)
            stored_emb = np.frombuffer(row[10], dtype=np.float32)
            sim = float(np.dot(query_embedding, stored_emb) /
                       (np.linalg.norm(query_embedding) * np.linalg.norm(stored_emb) + 1e-8))
            scored.append((fact, sim))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [f for f, _ in scored[:top_k]]

    def _update_access(self, subject: str):
        now = datetime.now(timezone.utc).isoformat()
        self.conn.execute(
            "UPDATE facts SET last_accessed=?, access_count=access_count+1 WHERE subject=?",
            (now, subject)
        )
        self.conn.commit()

    def _row_to_fact(self, row) -> SemanticFact:
        return SemanticFact(
            fact_id=row[0], subject=row[1], predicate=row[2],
            value=row[3], confidence=FactConfidence(row[4]),
            source_event_ids=json.loads(row[5]),
            created_at=row[6], updated_at=row[7],
            last_accessed_at=row[8], access_count=row[9],
        )
```

**Fact extraction** is where semantic memory gets its information. The pattern is to run a lightweight extraction pass on high-salience events after they are stored.

```python
async def extract_facts_from_event(event: EpisodicEvent,
                                    llm_client,
                                    semantic_store: SemanticMemoryStore):
    """Extract structured facts from a high-salience event."""
    if event.salience_score < 0.6:
        return  # Only extract from salient events

    extraction_prompt = f"""Extract structured facts from this interaction.
Output JSON array only.

Interaction:
{event.content[:1000]}

Format: [{{"subject": "user", "predicate": "prefers", "value": "Python over JavaScript"}}, ...]
Only extract clear, persistent facts. Skip transient information.
"""

    response = await llm_client.complete(extraction_prompt, max_tokens=500)

    try:
        facts = json.loads(response)
        for fact in facts:
            confidence = (FactConfidence.STATED if event.actor == "user"
                         else FactConfidence.INFERRED)
            semantic_store.upsert(
                subject=fact["subject"],
                predicate=fact["predicate"],
                value=fact["value"],
                confidence=confidence,
                source_event_id=event.event_id,
            )
    except json.JSONDecodeError:
        pass  # Extraction failed, skip silently
```

The upsert model handles the key semantic memory problem: what happens when a user corrects a previously extracted fact? The `invalidate()` method marks old facts without deleting them (the audit trail is important), and a new `upsert()` with `STATED` confidence creates the correct fact. Because of the unique constraint on subject+predicate, there is exactly one current value for any given fact.

## Retrieval Strategies: How to Surface the Right Memory at the Right Time

Having well-structured memory stores is necessary but not sufficient. The retrieval strategy (when to query which store, with what parameters, and how to blend results) determines whether the agent actually uses its memory effectively.

**When to retrieve episodic memory:**
- At session start: load recent events from previous sessions (last 3-5 sessions)
- When user references past interactions ("last time we", "remember when", "I mentioned")
- When the current task resembles past tasks (semantic similarity to previous event summaries)
- After tool failures: query for similar past failures and their resolutions

**When to retrieve semantic memory:**
- At the start of every turn: load facts about the current user/context (the user's profile)
- When the task involves domain-specific constraints (retrieve relevant domain facts)
- When the agent is about to make a recommendation (retrieve stated preferences)

The most important retrieval principle: **retrieve before reasoning, not after**. Memory should be in the context window before the model starts generating a response, not used to validate after the fact.

Here is the retrieval orchestration layer:

```python
class MemoryRetriever:
    """
    Orchestrates retrieval across episodic and semantic stores
    to populate working memory slots.
    """

    def __init__(self, episodic: EpisodicMemoryStore,
                 semantic: SemanticMemoryStore,
                 working: WorkingMemoryManager):
        self.episodic = episodic
        self.semantic = semantic
        self.working = working

    def prepare_turn(self, user_id: str, session_id: str,
                     current_message: str, is_new_session: bool):
        """
        Full retrieval pipeline for a conversation turn.
        Called before the LLM generates a response.
        """

        # 1. Always load user's semantic facts (their profile)
        user_facts = self.semantic.get_for_subject(user_id)
        if user_facts:
            facts_text = "\n".join(
                f"- {f.predicate}: {f.value} ({f.confidence.value})"
                for f in user_facts
            )
            self.working.set_slot(
                "user_profile",
                f"Known facts about user:\n{facts_text}",
                priority=1,  # Fixed: always in context
            )

        # 2. On new session start, load recent session history
        if is_new_session:
            recent_events = self.episodic.query_recent(n=5)
            if recent_events:
                history_text = self._format_events_for_context(recent_events)
                self.working.set_slot(
                    "session_history",
                    f"Recent interactions (from previous sessions):\n{history_text}",
                    priority=2,
                )

        # 3. Retrieve semantically relevant past events
        relevant_events = self.episodic.query_time_weighted(
            query=current_message,
            top_k=3,
            recency_weight=0.2,
        )
        if relevant_events:
            relevant_text = self._format_events_for_context(relevant_events)
            self.working.set_slot(
                "relevant_history",
                f"Relevant past interactions:\n{relevant_text}",
                priority=2,
            )

        # 4. Retrieve relevant semantic facts (domain knowledge)
        relevant_facts = self.semantic.query_semantic(current_message, top_k=5)
        domain_facts = [f for f in relevant_facts if f.subject != user_id]
        if domain_facts:
            domain_text = "\n".join(
                f"- {f.subject} {f.predicate} {f.value}"
                for f in domain_facts
            )
            self.working.set_slot(
                "domain_facts",
                f"Relevant domain knowledge:\n{domain_text}",
                priority=2,
            )

        return self.working.token_report()

    def _format_events_for_context(self, events: list[EpisodicEvent]) -> str:
        lines = []
        for e in events:
            ts = e.timestamp[:10]  # Date only
            lines.append(f"[{ts}] {e.actor}: {e.summary}")
        return "\n".join(lines)
```

**Avoiding retrieval noise** is as important as retrieval itself. A common failure mode is retrieving 20 marginally relevant memories that fill the context with low-signal content, diluting the relevant facts. Guard against this with:

- Minimum similarity thresholds (discard results below 0.65 cosine similarity)
- Maximum retrieval budgets per category (3-5 events, not 20)
- Token budget caps per slot (200 tokens for user profile, 500 for relevant history)
- Deduplication: if two retrieved events say the same thing, keep only the most recent

## Memory Compaction: Managing Growth Without Losing Signal

Left unmanaged, episodic memory grows indefinitely. A production agent with one year of interactions might have 50,000+ events. Full-scan semantic search at that scale is slow and expensive. The oldest, lowest-salience events consume index space while contributing zero value to retrieval.

Compaction is the process of periodically consolidating memory to remove noise while preserving signal. The model mirrors what human long-term memory consolidation during sleep does: important events get encoded more deeply, unimportant ones fade.

**Compaction strategy:**

1. **Event consolidation**: Group related low-salience events from the same session into a single summary event with higher salience.
2. **Fact consolidation**: Events that simply confirm existing semantic facts can be archived (the fact persists, the event does not need to be individually searchable).
3. **Time-decay deletion**: Events older than N days with salience below a threshold get soft-deleted (marked archived, excluded from retrieval, optionally physically deleted after M days).
4. **Session summarization**: At session end, generate a 3-5 sentence session summary and store it as a high-salience event. This summary becomes the primary retrieval artifact for that session. The individual turn events can be archived.

```python
class MemoryCompactor:
    """
    Periodic compaction to manage memory store growth.
    Run as a background job (e.g., nightly cron).
    """

    def __init__(self, episodic: EpisodicMemoryStore,
                 semantic: SemanticMemoryStore,
                 llm_client):
        self.episodic = episodic
        self.semantic = semantic
        self.llm = llm_client

    async def compact_session(self, session_id: str):
        """
        At session end: generate summary, archive turn-level events.
        """
        session_events = self.episodic.query_recent(n=100, session_id=session_id)
        if len(session_events) < 3:
            return  # Not enough events to warrant compaction

        # Generate session summary
        events_text = "\n".join(
            f"{e.actor}: {e.content[:200]}" for e in session_events[:20]
        )
        summary_prompt = f"""Summarize this agent session in 3-5 sentences.
Focus on: what was accomplished, key decisions made, user preferences revealed, errors encountered.

Session:
{events_text}

Summary:"""

        summary = await self.llm.complete(summary_prompt, max_tokens=300)

        # Store summary as a high-salience synthetic event
        summary_event = EpisodicEvent.create(
            session_id=session_id,
            event_type="session_summary",
            actor="system",
            content=summary,
            summary=summary[:200],
            entities=list(set(
                entity
                for e in session_events
                for entity in e.entities
            )),
            outcome="success",
            salience_score=0.9,
        )
        self.episodic.store(summary_event)

        # Archive individual turn events (exclude the summary)
        self._archive_events(
            [e.event_id for e in session_events],
            reason="compacted_into_summary"
        )

    def run_decay_pass(self, days_threshold: int = 90,
                       salience_threshold: float = 0.4):
        """
        Soft-delete old, low-salience events.
        High-salience events (corrections, errors) are kept indefinitely.
        """
        cutoff = (datetime.now(timezone.utc) -
                  timedelta(days=days_threshold)).isoformat()

        result = self.episodic.conn.execute("""
            UPDATE events SET confidence='archived'
            WHERE timestamp < ? AND salience < ? AND event_type != 'session_summary'
        """, (cutoff, salience_threshold))

        archived_count = result.rowcount
        self.episodic.conn.commit()
        return archived_count

    def _archive_events(self, event_ids: list[str], reason: str):
        placeholders = ",".join("?" * len(event_ids))
        self.episodic.conn.execute(
            f"UPDATE events SET outcome=? WHERE event_id IN ({placeholders})",
            [f"archived:{reason}"] + event_ids
        )
        self.episodic.conn.commit()
```

**Compaction cadence recommendations:**
- Session-level compaction: run at session end (within 5 minutes of last activity)
- Decay pass: run nightly for events older than 90 days with salience < 0.4
- Full reindex: run weekly if using vector stores that accumulate soft-deleted records
- Fact validation: run monthly to flag semantic facts that have not been accessed in 60+ days for review

The session summary approach is powerful for long-running agent deployments. A year of sessions compacts into 365 session summaries (one per day of use), each high-salience. The agent can retrieve "what did we accomplish in Q4?" by semantic search over session summaries, without scanning 50,000 individual turn events.

## The Full Memory Hierarchy: Putting It Together

The full architecture for a production agent memory system has five layers:

**Layer 1: In-context working memory** (context window)
- Always present, managed by WorkingMemoryManager
- Budget: ~180K tokens for large models, ~8K for edge deployments
- Composition: system prompt + user profile + retrieved memories + current conversation

**Layer 2: Session episodic buffer** (in-process, fast)
- Current session events before they are persisted
- Python list or Redis (if multi-instance deployment)
- Flushed to persistent store every N events or at session end

**Layer 3: Persistent episodic store** (SQLite / PostgreSQL + vector index)
- All historical events from all sessions
- Dual-indexed: timestamp for recency queries, embeddings for semantic
- Compaction maintains a manageable size (session summaries replace turn events)

**Layer 4: Semantic fact store** (SQLite / PostgreSQL)
- Structured facts extracted from high-salience events
- Subject+predicate uniqueness ensures no contradictions
- Confidence tracking handles corrections cleanly

**Layer 5: Long-term vector index** (Pinecone / Weaviate / pgvector)
- For deployments with millions of events or facts
- Approximate nearest neighbor for low-latency semantic search
- Synchronized from layers 3 and 4 via CDC (change data capture)

```
┌─────────────────────────────────────────────┐
│          Layer 1: Context Window            │
│   (system prompt + retrieved + current)     │
└──────────────────────┬──────────────────────┘
                       │ inject
┌──────────────────────┼──────────────────────┐
│   Layer 2: Session   │  Layer 4: Semantic   │
│   Episodic Buffer    │  Fact Store          │
│   (in-process)       │  (persistent SQL)    │
└──────────┬───────────┴──────────┬───────────┘
           │ flush                │ extract
┌──────────┴──────────────────────┴───────────┐
│          Layer 3: Persistent                │
│          Episodic Store                     │
│          (SQL + embeddings)                 │
└──────────────────────┬──────────────────────┘
                       │ sync (large deployments)
┌──────────────────────┴──────────────────────┐
│          Layer 5: Vector Index              │
│          (Pinecone / pgvector)              │
└─────────────────────────────────────────────┘
```

For most production deployments with under 100K events, layers 1-4 using SQLite are sufficient. Layer 5 becomes necessary when:
- Event count exceeds ~500K
- Embedding search latency exceeds 200ms (impacts turn latency)
- Multi-agent sharing requires a centralized index

**SQLite performance at scale:** SQLite with WAL mode handles 100K+ events efficiently. The embedding scan can be parallelized with Python's `concurrent.futures`. At 100K events with 1536-dimensional embeddings (float32), the embedding storage is approximately 600MB, which is manageable.

## Production Patterns: Persistence, Indexing, and MultiAgent Sharing

**Pattern 1: Namespaced memory for multi-tenant deployments**

When one agent deployment serves multiple users or organizations, memory must be strictly namespaced. A bug that allows memory to leak across tenant boundaries is a security incident, not just a UX bug.

```python
@dataclass
class MemoryNamespace:
    tenant_id: str
    user_id: str
    agent_id: str

    @property
    def partition_key(self) -> str:
        return f"{self.tenant_id}:{self.agent_id}:{self.user_id}"

# All store operations take a namespace parameter
def get_user_facts(self, namespace: MemoryNamespace) -> list[SemanticFact]:
    subject = f"{namespace.partition_key}:user"
    return self.get_for_subject(subject)
```

**Pattern 2: Shared semantic memory for multi-agent pipelines**

In a pipeline with multiple specialized agents (planner, executor, critic), semantic memory should be shared. All agents need to know user preferences and domain facts. Episodic memory should be partially shared: agents see each other's completed task summaries but not each other's internal reasoning traces.

```python
class SharedSemanticStore(SemanticMemoryStore):
    """
    Semantic store shared across agents in a pipeline.
    All agents read, only designated agents write.
    """

    def __init__(self, db_path: str, embedding_fn: callable,
                 write_enabled_agents: set[str]):
        super().__init__(db_path, embedding_fn)
        self.write_enabled = write_enabled_agents

    def upsert(self, subject: str, predicate: str, value: str,
               confidence: FactConfidence, source_event_id: str,
               agent_id: str = "unknown"):
        if agent_id not in self.write_enabled:
            raise PermissionError(
                f"Agent {agent_id} is not authorized to write semantic memory"
            )
        super().upsert(subject, predicate, value, confidence, source_event_id)
```

**Pattern 3: Memory as a service via MCP**

For agent frameworks that support MCP, exposing memory as MCP tools allows any agent in the ecosystem to read and write to the memory store:

```python
from mcp.server import FastMCP
from mcp import ToolError

app = FastMCP("agent-memory-service")

@app.tool()
async def store_fact(subject: str, predicate: str, value: str,
                     confidence: str = "inferred") -> str:
    """Store a semantic fact about a user or domain concept."""
    try:
        conf = FactConfidence(confidence)
        semantic_store.upsert(subject, predicate, value, conf,
                               source_event_id="mcp_direct")
        return f"Stored: {subject} {predicate} {value}"
    except ValueError:
        raise ToolError(f"Invalid confidence value: {confidence}")

@app.tool()
async def recall_facts(subject: str) -> str:
    """Retrieve all known facts about a subject."""
    facts = semantic_store.get_for_subject(subject)
    if not facts:
        return f"No facts known about {subject}"
    return "\n".join(f.to_natural_language() for f in facts)

@app.tool()
async def search_memory(query: str, memory_type: str = "both") -> str:
    """Search episodic and/or semantic memory by semantic similarity."""
    results = []

    if memory_type in ("semantic", "both"):
        facts = semantic_store.query_semantic(query, top_k=5)
        results.extend(f"[fact] {f.to_natural_language()}" for f in facts)

    if memory_type in ("episodic", "both"):
        events = episodic_store.query_time_weighted(query, top_k=3)
        results.extend(f"[event] {e.summary}" for e in events)

    return "\n".join(results) if results else "No relevant memories found"
```

**Pattern 4: Async memory writes to avoid latency impact**

Memory writes should never be on the critical path of a response. Write to the session buffer synchronously, flush to persistent store asynchronously:

```python
import asyncio
from collections import deque

class AsyncMemoryFlusher:
    def __init__(self, episodic: EpisodicMemoryStore,
                 semantic: SemanticMemoryStore,
                 flush_interval_seconds: float = 2.0):
        self.episodic = episodic
        self.semantic = semantic
        self.flush_interval = flush_interval_seconds
        self.event_queue: deque[EpisodicEvent] = deque()
        self._flush_task = None

    async def start(self):
        self._flush_task = asyncio.create_task(self._flush_loop())

    async def queue_event(self, event: EpisodicEvent):
        """Non-blocking: queue event and return immediately."""
        self.event_queue.append(event)

    async def _flush_loop(self):
        while True:
            await asyncio.sleep(self.flush_interval)
            await self._flush()

    async def _flush(self):
        batch = []
        while self.event_queue:
            batch.append(self.event_queue.popleft())

        if not batch:
            return

        # Write batch to persistent store
        for event in batch:
            self.episodic.store(event)

        # Async fact extraction for high-salience events
        salient = [e for e in batch if e.salience_score >= 0.6]
        if salient:
            tasks = [extract_facts_from_event(e, llm_client, self.semantic)
                     for e in salient]
            await asyncio.gather(*tasks, return_exceptions=True)
```

## Evaluating Memory Systems: What to Measure and How

Memory systems are hard to evaluate because their failures are often invisible. The agent works fine, it does not improve over time or apply knowledge it should have. The metrics that matter:

**Retrieval precision@K**: Of the K memories retrieved for a given context, what fraction were actually relevant? Measure with human annotation on a held-out evaluation set. Target: precision@5 > 0.7.

**Recall coverage**: Given a context where a specific past event is definitively relevant, was it retrieved? Test by injecting synthetic high-salience events and checking if they appear in subsequent retrievals. Target: >90% for events with salience > 0.7.

**Fact accuracy**: Are extracted semantic facts correct? Sample facts from the semantic store and verify against the source event. Common failure mode: the LLM extracts an inferred preference as a stated preference ("the user seemed to prefer Python" → fact: "user prefers Python", confidence: STATED). Target: <5% extraction errors on salient events.

**Session continuity**: Does the agent correctly apply knowledge from previous sessions? Test with two-session scenarios: state a preference in session 1, ask a preference-dependent question in session 2. Measure application rate. Target: >80% application for stated preferences.

**Memory latency**: How much latency does the retrieval pipeline add to turn response time? Acceptable budget: <100ms for local SQLite, <200ms for remote vector store. Measure p95 retrieval latency in production.

```python
class MemoryEvaluator:
    """Evaluation harness for memory system quality."""

    def evaluate_retrieval_precision(self,
                                      test_cases: list[dict],
                                      retriever: MemoryRetriever,
                                      k: int = 5) -> float:
        """
        test_cases: list of {"query": str, "relevant_event_ids": list[str]}
        """
        precisions = []
        for case in test_cases:
            retrieved = retriever.episodic.query_time_weighted(case["query"], top_k=k)
            retrieved_ids = {e.event_id for e in retrieved}
            relevant_ids = set(case["relevant_event_ids"])

            if not retrieved_ids:
                precisions.append(0.0)
            else:
                precision = len(retrieved_ids & relevant_ids) / len(retrieved_ids)
                precisions.append(precision)

        return sum(precisions) / len(precisions) if precisions else 0.0

    def measure_retrieval_latency(self, queries: list[str],
                                   store: EpisodicMemoryStore,
                                   n_trials: int = 100) -> dict:
        import time
        latencies = []
        for query in queries[:n_trials]:
            start = time.perf_counter()
            store.query_time_weighted(query, top_k=5)
            latencies.append((time.perf_counter() - start) * 1000)  # ms

        latencies.sort()
        return {
            "p50_ms": latencies[len(latencies) // 2],
            "p95_ms": latencies[int(len(latencies) * 0.95)],
            "p99_ms": latencies[int(len(latencies) * 0.99)],
            "mean_ms": sum(latencies) / len(latencies),
        }
```

The single most important evaluation for production is **session continuity on stated preferences**. If users have to repeat themselves, the memory system has failed regardless of what the retrieval metrics say.

## Key Takeaways

- Memory types map directly to storage and retrieval strategies: working memory = context window (managed resource with priority slots), episodic memory = time-indexed event log with embedding search, semantic memory = structured fact store with upsert and invalidation. Do not conflate them.

- Episodic memory needs dual indexing: timestamp-based for recency queries ("what did we discuss last week?") and embedding-based for semantic similarity ("have we encountered this error before?"). Single-index approaches fail one of the two query patterns.

- Salience scoring determines what gets remembered. Events where the user corrects the agent, changes direction, or states explicit preferences should be scored 0.75-0.90. Routine tool calls score 0.4-0.5. Only high-salience events should trigger semantic fact extraction.

- Session compaction is mandatory for production deployments. At session end, generate a 3-5 sentence session summary as a high-salience synthetic event, then archive the individual turn events. This maintains retrieval quality as the event store grows to millions of records.

- Memory writes must be async (off the critical path). Queue events to an in-process buffer, flush to persistent store in the background. Synchronous memory writes on every turn add 50-200ms of latency and block the response loop unnecessarily.

- The semantic fact store's uniqueness constraint (one value per subject+predicate) is a feature, not a limitation. It ensures the agent has exactly one current value for any given fact, handles corrections cleanly via upsert, and makes the agent's knowledge state auditable.

## FAQ

### What is the difference between episodic and semantic memory in AI agents?

Episodic memory in AI agents records specific events: individual conversations, tool calls, and interactions indexed by time and event identity. It answers "what happened" questions: "did we discuss this before?", "what did I ask last Tuesday?". Semantic memory stores extracted facts and persistent knowledge: user preferences, domain constraints, learned relationships, indexed by meaning rather than time. It answers "what is true" questions: "what language does this user prefer?", "what are the constraints for this API?". Production agents need both: episodic for continuity and context, semantic for applying accumulated knowledge. Using only a single memory mechanism (like ConversationBufferMemory) conflates the two access patterns and fails at both.

### How do AI agents store longterm memory across sessions?

AI agents store long-term memory across sessions by persisting events and facts to a database (SQLite for single-instance deployments, PostgreSQL for multi-instance) with associated vector embeddings for semantic retrieval. At the start of each new session, the agent queries this persistent store for recent events from previous sessions and semantically relevant past interactions, injecting them into the context window before generating any response. The key mechanism is session compaction: at session end, a summary of the session is generated and stored as a high-salience synthetic event, and individual turn events are archived. This keeps the persistent store manageable while maintaining retrievable summaries of all past sessions.

### What is working memory in the context of LLM agents?

Working memory in LLM agents is the context window: the finite set of tokens the model can attend to when generating a response. Unlike human working memory, it does not degrade gracefully at the boundary; it has a hard token limit beyond which content is simply excluded. A well-designed agent treats the context window as a managed cognitive resource with named slots and priority levels: fixed slots (system prompt, user profile) that are always present, dynamic slots (retrieved memories, tool results) that are populated per-turn from external stores, and compressible slots (conversation history) that are summarized when the budget fills. The working memory manager's job is to ensure the highest-signal content is always present within the token budget.

### How does vector store retrieval work for agent memory?

Vector store retrieval for agent memory works by encoding both stored content and the current query into dense vector embeddings (typically 1536-dimensional float32 vectors) and performing approximate nearest-neighbor search to find stored content semantically similar to the current context. The query is usually the current user message or a combination of the current message and recent context. The top-K most similar results are returned and injected into the context window. For agent memory, pure similarity retrieval should be combined with time-weighting (recent events score higher than old ones for equal similarity) and salience filtering (exclude low-salience events below a threshold). Pure similarity search without these adjustments retrieves the wrong events for temporal queries and floods the context with low-value old content.

### How should AI agents handle contradictory information across sessions?

AI agents should handle contradictory information using a confidence-tracked semantic fact store with upsert semantics. Each fact is stored with a confidence level (STATED by user, INFERRED by agent, CONFIRMED after validation, INVALIDATED after correction). The unique constraint on subject+predicate means there is always exactly one current value for any given fact. When the user corrects a fact ("actually, I use PostgreSQL, not MySQL"), the agent calls invalidate() on the old fact and upsert() on the new one with STATED confidence. The old fact is preserved with INVALIDATED status for audit purposes but excluded from retrieval. This is more reliable than trying to detect contradictions in the context window, which requires the agent to reason about its own prior statements across sessions.

### How do you prevent AI agent memory from growing too large?

AI agent memory is kept manageable through three mechanisms working together: (1) Salience-based storage: only high-salience events trigger full storage and fact extraction; routine low-salience events are stored minimally or not at all. (2) Session compaction: at session end, a 3-5 sentence summary is generated and stored as a high-salience synthetic event, then the individual turn events are archived and eventually soft-deleted. One year of daily sessions produces 365 searchable summaries rather than 50,000 individual turn events. (3) Time-decay deletion: events older than 90 days with salience below 0.4 are soft-deleted in nightly compaction passes. High-salience events (corrections, stated preferences, notable errors) are retained indefinitely. Together these mechanisms maintain a bounded-size, high-signal store regardless of deployment duration.

The agent memory systems most tutorials demonstrate (a rolling buffer of the last N messages) are fine for demos and prototypes. They fail in production for a predictable reason: they do not differentiate between types of information, so they cannot apply the right access pattern to each type. Recency works for working memory, not for semantic facts. Similarity works for semantic retrieval, not for temporal queries.

This architecture (working memory as a managed context window, episodic memory as a dual-indexed event log, semantic memory as a structured fact store with upsert semantics) addresses this directly. Each memory type has the storage, indexing, and retrieval strategy appropriate to what it stores.

The implementation is not small. A production-quality memory system is 600-800 lines of code, a background flush process, a nightly compaction job, and an evaluation harness. This is the right amount of complexity for a system that makes agents useful across sessions and months of use.

The payoff is agents that apply accumulated knowledge automatically, handle corrections cleanly, and improve over time rather than starting fresh every session. This is the difference between an agent that is impressive in a demo and one that is useful in production.
