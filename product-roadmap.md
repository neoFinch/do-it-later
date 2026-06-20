# PRODUCT_ROADMAP.md

# Capture Inbox Roadmap

## Vision

Capture Inbox is evolving from a simple bookmarking application into a personal content operating system.

The long-term goal is not merely storing links but helping the user decide:

* What deserves attention
* What can be ignored
* What should be remembered
* What should become actionable knowledge

---

# Bugs

1. Sometimes on sharing a link, the item is added 2 times

---

# Current State (V1.0)

Completed Features

✅ Android Share Intent

✅ URL Capture

✅ Note Capture

✅ Local SQLite Storage

✅ Offline Support

✅ Search

✅ Metadata Extraction

✅ Source Detection

✅ Thumbnail Extraction

✅ Open Original Content

Supported Sources:

* YouTube
* Instagram
* Browser Links
* Generic URLs

---

# V1.1 — Inbox Management

Goal:

Introduce content lifecycle management.

Problem:

Every saved item currently has equal importance.

Features:

* Status Field

```ts
INBOX
REVIEWED
ARCHIVED
```

* Filter By Status
* Archive Action
* Restore Action
* Inbox Counters

Example:

```text
Inbox (24)

Reviewed (18)

Archived (132)
```

Success Criteria:

User can actively manage saved content instead of accumulating an endless list.

---

# V1.2 — Review Queue

Goal:

Reduce inbox clutter.

Problem:

Users save content faster than they consume it.

Features:

* Review Screen
* Next Item Navigation
* Quick Actions

```text
Open

Reviewed

Archive

Skip
```

* Swipe Gestures (Optional)

Workflow:

```text
Inbox
 ↓
Review Queue
 ↓
Decision
```

Success Criteria:

Users can process large numbers of saved items quickly.

---

# V1.3 — Capture Notes

Goal:

Preserve context.

Problem:

Months later the user forgets why content was saved.

Features:

* Notes Field
* Edit Notes
* Search Notes

Example:

```text
Why I saved this:

Useful explanation of
transformer attention.
```

Success Criteria:

Every capture can include personal context and observations.

---

# V2.0 — AI Relevance Assistant

Goal:

Help users prioritize attention.

Problem:

Not all captures are equally valuable.

Features:

* Relevance Analysis
* Similar Content Detection
* Personalized Recommendations

Example:

```text
Why This Matters:

Related to content you've
previously saved about:

- AI Agents
- System Design
- Caching
```

Success Criteria:

Users understand why content may be valuable before consuming it.

---

# V2.1 — AI Summaries

Goal:

Reduce content consumption time.

Features:

For Articles:

* TLDR
* Key Takeaways
* Action Items

For YouTube:

* Transcript Extraction
* Summary
* Key Points

Data Model:

```ts
summary?: string;
```

Success Criteria:

Users can determine whether content is worth consuming without reading or watching everything.

---

# V2.2 — Daily Digest

Goal:

Convert captures into a daily review habit.

Features:

Daily Summary:

```text
Today's Captures

1. Redis Internals
   1-minute summary

2. AWS Lambda Optimization
   Key Takeaways

3. AI Agent Architecture
   Action Items
```

Delivery:

* In-App
* Notification
* Future Email Support

Success Criteria:

Users review captured content consistently.

---

# V3.0 — Personal Knowledge System

Goal:

Transform captures into searchable knowledge.

Potential Features:

* Semantic Search
* Knowledge Graph
* Related Content
* Learning Paths
* Topic Clustering

Examples:

```text
Show all content related to:

- Redis
- System Design
- AI Agents
```

Status:

Future Exploration

Not Currently Planned

```
```
