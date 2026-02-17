# Cerebro: The Modern AI Research Orchestrator

> 🛰️ Transform vague interests into structured knowledge through intelligent research decomposition

---

## Executive Summary

Cerebro is a high-performance, mobile-first research assistant designed to move beyond "chat-only" interfaces. Using a Decomposition Engine, it breaks complex topics into interactive sub-nodes while tracking research journeys through a persistent memory layer. Every interaction is saved, structured, and retrievable—creating a true "second brain" for research.

---

## Core Value Propositions

| Proposition | Description |
|---|---|
| **Structured Discovery** | Instead of walls of text, users receive interactive outlines and subtopic chips for guided exploration |
| **Perpetual Context** | Unlike chatbots that forget, Cerebro uses Airtable as a long-term memory to track research history and user preferences |
| **Reactive Performance** | Built with SolidJS and Solid Native for sub-millisecond UI updates and fluid mobile experiences |
| **Automated Workflow** | n8n decouples AI logic from UI, enabling complex multi-step tasks without client bloat |

---

## Architecture

### Technical Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | SolidJS + Solid Native | Reactive, declarative UI for iOS/Android |
| **Orchestration** | n8n | Workflow automation and LLM chaining |
| **LLM Brain** | Gemini 1.5 Flash/Pro | Multimodal reasoning and summarization |
| **Persistence** | Airtable | Structured storage for sessions, topics, and memory |
| **State** | Solid Signals | Fine-grained reactivity for chat and outlines |

---

## Key Functional Pillars

### 🧩 Topic Decomposition

When a user submits a research topic (e.g., "Quantum Computing in 2026"), the system:

1. Triggers an n8n workflow
2. Generates a hierarchical outline
3. Identifies 4–6 critical sub-nodes
4. Populates the UI with interactive chips for deep-diving

### 🧠 Persistent Context Management

- **Session Memory**: Tracks conversation flow via Airtable SessionIDs
- **User Persona Memory**: Learns preferences (e.g., "Explain simply" or "Focus on financial impact") and injects into Gemini's system prompt

### 📊 Clean Workflow Architecture

The app follows a **Request-Poll-Update** or **Webhook-push** model:

```
SolidJS → n8n → Airtable → Real-time Signals → UI
```

- SolidJS sends requests to n8n
- n8n updates Airtable
- SolidJS reflects state changes in real-time using signals

---

## User Journey

| Stage | Action | Outcome |
|---|---|---|
| **Initiation** | User enters research seed | Topic captured |
| **Expansion** | UI transforms | "Mind Map" or "Structured Outline" view appears |
| **Refinement** | User taps sub-topics | Gemini provides summaries and suggests follow-ups |
| **Archival** | Research tagged and saved | Stored in "Library" (Airtable) for retrieval |

---

## Success Metrics

| Metric | Target |
|---|---|
| **Latency** | n8n trigger-to-UI update < 2 seconds (initial decomposition) |
| **Structure** | 100% of research outputs must be parseable JSON |
| **Persistence** | Resume any research session from 7+ days prior with full context |
