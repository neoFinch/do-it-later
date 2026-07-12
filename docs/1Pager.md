# Capture Inbox

## What is Capture Inbox?

Capture Inbox is a personal **Attention Operating System**.

It helps users capture interesting content from anywhere, understand what it contains, and decide whether it deserves their limited time and attention.

Rather than encouraging people to consume more information, Capture Inbox helps them consume the **right** information.

---

# The Problem

Every day we discover valuable content across many sources:

- YouTube
- Instagram
- Browser
- Reddit
- LinkedIn
- Blogs
- Documentation

Most of it is saved and forgotten.

Bookmarks become clutter.

Read-it-later apps become graveyards.

The real problem is not saving content.

The real problem is deciding **what deserves attention**.

---

# The Solution

```text
Capture
    ↓
Extract (ContentDocument)
    ↓
Analyze (structured metadata)
    ↓
Decide (Read now / Later / Skip)
    ↓
Learn from feedback
```

Instead of asking *What did I save?*, users ask *What should I spend my time on today?*

Technical detail lives in [AI-Architecture.md](./AI-Architecture.md): durable
extracted content, one versioned analysis pass, then an attention decision.
Analysis representation can pivot (triage, organize, recall) without re-saving.

---

# Core Philosophy

Every captured item should answer:

- What is this?
- Who is it for?
- Is it worth my time?
- Why?
- What should I do next?

---

# Product Goals

- Reduce information overload.
- Help users prioritize learning.
- Prevent duplicate consumption.
- Build a personal knowledge base.
- Maximize learning per hour invested.

---

# North Star

Help users spend their attention wisely.

Measure success by **Attention Saved**, not content collected.

---

# Long-Term Vision

```text
Capture
      ↓
Content
      ↓
Analysis
      ↓
Decision
      ↓
Knowledge
```

Capture Inbox ultimately becomes a personal learning companion that helps answer:

> Given everything I could consume today, what is actually worth my attention?
