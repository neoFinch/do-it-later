# Capture Inbox Product Roadmap

# Vision

Capture Inbox is a personal **Attention Operating System**.

Its purpose is **not** to help people save more content.

Its purpose is to help people make better decisions about where to
invest their limited time and attention.

Every captured item should eventually answer five questions:

1.  What is this?
2.  Who is it for?
3.  Is it worth my time?
4.  Why?
5.  What should I do next?

The success of the product is measured not by how many links are saved,
but by how many hours of unnecessary reading or watching are avoided.

------------------------------------------------------------------------

# North Star Metric

## **Attention Saved**

Rather than measuring the number of captures or daily active users,
Capture Inbox measures the value it creates by helping users avoid
wasting time.

Example metrics:

-   ⏳ Time saved by skipping low-value content
-   📚 High-value resources completed
-   🚫 Duplicate or low-value content avoided
-   🎯 Recommendation accuracy
-   📈 Weekly learning progress

Example dashboard:

``` text
This Week

⏳ Time Saved: 2h 45m

📚 High-Value Resources Completed: 6

🚫 Low-Value Resources Skipped: 11

🎯 Recommendation Accuracy: 87%
```

------------------------------------------------------------------------

# V1.0 --- Capture Foundation ✅

## Goal

Capture content from anywhere.

## Features

-   Android Share Intent
-   URL Capture
-   Note Capture
-   Local SQLite Storage
-   Offline Support
-   Search
-   Metadata Extraction
-   Source Detection
-   Thumbnail Extraction
-   Open Original Content

## Version Outcome

The application becomes a reliable inbox for interesting content from
anywhere on the web.

------------------------------------------------------------------------

# V1.1 --- Inbox Management ✅

## Goal

Introduce lifecycle management.

## Features

-   Inbox
-   Reviewed
-   Archived
-   Status Filters
-   Counters
-   Archive
-   Restore

## Version Outcome

Users stop treating every saved item as equally important.

The Inbox becomes a list of items that still require a decision.

------------------------------------------------------------------------

# V1.2 --- Review Queue ✅

## Goal

Reduce inbox clutter and encourage regular review.

## Features

-   Review Queue
-   Open
-   Keep
-   Delete
-   Skip
-   Session Summary

## Version Outcome

Users develop a habit of processing captured content instead of
endlessly collecting it.

------------------------------------------------------------------------

# V2.0 --- AI Content Understanding

## Goal

Teach the application what every capture actually contains.

## Why

Before AI can recommend anything, it must first understand the content.

## Features

For every captured item:

-   Extract article text
-   Extract YouTube transcript
-   Analyze with AI

Store structured metadata:

``` ts
topics: string[]
difficulty: "beginner" | "intermediate" | "advanced"
targetAudience: string[]
estimatedReadingTime: number
estimatedWatchTime: number
containsCode: boolean
containsHandsOn: boolean
contentType: string
summary: string
keyTakeaways: string[]
reasoning: string
```

## Version Outcome

The application understands every saved item instead of treating it as
just another URL.

------------------------------------------------------------------------

# V2.1 --- AI Attention Assistant

## Goal

Help users decide whether a piece of content deserves their attention.

## Features

For every capture:

-   Worth Reading Score
-   Read Now
-   Read Later
-   Skip Recommendation
-   Estimated Value
-   Estimated Effort
-   Learning Outcome
-   AI Reasoning

Example:

``` text
Worth Reading

★★★★★

Recommendation:
Read Now

Reason:
- Practical tutorial
- Contains code
- Intermediate difficulty
- Builds useful concepts

Estimated Time:
20 minutes
```

## Version Outcome

Users stop asking:

> "What did I save?"

and begin asking:

> "What should I read today?"

------------------------------------------------------------------------

# V2.2 --- Duplicate & Overlap Detection

## Goal

Prevent users from consuming the same information repeatedly.

## Features

-   Similar content detection
-   Duplicate detection
-   Better alternative suggestions

Example:

``` text
90% Similar

Redis Explained
Redis Internals
Caching Deep Dive

Recommendation:
Skip

Reason:
You already have higher quality resources covering the same concepts.
```

## Version Outcome

The application actively protects the user's attention instead of merely
storing information.

------------------------------------------------------------------------

# V2.3 --- Personal Learning Profile

## Goal

Understand the user.

## Features

Maintain:

### Current Interests

-   AI Agents
-   Backend
-   Rust
-   Electron
-   Distributed Systems

### Learning Goals

-   Become better at System Design
-   Learn Low-Level Programming
-   Master AI Engineering

### Preferred Content

-   Hands-on tutorials
-   Code examples
-   Practical projects

Use this profile to personalize recommendations.

## Version Outcome

Recommendations become personal rather than generic.

The same article may receive different recommendations for different
users.

------------------------------------------------------------------------

# V2.4 --- Daily Focus

## Goal

Turn captured knowledge into a daily learning habit.

## Features

Daily digest:

``` text
Today's Best Use of Your Time

1. Redis Memory Model
★★★★★
25 min

2. OAuth Security
★★★★☆
15 min

3. Skip these today
Mostly duplicates
```

Future:

-   Push notifications
-   Email digest

## Version Outcome

The app becomes something users open every morning, not only when saving
content.

------------------------------------------------------------------------

# V3.0 --- Personal Knowledge Graph

## Goal

Transform captured content into connected knowledge.

## Features

-   Semantic Search
-   Related Content
-   Learning Paths
-   Topic Clusters
-   Knowledge Graph

Example:

``` text
Redis
 ↓
Memory
 ↓
Caching
 ↓
Distributed Systems
 ↓
CAP Theorem
```

## Version Outcome

The application evolves from an inbox into a searchable knowledge
system.

------------------------------------------------------------------------

# V3.1 --- AI Learning Companion

## Goal

Guide long-term learning.

## Features

Questions like:

-   I have 30 minutes. What should I study?
-   I'm preparing for backend interviews. Which saved resources should I
    prioritize?
-   What concepts am I repeatedly ignoring?
-   Explain this article using concepts I've already learned.

## Version Outcome

The application becomes a learning mentor rather than a bookmark
manager.

------------------------------------------------------------------------

# V4.0 --- Attention Operating System

## Goal

Become the user's intelligence layer for information consumption.

The application continuously learns from:

-   Saved content
-   Opened content
-   Ignored content
-   Archived content
-   Reading history
-   Learning goals
-   Interests
-   Available time

It helps users decide:

-   What to consume
-   What to postpone
-   What to ignore
-   What to revisit
-   What to learn next

## Version Outcome

Capture Inbox becomes a trusted decision-making assistant that helps
users spend their attention wisely instead of simply storing links.
