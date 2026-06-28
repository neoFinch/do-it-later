# Implementation Guide

## Purpose

This document describes the technical implementation of Capture Inbox.

Business decisions belong in the product documents.
This document focuses on architecture.

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

```text
Capture
      ↓
Content Extraction
      ↓
Normalized Content
      ↓
AI Analysis
      ↓
Recommendation Engine
      ↓
User Feedback
```

---

# Suggested Project Structure

```text
src/
├── components/
├── pages/
├── hooks/
├── stores/
├── database/
├── repositories/
├── services/
│   ├── capture/
│   ├── extractors/
│   └── ai/
├── types/
└── utils/
```

---

# Stores

## CaptureStore
- CRUD
- Search
- Status

## AIStore
- Analysis
- Recommendations
- Regeneration

## ReviewStore
- Review queue
- Keep
- Skip
- Delete

## UserStore
- Goals
- Interests
- Preferences

---

# Services

- Capture Service
- Content Extractor
- AI Analysis Service
- Recommendation Engine
- Feedback Service

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
Recommendation Ready
        ↓
Reviewed
        ↓
Archived
```

---

# Domain Model

```text
Capture
      ↓
ContentDocument
      ↓
AIAnalysis
      ↓
Recommendation
      ↓
UserFeedback
```

---

# Design Principles

- Treat AI as a pipeline, not as a feature.
- Normalize content before AI analysis.
- Keep AI concerns separate from capture management.
- Store structured AI output.
- Make every stage independently replaceable.

---

# Future Expansion

This architecture supports:

- Duplicate detection
- Semantic search
- Daily digest
- Personalized recommendations
- Knowledge graph
- Learning companion
