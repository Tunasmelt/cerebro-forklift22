# Cerebro

Cerebro is a modern AI research orchestrator that turns broad topics into structured, explorable research sessions.

## Overview

- Frontend: React 18 + TypeScript + Vite
- Backend: FastAPI (Python)
- Orchestration/Storage: Webhook-driven workflows with external persistence

## Features

- Topic decomposition into sub-topics
- Interactive research workflow in the web UI
- Session-oriented architecture for iterative deep dives

## Prerequisites

- Node.js 18+
- npm 9+
- Python 3.10+

## Setup

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install backend dependencies

```bash
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Configure environment

Create/update `.env` with the variables your backend and workflow integrations require.

## Run

### Frontend only

```bash
npm run dev
```

### Backend only

```bash
npm run backend:dev
```

### Full stack (frontend + backend)

```bash
npm run dev:stack
```

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run backend:dev` - Start FastAPI backend via PowerShell script
- `npm run dev:stack` - Run frontend and backend together
- `npm run build` - TypeScript build + Vite production build
- `npm run preview` - Preview production frontend build
- `npm run lint` - Run ESLint
- `npm run test` - Run Vitest

## Project Structure

- `src/` - React application source
- `scripts/` - Local development helper scripts
- `docs/` - Project documentation
- `main.py` - Backend entrypoint

## License

This project is licensed under the MIT License. See `LICENSE` for details.
