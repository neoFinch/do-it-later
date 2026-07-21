# Capture Inbox Roadmap

> **Vision**
>
> Capture anything in seconds. Review intentionally. Build a connected knowledge base powered by AI.

---

# Guiding Principles

Every feature should reinforce one or more of these principles:

1. **Capture frictionlessly**
   - Anything can be captured in seconds.
   - The user should never worry about organization while capturing.

2. **Review intentionally**
   - Users should review captures regularly instead of letting them pile up forever.

3. **Extract ideas, not just content**
   - Articles, videos and tweets are sources.
   - Ideas are what users actually want to keep.

4. **Connect knowledge automatically**
   - AI should build relationships between ideas without requiring manual effort.

5. **Resurface knowledge at the right time**
   - Information should return when it becomes useful again.

---

# Product Vision

Capture Inbox should evolve through four stages.

```
Capture
    ↓
Understand
    ↓
Review
    ↓
Knowledge
```

Eventually the application should feel less like a bookmark manager and more like a personal knowledge assistant.

---

# Priority P0 — Core Product

These features define the product and should be completed before a public launch.

---

## 1. Daily Review

**Status:** In Progress

The Daily Review is the heart of the application.

Users should develop a habit:

```
Capture throughout the day

↓

Review once a day

↓

Save valuable ideas

↓

Discard the rest
```

### Improvements

- Rename "Today's Review" → "Daily Review"
- Show remaining captures instead of only progress
- Better review time estimation
- Completion screen
- Smooth swipe animations
- Keyboard shortcuts (Desktop)
- Review highest-value captures first (future)

---

## 2. AI Analysis Pipeline

Continue improving the AI enrichment pipeline.

Current stages:

- Understanding
- Classification
- Enrichment
- Evaluation

Future additions:

- Idea extraction
- Reading difficulty
- Estimated usefulness
- Novelty score
- Similarity score

---

## 3. Backend Infrastructure

Current architecture

```
SQLite

+

User OpenAI API Key
```

Target architecture

```
Desktop / Mobile

↓

Backend API

↓

AI Services

↓

Database

↓

Sync
```

Goals

- Authentication
- Sync across devices
- Background AI processing
- Remove API key requirement
- Push notifications
- Usage tracking

---

## 4. Desktop Application

**Status:** Planned

Desktop should become the preferred environment for reviewing and managing knowledge.

Why?

Reviewing hundreds of captures is significantly faster on desktop.

Features

- Native desktop experience (Deno Desktop)
- Keyboard-first navigation
- Global shortcuts
- Drag & Drop
- Multiple windows (future)
- System tray
- Clipboard watcher (future)

---

# Priority P1 — AI Intelligence

These features make Capture Inbox feel intelligent instead of simply organized.

---

## 5. Similar Knowledge Detection

Instead of saying

> Duplicate

AI should say

> Similar ideas already exist.

Questions AI should answer:

- Have I already learned this?
- What is actually new?
- What ideas overlap?
- Is this worth saving?

Example

```
Similar to

• Deep Work
• Focus Notes

New

✓ Background music research

Repeated

✕ Silence improves focus
✕ Notifications reduce productivity
```

---

## 6. AI Priority Queue

Instead of reviewing randomly,

review by importance.

Ranking factors

- Importance
- Novelty
- Confidence
- Reading time
- User interests

High-value captures should appear first.

---

## 7. Idea Extraction

The application should eventually stop treating articles as the primary entity.

Instead

```
Article

↓

Ideas
```

Example

Article:

"10 Productivity Tips"

Extracted ideas

- Time Blocking
- Deep Work
- Habit Stacking

Each idea becomes searchable and reusable.

---

# Priority P2 — Knowledge Management

This is where Capture Inbox becomes more than a read-it-later application.

---

## 8. Knowledge Graph

Inspired by Obsidian.

Unlike Obsidian, relationships should be generated automatically.

Example

```
Backend

├── SQL
├── Redis
├── Authentication
├── APIs
```

Articles connect to ideas.

Ideas connect to other ideas.

Users should be able to explore their knowledge visually.

---

## 9. AI Relationships

Automatically detect

- Parent ideas
- Child ideas
- Related ideas
- Dependencies

Example

```
Backend

↓

SQL

↓

Indexes

↓

Query Optimization
```

---

## 10. AI Collections

Instead of folders,

AI creates collections.

Examples

- Learning Rust
- Vacation Planning
- Productivity
- Backend Engineering

No manual organization required.

---

## 11. Knowledge Resurfacing

Examples

> You saved this six months ago.

or

> This connects with something you captured yesterday.

Help users remember instead of simply storing information.

---

# Priority P3 — Capture Experience

Improve the ways users can capture information.

---

## 12. Voice Notes

Pipeline

```
Voice

↓

Speech to Text

↓

AI Cleanup

↓

Summary

↓

Ideas
```

---

## 13. Image OCR

Support

- Whiteboards
- Books
- Screenshots
- Handwritten notes

Extract

- Text
- Ideas
- Topics

---

## 14. Browser Extensions

Support

- Chrome
- Firefox
- Edge

One-click capture from anywhere.

---

## 15. Email Forwarding

Forward newsletters directly into Capture Inbox.

```
Newsletter

↓

Capture Inbox

↓

AI Analysis

↓

Review Queue
```

---

## 16. Offline Capture

Allow captures while offline.

Automatically synchronize later.

---

# Long-Term Vision

These ideas should not distract from the MVP but define the future direction.

---

## Knowledge Score

Visualize where knowledge is concentrated.

Example

```
Backend      ★★★★★

Psychology   ★★★★

Finance      ★★

Fitness      ★★★
```

---

## Learning Gaps

AI should suggest

> You understand Redis.

Next recommended topic

→ Cache Invalidation

---

## Merge Similar Ideas

Instead of

Save

Offer

Merge

```
Existing Idea

+

New Idea

↓

Updated Knowledge
```

---

## Knowledge Timeline

Visualize learning over time.

```
Rust

↓

Ownership

↓

Borrow Checker

↓

Async

↓

Tokio
```

---

## Personal Knowledge Assistant

Eventually users should be able to ask

- What do I know about SQL?
- Summarize everything I've learned about React.
- Show everything related to Authentication.
- What ideas connect Backend and AI?

---

# Technical Improvements

- Improve prompt quality
- Prompt versioning
- Background workers
- Vector search
- Better SQLite indexing
- Event-driven architecture
- Analytics
- Crash reporting

---

# Current Development Order

1. Finish Daily Review
2. Build Desktop Application
3. Introduce Backend & Authentication
4. AI Similar Knowledge Detection
5. Idea Extraction
6. Knowledge Graph
7. Voice Capture
8. Browser Extensions
9. Knowledge Assistant

---

# Definition of Success

Capture Inbox succeeds when users no longer think of it as a bookmarking app.

Instead, they should feel that it is a system that:

- Captures information effortlessly.
- Helps them decide what matters.
- Extracts meaningful ideas.
- Connects those ideas automatically.
- Gradually builds a searchable personal knowledge base.

The goal is not to collect more content.

The goal is to help users build better knowledge.