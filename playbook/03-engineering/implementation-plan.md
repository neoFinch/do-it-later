# Implementation Guide

## Purpose

This document describes the technical implementation of Capture Inbox.

Business decisions belong in the product documents.
AI shape and provider strategy belong in [AI-Architecture.md](./AI-Architecture.md).
This document focuses on how the app is built.

---

# Technology Stack

- Ionic 8
- React
- TypeScript
- Capacitor
- Zustand
- Capacitor SQLite
- React Router

---

# High-Level Architecture

Aligned with the durable AI layers in AI-Architecture.md:

```text
Capture
      ↓
Content Extraction
      ↓
ContentDocument
      ↓
Content Analysis (versioned, one LLM pass)
      ↓
Attention Decision (scorecard)
      ↓
User Signals (later)
```

Providers (OpenAI, Ollama, optional Local LLM experiment) plug into analysis via
a shared `complete({ system, user })` contract. See AI-Architecture.md for
defaults vs experimental on-device path.

---

# Suggested Project Structure

```text
src/
├── components/
├── pages/
├── hooks/
├── stores/
├── database/
├── services/
│   ├── extractors/
│   └── ai/
│       ├── providers/     # openai, ollama, null, (future: local-llm)
│       └── ...
├── types/
└── utils/
```

---

# Stores

## CaptureStore

- CRUD
- Search
- Status

## ReviewStore

- Review queue
- Keep
- Skip
- Delete

AI analysis is service- and repository-driven today (not a dedicated Zustand
store). A thin AI store can be added later if UI needs reactive regeneration
state.

## UserStore (later)

- Goals
- Interests
- Preferences

---

# Services

- Capture Service
- Content Extractor(s)
- Content Analysis Service
- Attention Scorecard / Decision
- AI provider registry (OpenAI / Ollama / null; Local LLM experimental)
- Feedback Service (later)

---

# Processing Lifecycle

```text
Capture Created
        ↓
Waiting For Extraction
        ↓
Extracting
        ↓
Extraction Complete
        ↓
Waiting For AI Analysis
        ↓
Analyzing
        ↓
Decision Ready
        ↓
Reviewed
        ↓
Archived
```

Statuses tracked today: `extractionStatus` and `analysisStatus`
(`pending` | `processing` | `completed` | `failed` | `skipped`).

---

# Domain Model

```text
Capture
      ↓
ContentDocument
      ↓
ContentAnalysis (schemaVersion)
      ↓
AttentionDecision
      ↓
UserFeedback (later)
```

Do not introduce separate Understand / Classify / Enrich / Evaluate tables until
AI-Architecture.md’s “future expansion” criteria are met.

---

# Design Principles

- Treat AI as a pipeline, not as a feature.
- Normalize content before AI analysis.
- Keep AI concerns separate from capture management.
- Store structured, versioned AI output.
- Keep the provider contract thin (`complete`) until call shapes diverge.
- Prefer improving extractors before adding more AI stages.
- Local LLM is an optional provider experiment, not a required runtime.

---

# Future Expansion

This architecture supports:

- Duplicate detection
- Semantic search
- Daily digest
- Personalized recommendations
- Knowledge graph
- Learning companion
- On-device Local LLM provider (`@capacitor/local-llm`) behind availability checks
