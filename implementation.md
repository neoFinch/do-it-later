# Implementation Plan

## Stack

### Mobile

* Ionic 8
* React
* TypeScript
* Capacitor

### State Management

* Zustand

### Local Storage

* Capacitor SQLite

### Routing

* React Router

---

## Project Structure

src/

pages/

* InboxPage
* CaptureDetailPage
* QuickAddPage

components/

store/

* captureStore.ts

services/

* capture.service.ts
* share.service.ts
* metadata.service.ts

database/

* sqlite.ts
* capture.repository.ts

types/

hooks/

---

## Data Model

```ts
interface Capture {
  id: string;

  type: "url" | "note";

  title?: string;

  url?: string;

  content?: string;

  source?: string;

  thumbnail?: string;

  createdAt: number;
}
```

---

## Screens

### Inbox Page

Responsibilities:

* Display captures
* Search captures
* Open detail page

### Capture Detail Page

Responsibilities:

* Show capture details
* Open URL
* Delete capture

### Quick Add Page

Responsibilities:

* Save URL manually
* Save note manually

---

## Services

### Capture Service

Responsibilities:

* Create capture
* Update capture
* Delete capture
* List captures
* Search captures

### Share Service

Responsibilities:

* Receive Android share intents
* Parse incoming content
* Save capture

### Metadata Service

Responsibilities:

* Fetch OpenGraph metadata
* Extract title
* Extract thumbnail

---

## Milestone 1

Project Setup

Deliverables:

* Ionic application
* Routing configured
* Zustand configured
* SQLite configured

---

## Milestone 2

Database Layer

Deliverables:

* Capture table
* Repository pattern
* CRUD operations

---

## Milestone 3

Inbox Screen

Deliverables:

* List view
* Search
* Empty state

---

## Milestone 4

Manual Capture

Deliverables:

* Add URL
* Add note
* Save to SQLite

---

## Milestone 5

Android Share Intent

Deliverables:

* App visible in Android share menu
* Shared URL automatically saved

Acceptance Test:

YouTube → Share → Capture Inbox → URL appears in Inbox

---

## Milestone 6

Metadata Enrichment

Deliverables:

* Fetch page title
* Fetch thumbnail
* Show enriched cards in Inbox

---

## Definition of Done

The application is considered complete for V1 when:

* URLs can be shared into the app.
* Notes can be created manually.
* Captures are persisted locally.
* Captures can be searched.
* Links can be reopened.
* The application works offline.
