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

Before AI can help decide attention, it must first understand the content.
Extracted `ContentDocument` is durable; analysis is a versioned schema that
can evolve (see [AI-Architecture.md](./AI-Architecture.md)).

## Features

For every captured item:

-   Extract article text / YouTube transcript into `ContentDocument`
-   One structured AI analysis pass (`ContentAnalysis`, schema-versioned)
-   Pluggable providers: OpenAI, Ollama (default path)

Store structured metadata (lean triage set; fields may version):

``` ts
schemaVersion: number
lens: "technology" | "science" | "health" | "art" | "movie" | ... | "general"
topics: string[]
targetAudience: string[]
estimatedReadingTime: number | null
estimatedWatchTime: number | null
contentType: string
summary: string
viewerExpectation: { youWillGet: string[]; youWillNotGet: string[] }
expectedValue: "low" | "medium" | "high"
lensFields: object  // domain pack (tech: hands-on; movie: genre; health: ...)
recommendation: string
reasoning: string
confidence: number
```

Analysis must **not** force every capture through a software-learning lens.
Detect a lens, then apply that pack’s criteria and fields.

## Version Outcome

The application understands every saved item instead of treating it as
just another URL — without locking into multi-stage AI storage yet.

------------------------------------------------------------------------

# V2.1 --- AI Attention Assistant

## Goal

Help users decide whether a piece of content deserves their attention.

## Features

For every capture, derive an **Attention Decision** from analysis
(deterministic, **lens-aware** scorecard preferred):

-   Worth Your Time Score
-   Read Now / Read Later / Skip
-   Estimated Effort
-   Expectation framing (you will / won't get — not always “learn”)
-   Lens-specific highlights (e.g. hands-on for tech, genre for movies)
-   Clear reasoning

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

# V2.1a --- On-device Local LLM (experimental)

## Goal

Explore `@capacitor/local-llm` as an optional provider on top of the same
analysis contract — not a replacement for OpenAI/Ollama.

## Scope

-   Availability / download UX (`systemAvailability`, Android download)
-   Short tasks only when available (topics, one-line summary)
-   Hard fallback to cloud/Ollama for full analysis, web, and unsupported devices

## Non-goals

-   Not the default inference path
-   Not required for V2.0 / V2.1 triage to ship

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
