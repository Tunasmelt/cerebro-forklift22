# Cerebro: The Modern AI Research Orchestrator (Web Edition)

> 🛰️ Transform vague interests into structured knowledge through intelligent research decomposition.

---

## Executive Summary

Cerebro is a high-performance research assistant built for the web. Moving beyond simple chat, it uses a **Decomposition Engine** to break complex topics into interactive sub-nodes. Every research journey is persisted in **Google Sheets**, turning a flat spreadsheet into a structured "Second Brain."

---

## Core Value Propositions

| Proposition | Description |
|---|---|
| **Structured Discovery** | Interactive outlines and subtopic chips replace walls of text. |
| **Flat-File Persistence** | Uses Google Sheets as a transparent, accessible database for research history. |
| **React 18 Performance** | Leverages React 18.3.1 for a modern, component-based research dashboard. |
| **Low-Code Orchestration**| n8n decouples Gemini logic from the UI for rapid workflow iteration. |

---

## Architecture

### Technical Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | React 18.3.1 | Component-based Web UI (Loveable Port) |
| **Orchestration** | n8n | Webhook handling, Gemini chaining, Sheets API |
| **LLM Brain** | Gemini 1.5 Flash/Pro | Decomposition, Summarization, and Tagging |
| **Persistence** | Google Sheets | Row-based storage for sessions and memory |
| **State** | React Context/Hooks | Managing chat flows and API synchronization |

---

## Architecture Flow


---

## Key Functional Pillars

### 🧩 Topic Decomposition
When a user submits a topic (e.g., "Post-Quantum Cryptography"):
1. **React** sends a POST to **n8n**.
2. **Gemini** returns a JSON outline + 4-6 sub-topic chips.
3. **n8n** appends the initial session row to **Google Sheets**.
4. **React** renders the interactive "Research Map."

### 📊 Clean Workflow Architecture
The app follows a **Hook-to-Webhook** model:
`React Component → useResearch Hook → n8n Webhook → Google Sheets → Response`

---

## User Journey

| Stage | Action | Outcome |
|---|---|---|
| **Initiation** | User enters research seed | n8n initializes session row in Sheets |
| **Expansion** | UI transforms | Interactive outline and subtopic chips appear |
| **Refinement** | User taps sub-topics | Gemini updates the sheet with deep-dive summaries |
| **Archival** | Summary generation | Final research is tagged and saved for CSV/PDF export |

---

## Success Metrics

| Metric | Target |
|---|---|
| **Reliability** | 100% JSON-safe storage in Google Sheet cells |
| **Portability** | Exportable research history via Sheets |
| **Consistency** | Strict adherence to `AI_CONSTITUTION.md` for local dev |