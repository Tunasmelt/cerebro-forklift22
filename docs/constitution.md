# Cerebro Development Constitution

**Project:** Cerebro (SolidJS + n8n + Gemini + Airtable)

**Mission:** To maintain a clean, modular, and predictable development workflow by enforcing strict boundaries between the Frontend (SolidJS), the Orchestrator (n8n), and the Schema (Airtable).

## Table of Contents
- [Rule 1: The "Plan → Act → Test" Protocol](#rule-1-the-plan--act--test-protocol)
- [Rule 2: Anti-Silent Refactor Policy](#rule-2-anti-silent-refactor-policy)
- [Rule 3: Single-Feature Focus (SFF)](#rule-3-single-feature-focus-sff)
- [Rule 4: Contract-First Development](#rule-4-contract-first-development)
- [Rule 5: Memory & State Governance](#rule-5-memory--state-governance)
- [Checkpoint Checklist](#checkpoint-checklist)

---

## Rule 1: The "Plan → Act → Test" Protocol
No code shall be written or refactored until a Technical Design Doc (TDD) is approved for the specific task.

### Protocol Overview
No code shall be written or refactored until a Technical Design Doc (TDD) is approved for the specific task.

### Implementation Steps
1. **Plan:** Define the input/output schema (e.g., the JSON structure passing from n8n to SolidJS).
2. **Act:** Implement the change in a single layer only (UI, Workflow, or DB).
3. **Test:** Verify the webhook response and UI reactivity before moving to the next feature.

## Rule 2: Anti-Silent Refactor Policy
### Policy Guidelines
- The AI must never rewrite existing logic unless explicitly asked to "Refactor [Specific Component]."
- If the AI suggests a change that affects the Airtable Schema or n8n Webhook structure, it must flag this as a "Breaking Change" before providing code.

## Rule 3: Single-Feature Focus (SFF)
### Focus Guidelines
- Do not work on the "Chat UI" and the "Airtable Memory Logic" in the same turn.

### Context Isolation
Each session must focus on one of the three pillars:

- **Pillar A:** Frontend (SolidJS Native/Signals)
- **Pillar B:** Orchestration (n8n Workflows/Gemini Prompts)
- **Pillar C:** Data (Airtable Schema/Persistence)

## Rule 4: Contract-First Development
### Development Principles
All communication between n8n and the SolidJS app must follow a strict JSON contract.

### Response Templates
**Success Response:**
```json
{
  "status": "success",
  "data": { "subtopics": [], "outline": {}, "summary": "" },
  "context_id": "uuid"
}
```

**Error Response:**
```json
{ "status": "error", "message": "Clear description of failure" }
```
## Rule 5: Memory & State Governance
### State Management Guidelines
- **SolidJS State:** Use Signals exclusively for UI-bound data
- **n8n State:** Use Airtable as the "Single Source of Truth"
- **Gemini State:** The AI must be reminded of the User Persona and Previous 3 interactions in every n8n execution to prevent "context hallucination"

## Checkpoint Checklist
Before committing any AI-generated code, ask:

- [ ] Does this follow the existing SolidJS Signal pattern?
- [ ] Does this change the Airtable Base ID or Table names?
- [ ] Is the n8n webhook URL still valid?
- [ ] Did the AI try to "fix" something I didn't ask it to touch?
