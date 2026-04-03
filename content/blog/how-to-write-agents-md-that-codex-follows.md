---
title: "How to Write AGENTS.md That Codex Actually Follows"
description: "Learn how to write scoped, testable AGENTS.md instructions that Codex reliably follows instead of ignoring."
date: "2026-04-02"
tags: ["AGENTS.md","Codex","AI coding agents","developer tooling","prompt engineering","OpenAI Codex","repository documentation"]
readTime: "31 min read"
ogImage: "/og/how-to-write-agents-md-that-codex-follows.png"
canonical: "https://chaitanyaprabuddha.com/blog/how-to-write-agents-md-that-codex-follows"
published: true
---

# How to Write an AGENTS.md That Codex Actually Follows

If you have tried writing a **Codex AGENTS.md** file and watched the agent cheerfully ignore half of it, you are not alone. Most teams dump a wall of prose into their repo root, cross their fingers, and wonder why the AI coding agent still formats code wrong, skips tests, or invents APIs that do not exist.

The problem is almost never Codex itself. The problem is that your instructions are vague, untestable, and unscoped. This guide will show you exactly how to write an **AGENTS.md** that Codex reliably obeys, with real examples, structural patterns, and a testing methodology you can adopt today.

By the end of this post you will understand the difference between instructions that work and instructions that get silently discarded, and you will have a repeatable framework for writing **AGENTS.md best practices** that scale across any codebase.

---

## Table of Contents

- [What Is AGENTS.md and Why Does It Matter](#what-is-agentsmd-and-why-does-it-matter)
- [Why Most AGENTS.md Files Fail](#why-most-agentsmd-files-fail)
- [The Core Principles of Effective Codex Instructions](#the-core-principles-of-effective-codex-instructions)
- [Scoped Instructions: The Single Most Important Pattern](#scoped-instructions-the-single-most-important-pattern)
- [Writing Testable Rules Instead of Vague Guidelines](#writing-testable-rules-instead-of-vague-guidelines)
- [AGENTS.md Examples: Good vs Bad](#agentsmd-examples-good-vs-bad)
- [Structuring Your AGENTS.md for Large Codebases](#structuring-your-agentsmd-for-large-codebases)
- [Directory-Level AGENTS.md Files](#directory-level-agentsmd-files)
- [How Codex Resolves Conflicting Instructions](#how-codex-resolves-conflicting-instructions)
- [Integrating AGENTS.md with Your CI Pipeline](#integrating-agentsmd-with-your-ci-pipeline)
- [Advanced Patterns for Complex Projects](#advanced-patterns-for-complex-projects)
- [Common Mistakes and How to Fix Them](#common-mistakes-and-how-to-fix-them)
- [Measuring Whether Your AGENTS.md Actually Works](#measuring-whether-your-agentsmd-actually-works)
- [FAQ: AGENTS.md and Codex Instructions](#faq-agentsmd-and-codex-instructions)
- [Key Takeaways](#key-takeaways)

---

## What Is AGENTS.md and Why Does It Matter

AGENTS.md is a markdown file placed in your repository that gives AI coding agents like Codex explicit instructions about how to work within your project. Think of it as a machine-readable contributor guide: it tells the agent what conventions to follow, what patterns to use, and what mistakes to avoid.

Unlike a README that targets human developers, **AGENTS.md targets autonomous agents** that read your repository, generate code, and submit pull requests. When written well, it dramatically reduces the back-and-forth cycle of reviewing and rejecting AI-generated code.

The file matters because Codex does not inherently understand your team's conventions. It knows how to write Python, TypeScript, or Rust in general terms. It does not know that your team uses `snake_case` for database columns, requires integration tests for every new endpoint, or forbids direct SQL queries outside the `db/` package. AGENTS.md bridges that gap.

### How Codex Reads AGENTS.md

When Codex begins working on a task in your repository, it reads AGENTS.md files as part of its context window. The instructions in those files influence every decision the agent makes, from file placement to import ordering to error handling patterns.

Codex processes AGENTS.md hierarchically. A root-level file applies to the entire repo. Directory-level files apply only to that subtree. This hierarchy is the foundation of everything that follows in this guide.

The agent treats these instructions as **high-priority context**, meaning they rank above general training knowledge but below explicit user prompts in a given session. Understanding this priority order is critical for writing instructions that stick.

---

## Why Most AGENTS.md Files Fail

The majority of AGENTS.md files fail because they read like vague mission statements instead of actionable specifications. Telling an agent to "write clean code" is like telling a new hire to "do good work." It is technically true but operationally useless.

Here are the five most common failure modes.

### Failure Mode 1: Vague Directives

Instructions like "follow best practices" or "keep code readable" give the agent no concrete decision boundary. The agent already tries to write reasonable code. What you need to tell it is where your definition of reasonable **diverges from the default**.

### Failure Mode 2: Wall-of-Text Syndrome

A 3,000-word essay about your project's history and philosophy will get truncated or diluted in the agent's context window. Every sentence that is not a direct instruction is a sentence competing with your actual instructions for attention.

### Failure Mode 3: Contradictory Rules

When your root AGENTS.md says "always use async/await" but a subdirectory file says "use callbacks for legacy compatibility" without specifying scope, the agent has to guess. Guessing means inconsistency.

### Failure Mode 4: Untestable Instructions

If you cannot write a linter rule, a grep command, or a test assertion to verify whether the agent followed your instruction, the instruction is probably too vague. "Use meaningful variable names" is untestable. "All boolean variables must start with `is_`, `has_`, or `should_`" is testable.

### Failure Mode 5: Ignoring the Agent's Context Window

AGENTS.md content occupies space in the agent's context. If you pack it with low-value information, the high-value instructions get pushed further from the agent's active attention. Every line must earn its place.

---

## The Core Principles of Effective Codex Instructions

Effective **Codex instructions** follow four core principles: they are scoped, testable, concrete, and prioritized. Let us break each one down.

### Principle 1: Scoped

Every instruction should declare where it applies. Does it apply to the whole repo? A specific directory? Only files matching a pattern? The narrower the scope, the more reliably the agent follows the instruction.

### Principle 2: Testable

If you cannot verify compliance programmatically, the instruction is aspirational, not functional. Write every rule so that a CI check, a linter, or a simple grep could flag violations.

### Principle 3: Concrete

Replace adjectives with specifications. Instead of "short functions," say "functions must not exceed 30 lines." Instead of "descriptive names," say "function names must start with a verb."

### Principle 4: Prioritized

Not every instruction is equally important. Mark critical rules explicitly. Codex responds well to clear priority signals like "CRITICAL," "MUST," and "NEVER" when used sparingly and honestly.

---

## Scoped Instructions: The Single Most Important Pattern

**Scoped instructions** are the single most important pattern for writing an AGENTS.md that Codex actually follows. A scoped instruction explicitly declares the files, directories, or patterns it applies to, removing ambiguity about when the rule is relevant.

Here is why scoping matters. When every instruction applies globally, the agent carries the full weight of every rule for every file it touches. This creates cognitive load in the context window and increases the chance of conflicting rules. Scoping lets the agent load only what is relevant.

### How to Scope Instructions

There are three primary scoping mechanisms.

**File-level scoping** uses glob patterns to target specific file types:

```markdown
## Rules for `*.test.ts` files

- Every test file must import from `@testing-library/react`, not from `enzyme`.
- Each `describe` block must have at least one `it` block.
- Test file names must match the pattern `<ComponentName>.test.ts`.
```

**Directory-level scoping** uses separate AGENTS.md files in subdirectories (covered in detail later):

```
repo/
  AGENTS.md              # Global rules
  src/
    api/
      AGENTS.md          # API-specific rules
    ui/
      AGENTS.md          # UI-specific rules
```

**Section-level scoping** uses clear headers within a single AGENTS.md:

```markdown
## When modifying files in `src/db/`

- All database queries MUST use the query builder in `src/db/builder.ts`.
- Never write raw SQL strings.
- Every query function must accept a `trx` parameter for transaction support.
```

### Scoping in Practice

Consider a full-stack TypeScript project. A single unscoped AGENTS.md might say:

```markdown
- Use functional components
- Write unit tests
- Handle errors properly
```

This is nearly useless. A scoped version of the same intent looks like this:

```markdown
## For files in `src/components/`

- All React components MUST be functional components using hooks.
- No class components. If modifying a class component, refactor it to functional.
- Every component must have a corresponding `*.test.tsx` file in the same directory.

## For files in `src/api/routes/`

- Every route handler must be wrapped in the `asyncHandler` utility from `src/api/middleware/async.ts`.
- Error responses must use the `ApiError` class from `src/api/errors.ts`.
- Never catch errors silently. Always re-throw or pass to `next()`.

## For files in `src/db/`

- All queries must use Knex query builder. No raw SQL.
- Every query function must accept an optional `trx` (transaction) parameter.
- Test files for db functions go in `src/db/__tests__/` and must use the test database config.
```

The difference is night and day. Each section tells the agent exactly when the rule applies and exactly what to do.

---

## Writing Testable Rules Instead of Vague Guidelines

A **testable rule** is an instruction that can be verified by a machine. This is the quality bar every line in your AGENTS.md should meet. If a rule is not testable, it is either too vague to be useful or it is a preference that the agent will interpret inconsistently.

### The Testability Litmus Test

For every instruction you write, ask: "Could I write a script that checks whether this rule was followed?" If the answer is no, rewrite the rule until the answer is yes.

Here is a side-by-side comparison.

**Untestable (bad):**

```markdown
- Use good error handling throughout the codebase.
```

**Testable (good):**

```markdown
- Every `async` function must have a try/catch block or be wrapped in `asyncHandler`.
- Catch blocks must never be empty. They must either log the error, re-throw, or return an error response.
- All error logs must include the original error object, not just a string message.
```

Each of those three rules can be checked with a linter rule, a static analysis tool, or even a simple regex search across the codebase.

### Categories of Testable Rules

**Naming conventions** are among the easiest rules to test:

```markdown
## Naming Conventions

- React component files: PascalCase (e.g., `UserProfile.tsx`)
- Utility functions: camelCase (e.g., `formatDate.ts`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- Database migration files: `YYYYMMDDHHMMSS_description.ts` (e.g., `20260402120000_add_users_table.ts`)
- Boolean variables: must start with `is`, `has`, `should`, or `can`
```

**Structural rules** define what goes where:

```markdown
## File Structure Rules

- API route handlers go in `src/api/routes/<resource>/`.
- Each resource directory must contain: `router.ts`, `controller.ts`, `validation.ts`.
- Shared types go in `src/types/`. Never define types inline in route files.
- Database models go in `src/db/models/`. One file per table.
```

**Dependency rules** control what can import what:

```markdown
## Import Rules

- Files in `src/ui/` must NEVER import from `src/api/` or `src/db/`.
- Files in `src/api/` may import from `src/db/` but never from `src/ui/`.
- Files in `src/db/` must not import from any other `src/` subdirectory.
- All third-party imports must come before local imports, separated by a blank line.
```

**Testing rules** specify what counts as adequate test coverage:

```markdown
## Testing Requirements

- Every new API endpoint must have at least one integration test in `tests/api/`.
- Integration tests must use the `testServer` helper from `tests/helpers/server.ts`.
- Unit tests must not make network requests. Mock all external calls using `msw`.
- Test descriptions must start with "should" (e.g., `it('should return 404 when user not found')`).
```

Each of these rules can be enforced with tooling. That is the standard to aim for.

---

## AGENTS.md Examples: Good vs Bad

Seeing full **AGENTS.md examples** side by side is the fastest way to internalize what works. Let us walk through a complete before-and-after for a typical Node.js backend project.

### Bad AGENTS.md Example

```markdown
# AGENTS.md

This is a Node.js backend for our e-commerce platform. We use Express, 
PostgreSQL, and Redis. Please follow our coding standards and write clean, 
maintainable code.

## Guidelines

- Write good tests
- Handle errors properly
- Follow REST conventions
- Keep functions small
- Use TypeScript properly
- Don't break existing functionality
- Make sure the code is secure
- Use our existing patterns
```

This file is almost entirely useless. Every single line is vague, untestable, and unscoped. "Write good tests" means nothing to an agent. "Use TypeScript properly" is not a specification. "Don't break existing functionality" is an aspiration, not an instruction.

### Good AGENTS.md Example

```markdown
# AGENTS.md

## Project Overview

E-commerce API built with Express 4.x, TypeScript 5.x, PostgreSQL 15, Redis 7.
Monorepo managed with Turborepo. Node 20 LTS.

## Critical Rules (NEVER violate)

- NEVER modify files in `src/db/migrations/` that have already been applied.
  Create new migration files instead.
- NEVER store secrets or API keys in code. Use `src/config/env.ts` which reads
  from environment variables.
- NEVER use `any` type. Use `unknown` and narrow with type guards if the type
  is genuinely uncertain.

## For all TypeScript files

- Strict mode is enabled. Do not add `@ts-ignore` or `@ts-expect-error` comments.
- Prefer `interface` over `type` for object shapes.
- Export types from the file where they are defined. Re-export shared types
  from `src/types/index.ts`.

## For files in `src/api/routes/`

- Every route file must export a single Express Router.
- Route handlers must be `async` and wrapped with the `asyncHandler` from
  `src/api/middleware/async-handler.ts`.
- Request validation must use Zod schemas defined in a sibling `validation.ts` file.
- Response format: `{ data: T }` for success, `{ error: { code: string, message: string } }`
  for errors.

## For files in `src/db/`

- Use Knex query builder exclusively. No raw SQL strings.
- Every query function signature must include an optional `trx?: Knex.Transaction`
  parameter as the last argument.
- New tables require a migration in `src/db/migrations/` following the naming
  pattern `YYYYMMDDHHMMSS_<verb>_<noun>.ts` (e.g., `20260402000000_create_orders.ts`).

## For files in `src/services/`

- Service functions are the business logic layer. They call db functions and
  return domain objects.
- Services must never import Express types (`Request`, `Response`, `NextFunction`).
- Services must throw `AppError` (from `src/errors/app-error.ts`) for business
  logic errors, not plain `Error`.

## For test files (`*.test.ts`, `*.spec.ts`)

- Use Vitest, not Jest. Import `describe`, `it`, `expect` from `vitest`.
- Test files live next to the source file they test
  (e.g., `src/services/order.ts` -> `src/services/order.test.ts`).
- Integration tests that need a database must use the `setupTestDb` helper
  from `tests/helpers/db.ts`.
- Mock external HTTP calls with `msw`. Never use `nock`.
- Each test must be independent. No shared mutable state between `it` blocks.

## For files in `src/ui/emails/`

- Email templates use React Email. Components go in `src/ui/emails/components/`.
- Every email template must have a corresponding preview in `src/ui/emails/previews/`.
- Inline styles only. No external CSS files.

## Git Commit Messages

- Format: `<type>(<scope>): <description>`
- Types: feat, fix, refactor, test, docs, chore
- Scope: the top-level directory affected (api, db, services, ui)
- Example: `feat(api): add pagination to GET /orders endpoint`

## Running Checks Locally

- Lint: `npm run lint`
- Type check: `npm run typecheck`
- Test: `npm run test`
- All three must pass before submitting a PR.
```

The difference is stark. Every section is scoped. Every rule is testable. The agent knows exactly what to do, where to do it, and what the boundaries are.

---

## Structuring Your AGENTS.md for Large Codebases

For small projects, a single root-level AGENTS.md works fine. For large codebases with multiple teams, languages, or deployment targets, you need a **hierarchical structure** that keeps instructions relevant without overwhelming the agent.

### The Hierarchy Pattern

The recommended structure follows your directory tree:

```
repo/
  AGENTS.md                    # Global rules: language, formatting, git conventions
  packages/
    api/
      AGENTS.md                # API-specific rules
      src/
        auth/
          AGENTS.md            # Auth-specific rules (security-critical)
    web/
      AGENTS.md                # Frontend-specific rules
    shared/
      AGENTS.md                # Shared library rules
```

Each file should contain only the rules relevant to its scope. The root file covers universal rules. Subdirectory files add or override rules for their subtree.

### What Goes in the Root AGENTS.md

The root file should contain rules that apply everywhere:

```markdown
# AGENTS.md (root)

## Language and Formatting

- TypeScript strict mode in all packages.
- Prettier for formatting. Do not manually format code.
- ESLint with the config in `.eslintrc.js`. Do not disable rules inline.

## Git Conventions

- Branch naming: `<type>/<ticket-id>-<short-description>` (e.g., `feat/PROJ-123-add-search`).
- Commit format: Conventional Commits.
- PRs must target `main` unless explicitly noted.

## Architecture Boundaries

- `packages/shared/` must not import from `packages/api/` or `packages/web/`.
- `packages/api/` and `packages/web/` may import from `packages/shared/`.
- Cross-package imports must go through the package's public API (`index.ts`).
```

### What Goes in a Subdirectory AGENTS.md

A subdirectory file adds context specific to that part of the codebase:

```markdown
# AGENTS.md (packages/api/)

## API Architecture

- This package uses a layered architecture: routes -> controllers -> services -> repositories.
- Each layer can only call the layer directly below it.
- Never skip layers (e.g., a route handler must not call a repository directly).

## Authentication

- All routes except those in `src/routes/public/` require authentication.
- Auth middleware is in `src/middleware/auth.ts`. Use `requireAuth` for
  authenticated routes and `requireRole('admin')` for admin routes.

## Database Access

- This package uses Prisma ORM. The client is in `src/db/client.ts`.
- Always use transactions for operations that modify multiple tables.
- N+1 queries are forbidden. Use `include` or `select` to eager-load relations.
```

### Keeping It Maintainable

Treat AGENTS.md files like code. They should be reviewed in PRs, versioned, and updated when conventions change. Stale instructions are worse than no instructions because they actively mislead the agent.

A good practice is to add a **last-reviewed date** at the top of each AGENTS.md:

```markdown
<!-- Last reviewed: 2026-04-01 -->
```

This makes it easy to spot files that have gone stale during periodic reviews.

---

## Directory-Level AGENTS.md Files

**Directory-level AGENTS.md files** are where the scoping pattern becomes most powerful. Instead of cramming every rule into one giant file, you distribute instructions to the directories where they apply.

### When to Create a Directory-Level File

Create a directory-level AGENTS.md when:

- The directory has conventions that differ from the rest of the repo.
- The directory is security-critical and needs extra rules (e.g., `auth/`, `payments/`).
- A team owns that directory and wants to enforce their specific standards.
- The directory uses a different language, framework, or paradigm.

### Example: Auth Directory

```markdown
# AGENTS.md (src/auth/)

## Security-Critical Directory

This directory handles authentication and authorization. Extra caution required.

## Rules

- NEVER log tokens, passwords, or session IDs. Not even in debug mode.
- NEVER compare secrets with `===`. Use `crypto.timingSafeEqual` to prevent
  timing attacks.
- All new auth functions must have corresponding tests in `src/auth/__tests__/`
  that cover both success and failure cases.
- Password hashing must use `bcrypt` with a cost factor of at least 12.
  The hashing utility is in `src/auth/utils/hash.ts`. Do not create new
  hashing functions.
- JWT tokens must be created using `src/auth/utils/jwt.ts`. Do not import
  `jsonwebtoken` directly anywhere else.
```

### Example: Database Migrations Directory

```markdown
# AGENTS.md (src/db/migrations/)

## Migration Rules

- NEVER modify an existing migration file. Always create a new one.
- Migration file names must follow: `YYYYMMDDHHMMSS_<verb>_<noun>.ts`.
- Every `up` migration must have a corresponding `down` migration that
  fully reverses it.
- Migrations must be idempotent where possible. Use `CREATE TABLE IF NOT EXISTS`
  and `DROP TABLE IF EXISTS`.
- Test migrations locally with `npm run db:migrate:test` before committing.
```

### Example: UI Components Directory

```markdown
# AGENTS.md (src/components/)

## Component Standards

- All components must be functional React components.
- Props must be defined as a named TypeScript interface: `interface <ComponentName>Props`.
- Components must be exported as named exports, not default exports.
- Every component file must export the component and its props interface.

## Styling

- Use Tailwind CSS utility classes. No CSS modules, no styled-components.
- Custom styles go in the component file using Tailwind's `@apply` only as
  a last resort.
- Responsive design: mobile-first. Use `sm:`, `md:`, `lg:` breakpoints.

## Accessibility

- All interactive elements must have accessible labels.
- Images must have descriptive `alt` text. Decorative images use `alt=""`.
- Form inputs must be associated with a `<label>` element.
```

Each of these files is short, focused, and immediately actionable. The agent reads only the files relevant to the directory it is modifying.

---

## How Codex Resolves Conflicting Instructions

Understanding **how Codex resolves conflicts** between instructions is essential for writing AGENTS.md files that work predictably. When two rules disagree, the agent must pick one, and knowing its resolution strategy lets you write instructions that produce the right outcome.

### The Resolution Hierarchy

Codex follows a priority order when instructions conflict:

1. **Explicit user prompt** in the current session (highest priority).
2. **Directory-level AGENTS.md** closest to the file being modified.
3. **Parent directory AGENTS.md** files, walking up to the root.
4. **Root AGENTS.md** (lowest priority among repository instructions).

This means a rule in `src/api/AGENTS.md` overrides a conflicting rule in the root `AGENTS.md` for files within `src/api/`. This is by design and mirrors how `.gitignore` and `.eslintrc` inheritance works.

### Avoiding Conflicts

The best strategy is to avoid conflicts entirely. Here is how.

**Use the root file for universal rules only.** If a rule does not apply to every single file in the repo, it does not belong in the root AGENTS.md.

**Use directory files for local overrides.** When a subdirectory needs different behavior, put the rule in that directory's AGENTS.md and note that it overrides the parent:

```markdown
# AGENTS.md (src/legacy/)

## Override: Error Handling

The root AGENTS.md requires all async functions to use try/catch. In this
legacy directory, error handling uses the callback pattern instead.

- Async functions in this directory use error-first callbacks, not try/catch.
- Do not refactor existing callback patterns to async/await unless explicitly
  asked.
```

**Be explicit about overrides.** When a subdirectory rule intentionally contradicts a parent rule, say so. This helps both the agent and human reviewers understand that the conflict is intentional.

### What Happens with Ambiguous Conflicts

If two instructions conflict and neither explicitly overrides the other, Codex will typically follow the more specific instruction. If both are equally specific, the behavior is unpredictable. This is exactly the situation you want to avoid by being explicit about scope and priority.

---

## Integrating AGENTS.md with Your CI Pipeline

Your **AGENTS.md is only as good as your enforcement mechanism**. If the agent can violate your instructions and still pass CI, the instructions are suggestions, not rules. Integrating your AGENTS.md rules with CI transforms them from guidelines into guardrails.

### Linting Rules That Mirror AGENTS.md

For every testable rule in your AGENTS.md, consider whether it can be expressed as a linter rule:

```jsonc
// .eslintrc.js additions that mirror AGENTS.md rules
{
  "rules": {
    // "No raw SQL strings" -> use eslint-plugin-no-raw-sql or a custom rule
    "no-restricted-syntax": [
      "error",
      {
        "selector": "TaggedTemplateExpression[tag.name='sql']",
        "message": "Use the Knex query builder instead of raw SQL."
      }
    ],
    // "No default exports" -> matches AGENTS.md component rule
    "import/no-default-export": "error",
    // "No any type" -> matches AGENTS.md TypeScript rule
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### Custom CI Checks

Some AGENTS.md rules require custom scripts. Here is an example that enforces the "services must not import Express types" rule:

```bash
#!/bin/bash
# ci/check-service-imports.sh
# Enforces: "Services must never import Express types"

violations=$(grep -rn "import.*from 'express'" src/services/ || true)

if [ -n "$violations" ]; then
  echo "AGENTS.md violation: Services must not import Express types."
  echo ""
  echo "Violations found:"
  echo "$violations"
  echo ""
  echo "Services should only throw AppError and return domain objects."
  exit 1
fi

echo "Service import check passed."
```

### Architecture Tests

For dependency rules, consider using architecture test libraries:

```typescript
// tests/architecture.test.ts
import { describe, it, expect } from 'vitest';
import { getImports } from './helpers/import-analyzer';

describe('Architecture boundaries from AGENTS.md', () => {
  it('ui must not import from api or db', () => {
    const uiImports = getImports('src/ui/**/*.ts');
    const violations = uiImports.filter(
      imp => imp.startsWith('src/api/') || imp.startsWith('src/db/')
    );
    expect(violations).toEqual([]);
  });

  it('db must not import from any other src subdirectory', () => {
    const dbImports = getImports('src/db/**/*.ts');
    const violations = dbImports.filter(
      imp => imp.startsWith('src/') && !imp.startsWith('src/db/')
    );
    expect(violations).toEqual([]);
  });
});
```

### The Feedback Loop

When CI catches a violation, the error message should reference the AGENTS.md rule. This creates a feedback loop: the agent learns from the CI failure what it did wrong and can correct it in the next iteration.

```bash
# Bad CI error message
echo "Error: unauthorized import detected"

# Good CI error message
echo "AGENTS.md violation (root, section 'Architecture Boundaries'):"
echo "Files in src/ui/ must NEVER import from src/api/ or src/db/."
echo "Found: import { UserService } from 'src/api/services/user'"
echo "Fix: Move shared types to src/types/ and import from there."
```

The more precise your error messages, the faster the agent self-corrects.

---

## Advanced Patterns for Complex Projects

Once you have the basics down, these advanced patterns will help you handle edge cases and complex project structures.

### Conditional Rules

Some rules only apply in certain contexts. Use clear conditional headers:

```markdown
## When Adding a New API Endpoint

1. Create the route file in `src/api/routes/<resource>/`.
2. Create a Zod validation schema in a sibling `validation.ts`.
3. Create or update the controller in `controller.ts`.
4. Add the route to the router in `src/api/routes/index.ts`.
5. Add an integration test in `tests/api/<resource>.test.ts`.
6. Update the OpenAPI spec in `docs/openapi.yaml`.

## When Modifying a Database Schema

1. Create a new migration file (NEVER modify existing migrations).
2. Update the Prisma schema in `prisma/schema.prisma`.
3. Run `npx prisma generate` to update the client.
4. Update any affected seed data in `prisma/seed.ts`.
5. Update affected service and repository files.
```

### Negative Examples

Telling the agent what NOT to do is as valuable as telling it what to do. Use negative examples to highlight common mistakes:

```markdown
## Common Mistakes to Avoid

### Wrong: Catching errors without handling them

```typescript
// BAD - never do this
try {
  await saveOrder(order);
} catch (e) {
  // silently swallowed
}
```

### Right: Always handle or rethrow

```typescript
// GOOD
try {
  await saveOrder(order);
} catch (error) {
  logger.error('Failed to save order', { orderId: order.id, error });
  throw new AppError('ORDER_SAVE_FAILED', 'Could not save the order', { cause: error });
}
```
```

### Template Patterns

If your project uses repeating patterns, give the agent a template to follow:

```markdown
## New Service Template

When creating a new service file, follow this structure:

```typescript
// src/services/<name>.service.ts
import { db } from '../db/client';
import { AppError } from '../errors/app-error';
import type { <Name> } from '../types/<name>';

export async function get<Name>ById(
  id: string,
  trx?: Knex.Transaction
): Promise<Name> {
  const record = await db('<table_name>')
    .where({ id })
    .first()
    .transacting(trx ?? db);

  if (!record) {
    throw new AppError('<NAME>_NOT_FOUND', `<Name> with id ${id} not found`);
  }

  return record;
}
```
```

### Priority Markers

Use consistent markers to indicate rule importance:

```markdown
## Priority Levels

- **CRITICAL**: Violations will break production or create security vulnerabilities.
  These rules are non-negotiable.
- **REQUIRED**: Violations will fail CI. These rules maintain code quality.
- **PREFERRED**: Follow these when possible. Deviations are acceptable with reason.
```

Then use these markers in your rules:

```markdown
## Database Rules

- **CRITICAL**: Never store plaintext passwords. Use bcrypt with cost >= 12.
- **CRITICAL**: Never expose internal database IDs in API responses. Use UUIDs.
- **REQUIRED**: All queries must use parameterized values. No string interpolation.
- **REQUIRED**: Every write operation must be wrapped in a transaction.
- **PREFERRED**: Use `select` to specify columns instead of `select *`.
```

This gives the agent a clear hierarchy for making tradeoff decisions.

---

## Common Mistakes and How to Fix Them

Even after reading everything above, teams commonly make these mistakes when writing **Codex AGENTS.md** files. Here is each mistake with its fix.

### Mistake: Writing Instructions for Humans, Not Agents

AGENTS.md is not a wiki page. Remove all explanatory text that does not directly inform a decision the agent needs to make.

**Before:**

```markdown
## Our Testing Philosophy

We believe in thorough testing because it helps us ship with confidence.
Our testing pyramid emphasizes unit tests at the base, with integration
tests for critical paths, and a small number of end-to-end tests for
smoke testing. This approach has served us well over the past three years
and has significantly reduced our bug count in production.
```

**After:**

```markdown
## Testing Requirements

- Every function in `src/services/` must have a unit test.
- Every API endpoint must have at least one integration test.
- E2E tests go in `tests/e2e/` and run only in CI, not locally.
- Test pyramid target: 70% unit, 25% integration, 5% e2e.
```

The "before" version is a nice paragraph for a README. The "after" version is what an agent needs.

### Mistake: Not Specifying the Exact Tool or Library

Agents default to their training data, which covers many tools for any given task. If you use a specific library, say so explicitly.

**Before:**

```markdown
- Write tests for all new code.
```

**After:**

```markdown
- Write tests using Vitest (not Jest, not Mocha).
- Import test utilities from `vitest`: `describe`, `it`, `expect`, `vi`.
- For mocking HTTP requests, use `msw` (not `nock`, not `axios-mock-adapter`).
```

### Mistake: Forgetting to Specify What Already Exists

The agent does not know your codebase as well as you do. Tell it what utilities, helpers, and patterns already exist so it does not reinvent them.

```markdown
## Existing Utilities (use these, do not create alternatives)

- `src/utils/logger.ts` - Structured logger using Pino. Use `logger.info()`,
  `logger.error()`, etc.
- `src/utils/retry.ts` - Retry wrapper with exponential backoff. Use for all
  external API calls.
- `src/utils/validate.ts` - Zod schema validation helper. Use `validate(schema, data)`
  instead of calling `schema.parse()` directly.
- `src/api/middleware/async-handler.ts` - Wraps async route handlers. All route
  handlers must be wrapped with this.
- `src/errors/app-error.ts` - Custom error class. Use for all business logic errors.
```

This simple list prevents a huge category of agent mistakes: creating duplicate utilities.

### Mistake: Using Relative Language

Words like "usually," "typically," and "generally" give the agent an escape hatch. Be definitive.

**Before:**

```markdown
- We usually prefer named exports over default exports.
```

**After:**

```markdown
- Use named exports. Default exports are not allowed.
```

### Mistake: Not Updating AGENTS.md When Conventions Change

If you switch from Jest to Vitest and forget to update AGENTS.md, the agent will keep writing Jest tests. Treat AGENTS.md as a living document. Add it to your "definition of done" for any convention change.

---

## Measuring Whether Your AGENTS.md Actually Works

Writing a great AGENTS.md is only half the battle. You need a way to measure whether it is actually improving the quality of agent-generated code.

### Metric 1: PR Rejection Rate

Track the percentage of Codex-generated PRs that are rejected or require significant revision. A good AGENTS.md should reduce this rate over time.

Measure it by tagging agent-generated PRs and tracking the ratio of "approved on first review" versus "changes requested."

### Metric 2: CI Failure Rate on Agent PRs

If your CI enforces AGENTS.md rules, the failure rate on agent PRs tells you how well the agent understands and follows your instructions. A high failure rate means your instructions are either unclear or contradictory.

### Metric 3: Instruction Violation Categories

When an agent PR violates your conventions, categorize the violation. If the same category keeps appearing, the corresponding AGENTS.md section needs to be rewritten more clearly.

Create a simple spreadsheet:

| Date | Violation | AGENTS.md Section | Was the rule present? | Action taken |
|---|---|---|---|---|
| 2026-04-01 | Used raw SQL | Database Rules | Yes | Reworded rule to be more specific |
| 2026-04-01 | Missing test file | Testing Requirements | No | Added rule |
| 2026-04-02 | Default export | Component Standards | Yes | Added negative example |

### Metric 4: Time to Merge

Track how long it takes from Codex opening a PR to that PR being merged. A well-written AGENTS.md should decrease this time by reducing review cycles.

### Running Audits

Periodically audit your AGENTS.md against recent agent PRs. For each merged PR, check whether every instruction in AGENTS.md was relevant and followed. Remove instructions that are never relevant, and add instructions for recurring issues that are not yet documented.

---

## FAQ: AGENTS.md and Codex Instructions

### What is AGENTS.md used for?

AGENTS.md is a markdown file placed in a code repository to give AI coding agents specific instructions about project conventions, architecture decisions, and coding standards. It acts as a machine-readable contributor guide that agents like Codex consult when generating code changes.

### Where should I put my AGENTS.md file?

Place your main AGENTS.md file in the root of your repository for global rules. For directory-specific rules, place additional AGENTS.md files in the relevant subdirectories. The agent reads all AGENTS.md files in the path from the root to the file it is modifying.

### How long should AGENTS.md be?

There is no fixed length limit, but shorter is almost always better. A root AGENTS.md should be under 200 lines. Directory-level files should be under 50 lines. Every line should be an actionable instruction, not explanation or context. Remove anything that does not directly inform a code decision.

### Can I use AGENTS.md with other AI coding agents besides Codex?

Yes. While AGENTS.md originated with Codex, other AI coding agents including Claude Code, Cursor, and similar tools also read and follow AGENTS.md files. The principles of scoped, testable instructions apply regardless of which agent you use. Some agents also support their own instruction files (such as `.cursorrules` for Cursor), but AGENTS.md is becoming a cross-agent standard.

### Does AGENTS.md replace a CONTRIBUTING.md file?

No. CONTRIBUTING.md is for human contributors and typically covers process topics like how to submit issues, PR etiquette, and communication channels. AGENTS.md is for AI agents and focuses on concrete coding rules. You should have both if your project accepts both human and AI contributions.

### How do I handle rules that only apply sometimes?

Use conditional headers that specify when the rule is active. For example: "When adding a new API endpoint," "When modifying database schemas," or "When working on files in src/legacy/." The agent evaluates these conditions against the current task and applies the rules accordingly.

### Should I include examples of good and bad code in AGENTS.md?

Yes, but use them sparingly. A short code example showing the correct pattern is one of the most effective instruction formats. Negative examples (showing what not to do) are also valuable when a common mistake keeps recurring. Keep examples under 10 lines each to avoid bloating the file.

### How often should I update AGENTS.md?

Update it whenever you change a convention, adopt a new tool, deprecate a pattern, or notice a recurring mistake in agent-generated code. A quarterly review is a good minimum cadence. Add a "last reviewed" date to each AGENTS.md file so staleness is visible.

### What if Codex ignores an instruction in AGENTS.md?

First, verify the instruction is in the correct scope (root vs. directory-level). Second, check whether the instruction is clear and unambiguous. Third, ensure it does not conflict with another instruction or an explicit user prompt. If it still gets ignored, try rewording the instruction to be more direct and concrete, using "MUST" or "NEVER" for emphasis.

### Can AGENTS.md instructions be too strict?

Yes. If every rule is marked CRITICAL and the file is 500 lines long, the agent will struggle to prioritize. Use a tiered system (CRITICAL, REQUIRED, PREFERRED) and keep the CRITICAL tier to genuine safety and correctness issues. Over-constraining the agent leads to it spending excessive effort satisfying rules at the expense of actually completing the task.

---

## Key Takeaways

Writing an AGENTS.md that Codex actually follows is not about writing more instructions. It is about writing better ones. Here is what to remember.

**Scope every instruction.** Every rule should explicitly state where it applies. Use directory-level AGENTS.md files for local rules and the root file for universal rules only.

**Make every rule testable.** If you cannot write a script, linter rule, or test to verify compliance, the rule is too vague. Rewrite it until it is machine-verifiable.

**Be concrete, not aspirational.** Replace "write clean code" with "functions must not exceed 30 lines" and "use meaningful names" with "boolean variables must start with is, has, should, or can." Specificity is the difference between instructions that work and instructions that get ignored.

**Tell the agent what already exists.** List your utilities, helpers, and patterns explicitly. Preventing the agent from reinventing your existing code is one of the highest-value things AGENTS.md can do.

**Enforce rules in CI.** An AGENTS.md without CI enforcement is a suggestion box. Mirror your most important rules as linter rules, custom scripts, and architecture tests so violations are caught automatically.

**Treat AGENTS.md as code.** Review it in PRs. Version it. Update it when conventions change. Audit it against actual agent output. A stale AGENTS.md is worse than no AGENTS.md.

**Start small and iterate.** You do not need a perfect AGENTS.md on day one. Start with your five most-violated conventions, write them as scoped, testable rules, and add more rules as you observe new categories of agent mistakes.

The teams that get the most value from AI coding agents are not the ones with the longest AGENTS.md files. They are the ones with the most precise ones. Your **AGENTS.md best practices** come down to a simple principle: write instructions that a machine can follow and a script can verify.

Now go audit your AGENTS.md. Pick the vaguest instruction in it, rewrite it as a scoped, testable rule, and see what happens. That single change will teach you more about effective **Codex AGENTS.md** authoring than any guide ever could.
