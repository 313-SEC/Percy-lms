# BLACKSITE: Academy — Feature Reference

A complete feature list for the personal LMS. All features run fully offline except AI endpoints (which require an external provider API key or a local Ollama instance).

---

## Core Learning

| Feature | Description |
|---|---|
| **Course Browser** | Create, reorder (drag-and-drop), and manage courses with colour-coded cards. Each card shows a live progress bar. |
| **Modules & Content** | Organise content inside courses via modules. Reorder modules and individual content items. |
| **Video Player** | Custom HTML5 player with scrubbing, volume, playback speed (0.5–2×), HTTP range streaming, and bookmark support. |
| **Document Viewer** | Upload and stream PDF, PPTX, DOCX, TXT, and MD files. |
| **Progress Tracking** | Per-content watch time and completion state persisted to the database. Course cards show overall completion %. |

---

## Content Ingestion

| Upload Type | How |
|---|---|
| **Video** | MP4/WebM/OGG via file upload; streamed with HTTP range requests |
| **Document** | PDF, PPTX, DOCX, TXT, MD via file upload |
| **Link** | Any external URL saved as a content item |
| **YouTube** | YouTube URL saved as an external link (dedicated tab in Upload Modal) |

---

## Subtitles & Transcription

| Feature | Detail |
|---|---|
| **Manual upload** | SRT or VTT files, any language |
| **Auto-generate** | Whisper (local) triggered from the Player sidebar; status is polled every 5 s and subtitles load automatically on completion |
| **Live status** | "Transcribing (processing…)" indicator replaces the static alert |

---

## AI Tools (in Player)

All tools operate on the current content item. They require an AI provider configured in Settings.

| Tool | Modes / Detail |
|---|---|
| **Summarise** | Three modes: *Summary* (prose), *Key Points* (bullets), *Flashcards* (interactive flip-cards) |
| **Quiz** | Generates 3–15 multiple-choice questions; answers are graded inline with explanations |
| **Teach-Back** | Generates 5 open-ended questions; student types answers; AI grades each 1–5 ★ with feedback and a model answer |
| **Voice Note** | Browser Speech Recognition (Chrome/Edge); transcribes speech and saves it as a timestamped note |

---

## Spaced Repetition Review

| Feature | Detail |
|---|---|
| **Review cards** | Any note can become a flashcard (SM-2 algorithm) |
| **Due badge** | Sidebar shows the count of cards due today, updated every 60 s |
| **Review page** | `/review` — work through due cards, rate recall quality (0–5), earn XP |

---

## Knowledge Graph

- Located at `/graph`
- SVG radial layout: courses (cyan, inner ring) → modules (purple) → notes (green, outer ring)
- Scroll to zoom, drag to pan
- Hover a node to see its label and type
- Updates automatically as you add courses, modules, and notes

---

## Notes

| Feature | Detail |
|---|---|
| **Markdown** | Full markdown body, stored per content item or course |
| **Timestamps** | Notes can be linked to a video timestamp; click to jump |
| **Search** | Full-text search across all notes via `/search` |
| **Export** | Download notes as markdown for use with NotebookLM or Obsidian |

---

## Gamification

| Element | Detail |
|---|---|
| **XP** | Earned for watching content, completing reviews, Pomodoro sessions |
| **Levels** | XP thresholds displayed on Dashboard |
| **Achievements** | Unlocked by milestones (e.g. first course, first 10 notes) |
| **Streak** | Daily login / study streak |
| **Activity Chart** | 30-day XP bar chart on Dashboard |

---

## Pomodoro Timer

- Configurable work / break durations
- Sessions linked to a content item (earns XP)
- Stats visible on Dashboard

---

## AI Course Creator (`/ai`)

- Generate a full course outline (title, modules, topics) from a text prompt
- Requires an AI provider configured in Settings
- Instantly creates the course and all modules in the database

---

## Search (`/search`)

- Full-text search across courses, content titles, and notes
- Results grouped by type with navigation links

---

## Export (`/export`)

- Export all notes for a course as a single Markdown file
- Compatible with NotebookLM, Obsidian, and any markdown reader

---

## Settings — AI Providers

Supported providers (all optional; only one active needed):

| Provider | Notes |
|---|---|
| **OpenAI** | GPT-4o-mini default; any model name accepted |
| **Anthropic** | Claude Haiku default |
| **Google Gemini** | gemini-1.5-flash default |
| **Ollama** | Local inference; no API key required |
| **HuggingFace** | Inference API |

API keys are encrypted at rest (AES-256-GCM). The raw key is never returned to the frontend.

---

## Security

- JWT authentication (HTTP-only bearer token)
- Rate limiting (200 req/min per IP)
- Strict CSP headers
- File MIME validation before storage
- Path traversal protection on file streaming
