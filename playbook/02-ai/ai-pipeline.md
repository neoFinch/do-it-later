# AI Architecture

## Purpose

This document describes how AI is integrated into Capture Inbox (Later).

It is the technical counterpart to the product docs. Product principles answer
*what* we optimize for; this document answers *how* AI is structured.

The guiding philosophy is:

> AI helps users decide whether content deserves their attention — with
> structured metadata and clear reasoning — without replacing their judgment.

Every saved capture should evolve from a raw URL into structured knowledge that
supports triage today and richer organization later.

---

# Core Principles

- **Triage first.** The primary AI job is helping answer "Is this worth my time?"
- **Structure over raw text.** Prefer typed metadata over free-form essays.
- **Extraction before AI.** Normalize source content; never reason on bare URLs.
- **Durable content, flexible analysis.** `ContentDocument` is stable; analysis
  schemas may version and pivot.
- **Providers are interchangeable.** Cloud, network-local (Ollama), and on-device
  backends share one completion contract.
- **Expensive models only when needed.** Prefer cheaper/faster paths when quality
  is good enough.
- **Humans decide.** AI recommends; the user always has the final call.

---

# Durable Layers (current target)

Early-stage architecture uses three durable layers. Analysis representation can
change without re-extracting sources.

```text
Capture
    ↓
ContentDocument          ← durable: extract once, improve extractors
    ↓
ContentAnalysis (vN)     ← versioned: one structured LLM pass
    ↓
AttentionDecision        ← product surface: Read now / Later / Skip + why
    ↓
UserSignals (later)      ← opened / completed / ignored / liked
```

| Layer | Responsibility | AI? |
|-------|----------------|-----|
| Capture | URL, source, lifecycle (`INBOX` / `REVIEWED` / `ARCHIVED`) | No — never stores AI fields |
| ContentDocument | Title, text, transcript, metadata from source extractors | No |
| ContentAnalysis | Structured understanding for triage / organize / recall | Yes — one versioned pass |
| AttentionDecision | Stars, Read now / Later / Skip, short why | Mostly deterministic from analysis |
| UserSignals | Behavioral feedback for personalization | Later |

**Product projections** of the same analysis (without new pipeline stages):

- **Triage** — attention scorecard (primary near-term value)
- **Organize** — topics / tags / filters
- **Recall** — "why you saved this" one-liner
- **Focus** — daily digest (roadmap)

---

# Stage 1 — Capture

```ts
interface Capture {
  id: string;
  url: string;
  source: "youtube" | "instagram" | "article";
  status: "INBOX" | "REVIEWED" | "ARCHIVED";
  createdAt: Date;
}
```

Responsibilities:

- Store the original URL and source.
- Track lifecycle state.
- Never contain AI-generated information.

---

# Stage 2 — Extraction

Extract raw information into a common document format. No AI reasoning.

```text
YouTube Extractor
Instagram Extractor
Article Extractor
PDF Extractor (future)
Reddit Extractor (future)
```

```ts
interface ContentDocument {
  title?: string;
  description?: string;
  articleText?: string;
  transcript?: string;
  thumbnail?: string;
  author?: string;
  publishedAt?: Date;
  duration?: number;
  source: "youtube" | "instagram" | "article";
}
```

This is the durable asset. Better extractors beat more AI stages.

---

# Stage 3 — Content Analysis (single versioned pass + lens)

One structured LLM call produces the fields needed for triage and discovery.
Do **not** split into separate Understand / Classify / Enrich tables until
prompts or models need to evolve at different rates.

## The lens problem

Not every capture should be judged with the same criteria.

Today’s implementation effectively uses a single **software / learning** lens
(`implementationLevel`, `codeWalkthrough`, “hands-on”, mentor-style prompts).
That mis-scores art, basic science, health/exercise, movie recommendations, and
similar non-tech saves.

**Rule:** triage is universal (“Is this worth my time?”); the *criteria and
fields* used to answer it are **lens-specific**.

## Lenses

A lens is a domain pack: prompt guidelines + typed fields + scorecard labels.

```ts
type AnalysisLens =
  | "technology"
  | "science"
  | "health"
  | "art"
  | "movie"
  | "finance"
  | "productivity"
  | "news"
  | "general";
```

| Lens | Judges for | Example lens fields |
|------|------------|---------------------|
| technology | practical learning, follow-along value | implementationLevel, codeWalkthrough, learningStyle |
| science | clarity, depth, prior knowledge needed | depth, evidenceStyle, prerequisites |
| health | actionability, safety caveats | exerciseType, equipmentNeeded, medicalAdviceRisk |
| art | craft insight vs inspiration, time worth | medium, inspirational vs instructional |
| movie | fit, tone, spoilers, runtime value | genre, mood, spoilerRisk, whyWatch |
| finance | educational vs opinion, risk framing | educational vs opinion, beginnerFriendly |
| productivity | actionable steps, fluff risk | actionability, templateOrFramework |
| news | timeliness, evergreen value | timeSensitivity, evergreen |
| general | fallback when no specialist lens fits | — |

Lens detection happens **inside the same analysis pass** (model returns `lens`
plus matching `lensFields`). A cheap pre-classify step is optional later if the
single pass is unreliable.

Users may later **override lens** per capture and re-run analysis.

## Shared core + lens payload

```ts
interface ContentAnalysis {
  schemaVersion: number;
  captureId: string;

  // Which judgment pack was applied
  lens: AnalysisLens;

  // Shared core (every lens)
  summary: string;
  topics: string[];
  contentType: string;
  targetAudience: string[];
  estimatedReadingTime: number | null;
  estimatedWatchTime: number | null;

  // Domain-neutral expectation framing (not always "learning")
  viewerExpectation: {
    youWillGet: string[];
    youWillNotGet: string[];
  };
  expectedValue: "low" | "medium" | "high";
  potentialDisappointment: "low" | "medium" | "high";

  // Lens-specific structured fields (discriminated by lens)
  lensFields: Record<string, unknown>;

  // Seeds for AttentionDecision
  recommendation: string;
  reasoning: string;
  confidence: number;
  analyzedAt: number;
}
```

Examples of `lensFields`:

```ts
// technology
{ implementationLevel, learningStyle, codeWalkthrough, prerequisites, difficulty }

// movie
{ genre, mood, spoilerRisk, runtimeFit, whyWatch }

// health
{ exerciseType, equipmentNeeded, intensity, medicalAdviceRisk }
```

Old tech-only fields (`youWillLearn`, `codeWalkthrough` at top level) migrate
into `viewerExpectation` + `lensFields` via `schemaVersion`.

Prompt shape:

```text
Shared system: attention triage, conservative confidence, JSON only
    +
Lens pack: domain-specific guidelines and field schema
    +
ContentDocument body
```

Old rows remain readable via `schemaVersion`. Mark stale and re-analyze when
prompts, lenses, or models improve.

---

# Stage 4 — Attention Decision

Turns analysis into the product answer: **Is this worth my time?**

Prefer a **deterministic scorecard** derived from analysis (stars, Read now /
Later / Skip, short reasons). Scoring weights and UI labels are **lens-aware**
(e.g. technology shows implementation level; movie shows genre / spoiler risk;
health shows actionability). Shared inputs stay `expectedValue`,
`potentialDisappointment`, and `confidence`.

```ts
interface AttentionDecision {
  captureId: string;
  lens: AnalysisLens;
  stars: number;
  action: "read_now" | "read_later" | "skip";
  reasons: string[];
  estimatedMinutes?: number;
  // UI metrics chosen by lens pack
  highlightMetrics: { label: string; value: string }[];
}
```

---

# Stage 5 — User Signals (later)

```ts
interface UserFeedback {
  captureId: string;
  opened: boolean;
  completed: boolean;
  archived: boolean;
  ignored: boolean;
  liked: boolean;
  timeSpentMinutes: number;
}
```

Used for personalization and measuring Attention Saved — not required for V2 triage.

---

# Processing Lifecycle

```ts
type Status = "pending" | "processing" | "completed" | "failed" | "skipped";

interface CaptureProcessing {
  captureId: string;
  extractionStatus: Status;
  analysisStatus: Status;
  // decision is derived locally; no separate LLM status unless we add a second pass
  extractionError?: string | null;
  analysisError?: string | null;
  updatedAt: number;
}
```

```text
Capture Created
  → Extracting
  → Analyzing
  → Decision Ready
  → Reviewed / Archived
```

---

# AI Providers

Providers implement a thin completion contract. Stage-specific methods are
premature until call shapes diverge.

```ts
interface AIProvider {
  readonly id: ProviderId;
  readonly displayName: string;
  isAvailable(): boolean | Promise<boolean>;
  complete(prompt: { system: string; user: string }): Promise<string>;
}
```

## Default path (production)

| Provider | Role |
|----------|------|
| OpenAI | Cloud — reliable structured JSON analysis |
| Ollama | Network-local server — privacy / cost when available |
| null | Disabled / offline fallback |

## Experimental path — on-device Local LLM

[`@capacitor/local-llm`](https://capacitorjs.com/docs/apis/local-llm) wraps
Apple Foundation Models (iOS) and Gemini Nano (Android). It is **Capacitor LABS
(experimental)** and is treated as a **separate provider implementation** on top
of the same `AIProvider` contract — not the architecture backbone.

Constraints to design around:

- Web is not supported.
- Text LLM on iOS requires Apple Intelligence–capable hardware and recent OS.
- Gemini Nano requires AI-capable Android devices (e.g. Pixel-class); model may
  need download via Play Services.
- Android `maximumOutputTokens` is clamped (1–256) — too small for full rich
  analysis of long transcripts.
- No background inference; foreground-only.
- Quotas / `BUSY` errors require backoff and fallback.

**Intended use:** optional provider for short tasks (topics, one-line summary,
light classify) when `systemAvailability()` is `available`. Always fall back to
OpenAI/Ollama for full `ContentAnalysis`, long inputs, unsupported devices, and
web.

```text
ContentDocument
      ↓
Provider router
  ├── LocalLLM (optional, short tasks, when available)
  └── OpenAI / Ollama (default, full analysis)
      ↓
ContentAnalysis → AttentionDecision
```

Spike order: keep the lean pipeline working on cloud/Ollama first; add
`local-llm` as a second provider behind availability checks without changing
storage or UX contracts.

---

# Storage

```text
Capture
│
├── ContentDocument
├── ContentAnalysis (schemaVersioned)
├── AttentionDecision (derived or stored)
└── UserFeedback (later)
```

Capture rows never embed AI blobs. Analysis can be re-run without re-extracting.

---

# Future expansion (not current implementation)

Promote separate Understand / Classify / Enrich / Evaluate stages **only when**:

- Prompts for different concerns change at different rates.
- Domain evaluators diverge (tech vs health vs movies).
- Local vs cloud routing needs different models per concern.
- A single JSON analysis blob becomes painful to version.

Until then, those names are conceptual concerns inside one `ContentAnalysis`
pass — not separate storage or pipeline statuses.

Long-term product arc (unchanged):

```text
URL → Content → Analysis → Decision → Knowledge → Personal Intelligence
```

The objective is not to automatically decide what users must consume.

The objective is a personal attention system where every capture is easier to
triage, discover, understand, and revisit — while the user always decides.
