# Capture Inbox

## Vision

Capture Inbox is a personal mobile application that acts as a universal content inbox.

The primary goal is to reduce friction when saving content discovered across apps such as YouTube, Instagram, browsers, LinkedIn, Reddit, and WhatsApp.

The application should become the user's trusted "save for later" destination.

---

## Problem

Interesting content is discovered throughout the day but often gets lost.

Current workflows such as sending links to WhatsApp chats, browser bookmarks, notes apps, or screenshots create fragmented storage and poor retrieval.

The user needs a single location where content can be captured instantly and reviewed later.

---

## V1 Goals

* Save URLs from Android Share Menu
* Save text notes manually
* Browse saved content
* Search saved content
* Open saved links
* Work completely offline

---

## Non Goals

The following are explicitly out of scope for V1:

* AI summaries
* Content recommendations
* Categorization
* Tags
* Reminders
* Push notifications
* Backend synchronization
* Multi-user support
* Vector databases
* Agents and workflows

---

## Success Criteria

A user should be able to:

1. Share a URL from any Android app.
2. See the saved item immediately in the inbox.
3. Search previously saved content.
4. Open saved links later.
5. Use the application without internet access.

---

## Future Vision

Future versions may include:

* AI summarization
* Content ranking
* Daily digests
* Automatic categorization
* Personal knowledge base integration
* Backend sync
* Desktop application

These features must not influence the V1 architecture beyond keeping the data model extensible.
