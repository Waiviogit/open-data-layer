---
id: docs-standards-testing-rules
title: Testing rules
description: Agent rules for writing tests — contracts, invariants, levels, mocking, anti-patterns, and quality gates.
type: spec
status: active
scope: platform
tags: [platform, standards, testing]
updated_at: 2026-08-12
related:
  - docs/standards/docs-standards.md
  - AGENTS.md
---

# Testing rules

**Related:** [Documentation standards](docs-standards.md) · [AGENTS.md](../../AGENTS.md)

Rules for agents when adding or changing tests in this repository. Repo-specific tooling (Jest, Nx, E2E layout) stays in [AGENTS.md](../../AGENTS.md#testing).

## 1. Purpose of testing

Tests do not prove that software is universally correct. They verify that observable behavior matches an explicitly defined expectation.

Manual testing—clicking through the interface or calling APIs—can demonstrate selected scenarios, but it does not systematically protect contracts, invariants, or boundary conditions.

A test must record the intended behavior of the system independently of its current implementation. Existing behavior must not automatically be treated as correct: a test can accidentally preserve a bug if expectations were derived only from the current code.

A good test is executable documentation.

## 2. Test contracts, not implementation details

Tests must focus on externally observable behavior.

A contract consists of:

1. **Preconditions** — what must be true before the subject is called.
2. **Postconditions** — what the subject guarantees after execution.
3. **Observable side effects** — externally visible actions, such as persistence, broadcasts, API calls, or state changes.

Do not test internal implementation details unless they are part of a public contract. A test coupled to private structure makes refactoring unnecessarily difficult.

If the contract remains unchanged, tests should remain green after any valid refactoring.

## 3. Declare and protect invariants

An invariant is a condition that must always remain true, regardless of the execution path.

Examples:

- An account balance cannot become negative.
- An unauthorized user cannot perform a protected operation.
- A successful operation must leave the entity in a valid state.
- Failed operations must not produce forbidden side effects.

Identify invariants explicitly and cover them with tests. Invariants are easy to overlook during example-based testing.

## 4. Test levels

### Unit tests

Unit tests verify the smallest meaningful unit with a clear contract, usually one module or file.

They should:

- Run quickly.
- Fail close to the source of the defect.
- Isolate external or non-deterministic dependencies when necessary.
- Exercise pure functions directly without mocking them.
- Remain focused even if the tested module calls several pure helper functions.

A test does not automatically become an integration test merely because several pure functions execute.

### Integration tests

Integration tests verify that multiple real components work together through their actual boundaries.

Use them for behavior that depends on:

- Module collaboration.
- Serialization and validation.
- API client boundaries.
- Persistence or browser storage.
- Wallet or third-party adapters.
- Framework integration.

Their unique value is proving that individually correct components are connected correctly.

### End-to-end tests

End-to-end tests interact with the application as a user would. They should depend on public UI or API behavior and remain unaware of internal modules.

Use them for a limited number of critical user journeys because they are slower, more expensive, less precise diagnostically, and more fragile than lower-level tests.

When E2E tests need Postgres locally, **do not connect to or mutate the dev database** (`.env`, local Docker Compose, or any database used for day-to-day development). Spin up a **dedicated test instance** instead. Use **`test`** for both the **database name** and **password** so test config cannot accidentally reuse dev credentials. CI may use its own credentials and setup. Migration constraint specs use the disposable harness in [test-postgres-harness.md](./test-postgres-harness.md) (`pnpm test:db`).

### Choosing the test distribution

Do not follow a testing pyramid, trophy, or another fixed shape as a law. The appropriate distribution depends on the system's contracts and cost structure.

Prefer:

- Unit tests when the contract is clear and inexpensive to verify.
- Integration tests when the primary risk is incorrect collaboration between components.
- End-to-end tests for a small set of critical user outcomes.

The test suite should be optimized for confidence, diagnostic value, execution cost, and maintenance cost.

## 5. Testing priorities

Write tests in the following priority order.

### P0 — Business rules and invariants

Test business logic thoroughly. These failures have a high impact and may remain unnoticed for a long time.

Cover:

- Valid behavior.
- Rejected behavior.
- State transitions.
- Permissions.
- Calculations.
- Invariants.
- Required side effects and forbidden side effects.

### P1 — Boundary and exceptional cases

Boundary defects are often difficult to infer from implementation and rarely appear during casual manual testing.

Consider:

- Empty inputs.
- Minimum and maximum values.
- Values immediately below and above a boundary.
- Missing or malformed data.
- Duplicate operations.
- Partial failures.
- Network errors and timeouts.
- Repeated calls and idempotency.
- Unexpected dependency responses.
- Locale, encoding, date, and numeric edge cases where applicable.

### P0 — Production regressions

Every confirmed production defect must receive a regression test at the lowest test level that can reliably reproduce the externally observable failure.

The new test must fail before the fix and pass after it.

### Lower priority — Glue code and thin wrappers

Simple delegation code has lower priority when:

- The cost of failure is low.
- Failure is immediately visible.
- The code adds no business decision or transformation.

Do not add shallow tests solely to increase coverage.

## 6. Coverage policy

Code coverage measures execution, not verification.

A covered line may still be:

- Executed without a meaningful assertion.
- Tested only on a happy path.
- Protected by an assertion that accepts incorrect results.
- Executed while the actual production logic is mocked.

Use coverage to locate unexamined areas, not as proof of test quality or correctness.

Coverage targets must never incentivize low-value tests.

## 7. Requirements for every test

Each test should:

- Describe one observable behavior.
- State the scenario and expected outcome clearly.
- Use explicit inputs and expected values.
- Contain assertions capable of detecting a meaningful defect.
- Verify required side effects when they are part of the contract.
- Verify the absence of forbidden side effects when important.
- Be deterministic and independent.
- Make failure easy to diagnose.
- Avoid depending on private implementation structure.
- Remain valid after an implementation-only refactoring.

Prefer behavior-oriented names, for example:

```
rejects a transfer when the amount exceeds the available balance
preserves the balance when broadcasting fails
includes the connected username in required_posting_auths
returns a validation error for an empty object identifier
```

## 8. Test design workflow

Before writing a test, the agent must:

1. Identify the behavior being protected.
2. Determine whether that behavior is intentional or merely present in the current code.
3. Define the preconditions.
4. Define the expected postconditions.
5. Identify observable side effects.
6. Identify relevant invariants.
7. Enumerate important boundary and failure cases.
8. Choose the lowest test level that can verify the behavior reliably.
9. Confirm that the test would fail for a plausible implementation defect.
10. Only then implement the test.

When implementing new functionality, define contracts and tests before—or alongside—the production implementation. Do not derive all expectations from code that has already been written.

## 9. Mocking rules

Mock only when isolation provides a clear benefit, particularly for:

- Network boundaries.
- Time.
- Randomness.
- Browser APIs.
- Wallet extensions.
- External services.
- Slow or non-deterministic dependencies.

Do not mock:

- Pure functions merely because they live in another file.
- The behavior the test is supposed to verify.
- Every internal collaborator by default.

Assertions about mocks are valuable only when the interaction itself is part of the contract.

## 10. Anti-patterns

### Always-green tests

Reject tests that remain green regardless of whether the implementation works.

Examples of weak assertions:

```
the result is defined
the result is a string
the returned array is not empty
the function does not throw
```

These assertions are acceptable only when that property is the actual contract.

### Testing the mock

Avoid tests that:

1. Configure a mock to return a predetermined value.
2. Pass that value through the production function without meaningful processing.
3. Assert that the final value equals the mocked value.

Such a test may continue to pass while the important production behavior is completely broken.

### Duplicating production logic

Do not copy production algorithms into tests to calculate expected results. The same mistake can then exist on both sides of the assertion.

Prefer small, explicit expected values.

Tests should not contain substantial calculations or reimplement business rules.

### Conditional assertions

Avoid branching test logic such as `if` statements that determines whether an assertion runs. Conditional tests can silently skip the important verification.

Use separate parameterized cases with explicit expectations when several scenarios are needed.

### Implementation-coupled tests

Avoid asserting:

- Private method calls.
- Internal variable values.
- An exact internal call sequence unless ordering is contractual.
- The number of helper calls unless it is externally significant.
- Component or module structure that users cannot observe.

### Coverage-driven tests

Do not create tests whose only purpose is executing uncovered lines. Every test must protect a meaningful contract, invariant, boundary condition, or regression.

## 11. Quality gate

People must be able to trust the test suite.

Before considering a change complete, the agent must confirm:

- Relevant contracts are covered.
- Important invariants are declared and tested.
- Business-critical paths include failure cases.
- Boundary conditions have been considered.
- Every fixed production bug has a regression test.
- Tests can detect plausible defects.
- No test merely validates mocks or duplicates production logic.
- Tests remain independent and deterministic.
- Unit and integration tests pass.
- Critical end-to-end scenarios pass when affected.
- The existing project verification commands pass.

A failing test must be treated as evidence requiring investigation. Do not weaken, delete, or rewrite an established expectation merely to make the suite green without first determining whether the contract changed.

## 12. Agent completion report

After adding or changing tests, report:

- Which contracts were protected.
- Which invariants were added or confirmed.
- Which boundary and failure cases were covered.
- Why each chosen test level was appropriate.
- Which commands were executed.
- Whether all checks passed.
- Any important behavior that remains untested and why.
