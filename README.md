# Capture Inbox (Later)

Personal **Attention Operating System** — capture content from anywhere, understand it, and decide whether it deserves your time.

Stack: Ionic React, Capacitor (Android), SQLite, pluggable AI (OpenAI / Ollama / experimental on-device Local LLM).

Product and AI details live in [`docs/`](./docs/).

---

## Pending

Parked and upcoming work. Order is approximate, not a commitment.

### Near-term / parked

- [ ] **Re-render issue when metadata is fetched** — UI flickers or re-renders when capture metadata/thumbnails load after save
- [ ] **Instagram / share metadata failures** — thumbnail or extracted content sometimes missing on share (network, login wall, or timing); need reliable re-fetch from capture detail with a clear message when extraction still cannot be done (partial retry exists today; improve UX for missing image + empty body)
- [ ] **Hide Extracted content from end users** — keep extraction for AI; detail screen may not need the raw transcript/article preview (`TODO` in `CaptureExtractedContent.tsx`)
- [ ] **Manual lens override** — let the user change technology / movie / health / etc. and re-analyze
- [ ] **File capture extraction** — currently skipped (“not supported yet”)
- [ ] **Instagram / social extraction polish** — more chrome edge cases beyond the first cleanup pass; handle empty OG / blocked fetches gracefully
- [ ] **Local LLM hardening** — still experimental; works only on Gemini Nano / Apple Intelligence–capable devices; improve status UX and when to fall back
- [ ] **App icon & splash screen** — proper branding assets for install / launch (currently missing)

### AI chat & search

- [ ] **In-app AI assistant** — chat over your saved library: natural-language search and suggestions (e.g. “show me comedy movie recommendations”, “feeling low — good motivational content”), grounded in captures and analysis metadata

### Extractors (future sources)

- [ ] PDF extractor
- [ ] Reddit extractor
- [ ] Richer Instagram / TikTok / Twitter body extraction when OG caption is missing

### Platform

- [ ] **iOS** app target (Android is the current shell)
- [ ] Web analysis remains cloud/Ollama-only (on-device Local LLM unsupported on web)

### Product roadmap (not shipped)

From [`docs/product-roadmap.md`](./docs/product-roadmap.md):

- [ ] **V2.2** — Duplicate & overlap detection (“you already saved something similar”)
- [ ] **V2.3** — Personal learning profile (interests, goals, preferred content)
- [ ] **V2.4** — Daily focus digest
- [ ] **V3.0** — Personal knowledge graph / semantic search / related content
- [ ] **V3.1** — AI learning companion (mentor-style queries over saves)
- [ ] **V4.0** — Full Attention OS driven by behavioral signals

### AI architecture (later expansion)

From [`docs/AI-Architecture.md`](./docs/AI-Architecture.md):

- [ ] **User signals** — opened / completed / ignored / liked → personalization loop
- [ ] **Split AI stages** — only if Understand / Classify / Enrich / Evaluate need to evolve independently
- [ ] **Domain evaluators** — deeper per-lens scoring beyond the shared triage pass

---

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/1Pager.md](./docs/1Pager.md) | Product one-pager |
| [docs/product-principles.md](./docs/product-principles.md) | Principles |
| [docs/product-roadmap.md](./docs/product-roadmap.md) | Version roadmap |
| [docs/AI-Architecture.md](./docs/AI-Architecture.md) | AI pipeline & providers |
| [docs/implementation.md](./docs/implementation.md) | Technical implementation |
| [scripts/README.md](./scripts/README.md) | Android helper scripts |
