# Offload Architecture

## High Level Flow

```text
Capture
    ↓
AI Analysis Pipeline
    ↓
Intent Detection
    ↓
Idea Extraction
    ↓
Knowledge Graph
    ↓
Transformation Engine
    ↓
Application Engine
```

## AI Pipeline

Input
- URL
- Voice
- Image
- PDF
- Text
- File

↓

Speech/OCR (if required)

↓

Understanding

↓

Classification

↓

Entity Extraction

↓

Idea Extraction

↓

Similarity Search

↓

Evaluation

↓

Storage

## Core Concepts

Everything revolves around **Ideas**, not articles.

```text
Article
    ↓
Ideas
    ↓
Knowledge Graph
    ↓
Learning Assets
```

## Transformation Engine

One source → Many outputs

- Flashcards
- PDF
- Quiz
- Study Guide
- Checklist
- Timeline
- Mind Map
- Travel Plan
- Workout Plan

## Future Services

- Backend API
- Vector Database
- Background Workers
- Notification Service
- Sync Service
- Analytics
