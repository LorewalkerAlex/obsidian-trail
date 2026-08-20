# Engineering Guide

> **Role:** Canonical engineering rules and design questions.
>
> This guide defines the engineering principles and questions used to take a project from intent to code.
>
> It does **not** define project-specific product, domain, data, architecture, UI design, mapping, or implementation facts. Those answers are produced through discussion and recorded in the project documents.
>
> Project answers:
> `product.md` → `domain.md` → `data.md` → `architecture.md` → `ui.md` when the product has a distinct UI design layer → `design-to-code-map.md`
>
> Current implementation work is planned in `implementation.md`, and code executes those answers and plans.

---

# Principles

## 1. Codebase Health

Optimize for the health of the whole codebase, not the convenience of the current task.

A change is successful only when it delivers the intended behavior without unnecessarily degrading clarity, maintainability, or evolvability.

## 2. Authority

One fact has one canonical authority.

Other representations may derive, implement, present, or verify that fact, but must not create competing truths.

## 3. Ownership

Responsibilities, mechanisms, and volatile knowledge have clear owners.

Architecture should localize knowledge and change to the smallest coherent ownership boundary.

## 4. Simplicity

Complexity must earn its keep.

Prefer the simplest structure that correctly serves current known needs while preserving reasonable room for change.

## 5. Reuse

Reuse proven capabilities, mechanisms, and evidence.

Do not duplicate the same underlying responsibility merely because it appears in a different feature or context.

## 6. Proportionality

Engineering effort should be proportional to real value and real risk.

Reliability, defensive behavior, testing, performance work, and abstraction should reflect likelihood, impact, and evidence rather than theoretical completeness.

## 7. Target State

Design and implementation should converge on the intended target state.

Legacy implementations provide evidence and reusable assets, but do not automatically define future structure.

## 8. Answers

Project artifacts contain answers.

Requirements, domain facts, design decisions, mappings, and implementation decisions are recorded as resolved project knowledge; process instructions and prompting belong outside the project artifacts.

---

# Flow

```text
Product
↓
Domain
↓
Data
↓
Architecture
↓
UI Design (when applicable)
↓
Design-to-Code Map
↓
Implementation
↓
Code
```

Each stage consumes the resolved answers above it.

Derivable answers are derived; unresolved decisions are discussed.

Implementation follows dependency order; shared foundations are established before dependent behaviors.

Coding begins when the relevant chain is resolved.

---

# Questions

## Product

- Purpose
- Scope
- Product Model
- Experience
- Product Rules

## Domain

- Language
- Model
- Relationships
- State & Lifecycle
- Rules & Invariants
- Derived & Historical Facts

## Data

- Data Model
- Identity & References
- Authority & Derivation
- Persistence
- Integrity & Evolution

## Architecture

- Drivers
- Boundaries
- Owners & Capabilities
- Dependencies
- State & Flows
- Quality Strategy
- Target Structure

## UI Design (when applicable)

- Host Composition
- Navigation & Workspace
- Core Surfaces
- Interaction Model
- Visual System
- Responsive Behavior & Accessibility

## Design-to-Code Map

- System Map
- Capability Map
- Code Ownership Map
- Target Code Tree

## Implementation

- Baseline
- Objective
- Reuse
- Changes
- Build Order
- Risk & Verification
- Final State
