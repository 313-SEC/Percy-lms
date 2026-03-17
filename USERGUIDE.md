# Percy LMS — Complete User Guide

> A personal Learning Management System with gamification, AI course generation, video streaming, spaced repetition, and a knowledge graph.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Course Management](#3-course-management)
4. [Video Player](#4-video-player)
5. [Notes](#5-notes)
6. [Pomodoro Timer](#6-pomodoro-timer)
7. [Gamification — XP, Levels & Achievements](#7-gamification--xp-levels--achievements)
8. [AI Course Creator](#8-ai-course-creator)
9. [Search](#9-search)
10. [Settings — AI Providers](#10-settings--ai-providers)
11. [Export & NotebookLM](#11-export--notebooklm)
12. [Spaced Repetition Review](#12-spaced-repetition-review)
13. [Knowledge Graph](#13-knowledge-graph)
14. [Player AI Tools](#14-player-ai-tools)
15. [Appendix](#15-appendix)

---

## 1. Getting Started

### Requirements

- Python 3.11+
- Node.js 18+
- Git

### Installation

```bash
git clone <your-repo-url> Percy-lms
cd Percy-lms
chmod +x start.sh
./start.sh
```

The startup script will:
1. Create a Python virtual environment (`.venv`)
2. Install all Python dependencies
3. Install all Node.js dependencies
4. Generate a `.env` file with cryptographically secure secrets
5. Create storage directories (`storage/videos`, `storage/documents`, etc.)
6. Start the backend on **http://localhost:8000**
7. Start the frontend on **http://localhost:5173**

Open **http://localhost:5173** in your browser.

### First Login

| Field | Default Value |
|---|---|
| Username | `admin` |
| Password | `changeme` |

> Change the password in `.env` under `DEFAULT_ADMIN_PASSWORD` before first run, or update the database directly after setup.

### Navigation Overview

The left sidebar contains all primary sections:

| Icon | Section | Purpose |
|---|---|---|
| Dashboard | Overview, stats, activity chart |
| Courses | Browse and manage all courses |
| Notes | All your notes in one place |
| Search | Cross-platform search |
| AI Creator | Generate courses with AI |
| Settings | Configure AI provider API keys |

---

## 2. Dashboard

The Dashboard is your home base. It shows at a glance:

### Stats Row (top)

| Stat | What it means |
|---|---|
| **Level** | Your current gamification level |
| **Total XP** | All XP accumulated across all activities |
| **Day Streak** | Consecutive days you've studied |
| **Minutes Studied** | Total video watch time (minutes) |

### Activity Chart (30 days)

A bar chart showing XP earned per day for the last 30 days.

- **Cyan bar** = today
- **Dim cyan bars** = days with activity
- **Dark bars** = days with no activity
- The total XP across the period is shown below the chart

### Focus Timer (Pomodoro)

The Pomodoro timer sits directly on the Dashboard so you can start a focus session without navigating away. See [Section 6](#6-pomodoro-timer) for full details.

Below the timer, two stat cards show:
- **Today's Sessions** — how many work sessions you completed today
- **Today's Focus** — total focus minutes today

### Recent Courses

Shows your first 4 courses as quick-launch cards. Click any card to jump to the Courses page. Click **View all** to go to the full course browser.

---

## 3. Course Management

Navigate to **Courses** in the sidebar.

### Creating a Course

1. Click **New Course** (top right)
2. Fill in:
   - **Title** (required)
   - **Description** (optional)
   - **Category** (optional label, e.g. "Programming", "Language")
   - **Color** (hex colour — sets the visual accent for the course card)
3. Click **Create**

The new course appears in the grid and is automatically selected.

### The Course Grid

All courses appear as cards in a responsive grid. Each card shows the course title, category badge, and the colour accent.

**Drag to reorder:** Click and drag any course card to rearrange. The new order is saved automatically.

**Select a course:** Click a card (without dragging) to open the **Course Detail Panel** below the grid.

### Course Detail Panel

When a course is selected, a panel expands below showing:

- All **modules** in order
- Within each module, all **content items** (videos, documents, links)
- A **+ Module** button to add a new module
- An **Upload Content** button to add files or links

#### Creating a Module

1. Open a course's detail panel
2. Click **+ Module**
3. Enter a title and optional description
4. Click **Create**

Modules can be reordered by dragging within the detail panel.

#### Adding Content to a Module

Click **Upload Content** (or the upload button in the detail panel) to open the Upload Modal.

**Three content types are supported:**

---

**Video**
- Click the **Video** tab
- Select a module
- Enter a title
- Click **Choose file** and select a video file (`mp4`, `mkv`, `mov`, etc. up to 10 GB)
- Click **Upload** — a progress bar shows upload progress

**Document**
- Click the **Document** tab
- Select a module
- Enter a title
- Click **Choose file** and select a document (`.pdf`, `.docx`, `.pptx`, `.txt`, `.md` up to 500 MB)
- Click **Upload**

**Link**
- Click the **Link** tab
- Select a module
- Enter a title for the link
- Enter the full URL (e.g. `https://youtube.com/watch?v=...`)
- Click **Add Link** — no file upload needed

---

### Deleting a Course

Click the **trash icon** on a course card. You will be prompted to confirm. Deleting a course removes all its modules, content, notes, bookmarks, and associated files.

### Deleting a Module or Content Item

Open the course detail panel. Each module and content item has a delete button. Module deletion cascades to all its content.

---

## 4. Video Player

Click any **video content item** from the course detail panel to open the player.

### Player Layout

```
┌──────────────────────────────────┬─────────────────┐
│                                  │  Bookmarks /    │
│         Video Player             │  Notes /        │
│                                  │  Subtitles      │
├──────────────────────────────────┤  (tabs)         │
│  Subtitle controls               │                 │
└──────────────────────────────────┴─────────────────┘
```

### Playback

- Standard HTML5 video controls (play/pause, scrub, volume, fullscreen)
- **Resume from last position** — the player automatically seeks to where you left off
- **Progress is tracked continuously** — every update sends your current position to the backend
- **XP is earned** for every minute of video watched (1 XP/minute)
- **Completion XP** (10 XP) is awarded the first time you reach the end of a video

### Bookmarks

In the right sidebar, the **Bookmarks** tab lets you drop timestamped markers.

1. While watching, click the **bookmark button** in the player controls
2. Enter a label when prompted
3. The bookmark appears in the list with the timestamp

Click any bookmark in the list to **jump directly to that timestamp** in the video.

Delete a bookmark with the trash icon.

### Notes While Watching

Switch to the **Notes** tab in the right sidebar.

1. Click **New Note**
2. Enter a title and write in Markdown
3. The note is linked to this specific video content
4. Notes with a video timestamp show a cyan badge (e.g. `@ 4:32`) — clicking that badge jumps to that point in the video

All notes created here also appear in the global **Notes** page.

### Subtitles

Switch to the **Subtitles** tab.

**Upload subtitles manually:**
Below the video, click **Upload SRT/VTT** and choose a subtitle file.
- `.srt` files are automatically converted to WebVTT format
- `.vtt` files are used as-is

**Auto-generate with Whisper (AI):**
Click **Auto-generate** below the video. This triggers Whisper (OpenAI's speech recognition model) to transcribe the audio in the background.

- Requires Whisper to be installed (included in `requirements.txt`)
- Processing takes roughly 1–2× the video duration on CPU
- Check the Subtitles tab again when processing completes — the status is tracked server-side (`idle → processing → completed / failed`)

**Multiple subtitle tracks** are supported. Each appears in the Subtitles tab with its language code. Auto-generated tracks are labelled `(auto)`.

Subtitles appear as closed captions in the video player via the native track selector.

---

## 5. Notes

Navigate to **Notes** in the sidebar.

### Layout

```
┌──────────────┬──────────────────────────────────────┐
│  Note List   │  Note Viewer / Editor                │
│  (scrollable)│                                      │
└──────────────┴──────────────────────────────────────┘
```

### Creating a Note

Click the **+** button (top right of the note list).

Fill in:
- **Title** — required
- **Body** — written in **Markdown** (supports headings, bold, italic, code blocks, tables, lists, and more via GitHub Flavored Markdown)
- **Course** or **Content** link — optionally associate the note with a specific course or video (set in the note editor form)
- **Video Timestamp** — optionally link the note to a specific point in a video

Click **Save**.

### Editing a Note

Click any note in the list to view it.

Click **Edit** to switch to edit mode:
- The title becomes an editable input
- The body becomes a raw Markdown textarea
- Click **Save** to apply changes, or **Cancel** to discard

### Markdown Rendering

In view mode, the note body is rendered as formatted Markdown. Supported elements:

- `# Heading 1`, `## Heading 2`, `### Heading 3`
- `**bold**`, `*italic*`, `~~strikethrough~~`
- `` `inline code` `` and fenced code blocks with syntax highlighting
- `> blockquotes`
- Unordered and ordered lists
- Tables (GFM)
- `[Links](url)`

### Deleting a Note

With a note selected, click the **trash icon**. You will be prompted to confirm.

### Video Timestamp Badges

Notes linked to a video at a specific time show a cyan `@ MM:SS` badge. If you click that badge from the **Notes** page, nothing happens (there's no player context). If you created the note from the Player, clicking the badge in the Player sidebar jumps the video to that timestamp.

### Exporting Notes

**Export all notes** (as a single Markdown file):
Click the **download icon** at the top of the note list. A file `percy_notes.md` is downloaded immediately.

This Markdown file is formatted for compatibility with **Google NotebookLM** (see [Section 11](#11-export--notebooklm)).

---

## 6. Pomodoro Timer

The Pomodoro timer is available on the **Dashboard** and can be accessed from any screen by navigating there.

### Session Types

| Mode | Duration | Purpose |
|---|---|---|
| **Focus** | 25 min | Deep work / studying |
| **Short Break** | 5 min | Rest between sessions |
| **Long Break** | 15 min | Longer rest after multiple sessions |

### Using the Timer

1. Select a session type (Focus, Short Break, or Long Break)
2. Click **Start**
3. The countdown begins with a progress bar
4. The display turns red with 10 seconds remaining as a visual warning
5. When the timer reaches 00:00, it stops automatically

**If you need to stop early:** Click **Stop** (this marks the session as incomplete — no XP awarded).

**Reset:** Click **Reset** to return to the starting time (only available when not running).

### XP Rewards

Completing a **Focus** (work) session awards **+15 XP** and shows a toast notification.

Break sessions do not award XP.

### Statistics

Below the timer, two stat cards show:
- **Today's Sessions** — focus sessions completed today
- **Today's Focus** — total minutes focused today

All-time statistics are also tracked and visible via the API (`GET /api/pomodoro/stats`).

---

## 7. Gamification — XP, Levels & Achievements

### XP (Experience Points)

Every learning activity earns XP. Your total XP accumulates and drives level progression.

| Activity | XP Earned |
|---|---|
| Watch 1 minute of video | +1 XP |
| Complete a video/lesson | +10 XP |
| Complete a module | +25 XP |
| Complete a course | +100 XP |
| Create a note | +5 XP |
| Complete a Pomodoro session | +15 XP |
| Daily login | +5 XP |
| 7-day streak reached | +50 XP (bonus) |
| 30-day streak reached | +200 XP (bonus) |

### Levels

Your level is calculated from your total XP using the formula:

```
XP needed to reach Level N = ceil(100 × N^1.5)
```

| Level | XP Required |
|---|---|
| 1 | 0 |
| 2 | 283 |
| 3 | 520 |
| 5 | 1,119 |
| 10 | 3,163 |
| 20 | 8,944 |
| 50 | 35,356 |

Your current level and XP progress are shown in the **Stats Row** on the Dashboard and in the **XP Header** at the top of every page.

### Day Streaks

A streak increments each time you perform any learning activity on a new calendar day (activity = earning any XP).

- If you miss a day, your streak resets to 1
- Your **longest streak** is always preserved even if the current one resets
- Streak milestones at 7 days and 30 days award bonus XP

### Achievements

Achievements are one-time awards for reaching specific milestones.

| Achievement | Icon | Unlock Condition |
|---|---|---|
| **First Frame** | play_circle | Watch your first video |
| **Note Taker** | edit_note | Create 10 notes |
| **Tomato Fan** | timer | Complete 5 Pomodoro sessions |
| **One Week Streak** | local_fire_department | Study 7 days in a row |
| **Monthly Warrior** | bolt | Study 30 days in a row |
| **Graduate** | school | Complete your first course (all lessons done) |
| **Night Owl** | nightlight | Study between midnight and 5 AM |
| **Bookworm** | menu_book | Upload 50+ documents |
| **Speed Runner** | speed | Complete an entire course in a single day |
| **1K XP Club** | stars | Earn 1,000 total XP |
| **10K Elite** | military_tech | Earn 10,000 total XP |

When you unlock an achievement, a **toast notification** appears in the bottom-right corner of the screen.

---

## 8. AI Course Creator

Navigate to **AI Creator** in the sidebar.

The AI Creator generates a full course structure (title, description, modules, and topic tags) from a single text prompt, then lets you import that structure directly into Percy.

### Step 1 — Configure an AI Provider

Before using the AI Creator, you must set up at least one AI provider in **Settings** (see [Section 10](#10-settings--ai-providers)).

If no providers are enabled, the AI Creator shows a prompt to configure one.

### Step 2 — Generate a Course Outline

1. **Select a Provider** — choose from your enabled AI providers
2. **Set Module Count** — how many modules to generate (1–20, default 5)
3. **Write a Prompt** — describe the course topic in as much or as little detail as you want

Example prompts:
- `"Beginner Python programming — variables, functions, loops, and file I/O"`
- `"Japanese for English speakers, A1-B1 level, covering grammar, vocabulary, JLPT N5"`
- `"DevOps fundamentals: Docker, Kubernetes, CI/CD with GitHub Actions, and monitoring"`

4. Click **Generate Course Outline**

The AI generates a structured response with:
- Course title and description
- Module titles, descriptions, and topic tags for each module

### Step 3 — Review the Outline

The generated outline appears below the form. Each module card shows:
- Module number and title
- Module description
- Topic tags (cyan badges)

If the result isn't what you wanted, edit your prompt and generate again.

### Step 4 — Import to Percy

Click **Import to Percy** to create the course and all its modules automatically.

Percy will:
1. Create the course with category `AI Generated` and a purple colour
2. Create each module with its title and description (topics included in the description)

The course appears immediately in your Courses browser. Add videos and documents to the modules from there.

---

## 9. Search

Navigate to **Search** in the sidebar.

### What Gets Searched

| Content Type | Fields Searched |
|---|---|
| **Courses** | Title, description, category |
| **Content items** | Title (videos, documents, links) |
| **Notes** | Title and full body text |

### Using Search

1. Type a keyword or phrase in the search box
2. Click **Search** or press Enter
3. Results appear grouped by type: Courses → Content → Notes

Each result is clickable:
- **Course results** → navigate to the Courses page
- **Content results** → navigate directly to the player for that item
- **Note results** → navigate to the Notes page

The result count is shown at the top: `N result(s) for "keyword"`.

### Tips

- Search is case-insensitive
- Partial matches work (searching `pyt` finds `Python`)
- Results are limited to 20 per type for performance
- For notes, a 200-character preview of the body is shown

---

## 10. Settings — AI Providers

Navigate to **Settings** in the sidebar.

Percy supports 5 AI provider integrations. API keys are encrypted at rest with Fernet encryption and never exposed in responses.

### Supported Providers

| Provider | Default Model | API Key Required | Notes |
|---|---|---|---|
| **OpenAI** | `gpt-4o-mini` | Yes | Best all-around |
| **Anthropic (Claude)** | `claude-haiku-4-5-20251001` | Yes | Fast and cheap |
| **Google Gemini** | `gemini-1.5-flash` | Yes | Large context window |
| **Ollama** | `llama3.2` | No | 100% local, free |
| **HuggingFace** | `Mistral-7B-Instruct-v0.3` | Yes | Open-source models |

### Configuring a Provider

For each provider card:

1. **Check the Enable toggle** — required for the provider to appear in the AI Creator
2. **Enter your API Key** (if required) — paste your key into the password field
   - If a key is already saved, the badge shows **Key configured** and the field shows dots. Leave it blank to keep the existing key; enter a new value to replace it.
3. **Set the Model** — change the model name if you want to use a different version
4. **Set Base URL** (Ollama only) — default is `http://localhost:11434`. Change this if Ollama runs on a different host/port.
5. Click **Save**

A green toast confirms the save.

### Ollama (Local LLM)

Ollama lets you run AI models entirely on your own machine with no API costs.

Setup:
1. Install Ollama from [ollama.com](https://ollama.com)
2. Run: `ollama pull llama3.2` (or any model you prefer)
3. Ollama starts automatically on `http://localhost:11434`
4. In Percy Settings, enable Ollama and set the model name to match the model you pulled
5. No API key is needed

---

## 11. Export & NotebookLM

### Export All Notes (Markdown)

1. Go to **Notes**
2. Click the **download icon** (top of the note list)
3. A file `percy_notes.md` downloads immediately

The export includes all notes in order (most recently updated first), with:
- Note title as a `##` heading
- Creation date
- Video timestamp (if set)
- Full note body

### Export a Single Note

From any note's view:
- The single-note export is available via the API at `GET /api/notes/export/{note_id}`
- It returns a `.md` file named after the note title

### Export Course Notes

To export all notes linked to a specific course, use the API:

```
POST /api/export/course/{course_id}?fmt=markdown
```

### NotebookLM Integration

**Google NotebookLM** is a free AI research assistant that can answer questions about your uploaded sources. Percy's exported Markdown files are formatted for seamless import.

Workflow:
1. Export your notes from Percy (`percy_notes.md`)
2. Go to [notebooklm.google.com](https://notebooklm.google.com)
3. Create a new notebook
4. Click **Add source** → **Upload** → choose `percy_notes.md`
5. NotebookLM reads your notes and lets you ask questions like:
   - "Summarize the key points from my Python notes"
   - "What did I learn about Docker last week?"
   - "Create a quiz based on my JavaScript notes"

This turns your Percy notes into an interactive knowledge base.

### PDF Export

PDF export is also available if **WeasyPrint** is installed (it is included in `requirements.txt`).

Use the `format: "pdf"` option in the bulk export API call, or `?fmt=pdf` for course notes. The PDF includes the same structure as the Markdown export with proper formatting.

---

## 15. Appendix

### Default Credentials

| | Value |
|---|---|
| Username | `admin` |
| Password | `changeme` |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/api/docs |
| Frontend | http://localhost:5173 |

### Environment Variables (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `SECRET_KEY` | auto-generated | JWT signing key |
| `ENCRYPTION_KEY` | auto-generated | Fernet key for API key encryption |
| `DATABASE_URL` | `sqlite:///./percy.db` | Database path |
| `STORAGE_PATH` | `./storage` | File storage root |
| `DEFAULT_ADMIN_PASSWORD` | `changeme` | Password for first-run admin |
| `ACCESS_TOKEN_EXPIRE_SECONDS` | `900` | JWT access token lifetime (15 min) |
| `REFRESH_TOKEN_EXPIRE_SECONDS` | `604800` | Refresh token lifetime (7 days) |
| `WHISPER_MODEL` | `base` | Whisper model size (`tiny`, `base`, `small`, `medium`, `large`) |
| `MAX_VIDEO_SIZE_MB` | `10240` | Max video upload size (10 GB) |
| `MAX_DOCUMENT_SIZE_MB` | `500` | Max document upload size |
| `AUTH_RATE_LIMIT` | `10/minute` | Login endpoint rate limit |
| `AI_RATE_LIMIT` | `20/minute` | AI generation rate limit |
| `CORS_ORIGINS` | localhost origins | Comma-separated allowed origins |

### Whisper Model Sizes

| Model | Size | VRAM | Speed | Quality |
|---|---|---|---|---|
| `tiny` | 39 MB | ~1 GB | Fastest | Basic |
| `base` | 74 MB | ~1 GB | Fast | Good |
| `small` | 244 MB | ~2 GB | Moderate | Better |
| `medium` | 769 MB | ~5 GB | Slow | Great |
| `large` | 1.5 GB | ~10 GB | Slowest | Best |

The default `base` model is recommended for most use cases. Change `WHISPER_MODEL` in `.env` to switch.

### Database Migrations (Alembic)

Percy uses Alembic for schema migrations. The initial schema migration is pre-generated.

```bash
cd backend

# Generate a new migration after model changes
SECRET_KEY=xxx ENCRYPTION_KEY=xxx alembic revision --autogenerate -m "description"

# Apply all pending migrations
SECRET_KEY=xxx ENCRYPTION_KEY=xxx alembic upgrade head

# Downgrade one step
SECRET_KEY=xxx ENCRYPTION_KEY=xxx alembic downgrade -1
```

> Note: Alembic is pre-configured to use `render_as_batch=True` which is required for SQLite column alterations.

---

## 12. Spaced Repetition Review

Navigate to **Review** in the sidebar. The badge next to the label shows how many cards are due today.

### How It Works

Percy uses the **SM-2** algorithm (the same one powering Anki). Each note can optionally have a review card. When a card is due, you read the note, then rate how well you recalled it:

| Rating | Meaning |
|---|---|
| 0–2 | Forgot — card resets to 1-day interval |
| 3 | Remembered with difficulty — interval grows slowly |
| 4 | Recalled correctly — normal increase |
| 5 | Perfect recall — larger interval jump |

### Creating Review Cards

1. Open a note in the **Notes** page
2. Click **Add to Review** — the note becomes a flashcard due today

### Working Through a Session

1. Navigate to **Review** (`/review`)
2. Read the note body
3. Select a quality rating (0–5)
4. Percy schedules the next review date automatically
5. Completing a review earns **3 XP**

The badge in the sidebar updates every 60 seconds. Once all cards for the day are reviewed, the badge disappears.

---

## 13. Knowledge Graph

Navigate to **Graph** (`/graph`) in the sidebar.

The graph visualises the relationships between your courses, modules, and notes in a radial SVG layout:

- **Cyan nodes (inner ring):** Courses
- **Purple nodes (middle ring):** Modules, positioned near their parent course
- **Green nodes (outer ring):** Notes, linked to their course

### Controls

| Action | How |
|---|---|
| Zoom | Scroll wheel |
| Pan | Click and drag on the background |
| Reset view | Click the **Reset** button |
| Inspect a node | Hover — the label and type appear in the info bar below the graph |

The graph updates automatically as you add courses, modules, and notes. If the graph is empty, create some courses and notes first.

---

## 14. Player AI Tools

While watching a video or reading a document, open the **AI Tools** tab in the player sidebar (requires an AI provider in Settings).

### Summarise

Analyse the current content and generate one of:

- **Summary** — 3–5 paragraph prose overview
- **Key Points** — bullet-point list of the main ideas
- **Flashcards** — interactive flip-cards; click a card to reveal the answer

The text used comes from subtitle files (for videos) or the document file (for plain-text formats). Add notes to supplement if the file has no readable text.

### Quiz

Generates multiple-choice questions directly from the content.

1. Set the number of questions (3–15)
2. Click **Generate Quiz**
3. Click an option to answer — correct answers turn green, wrong ones turn red
4. The explanation appears after each answer

### Teach-Back

Forces active recall by making you *explain* the material.

1. Click **Get Questions** — 5 open-ended questions are generated
2. Read question 1, type your answer in the text box
3. Click **Submit Answer** — the AI grades it 1–5 ★ and provides feedback + a model answer
4. Click **Next Question** to continue

### Voice Note

Records a spoken note using the browser's Speech Recognition API (Chrome/Edge only).

1. Click **Voice Note** in the subtitle controls row
2. Speak your note
3. When you stop speaking, the transcript is saved as a timestamped note in the Notes tab

### Auto-Generate Subtitles (Whisper)

Click **Auto-generate** in the subtitle controls row. Percy runs Whisper in the background and polls every 5 seconds. The status message updates from *Processing* to *Done* and the subtitle track loads automatically — no manual refresh needed.

---

## 15. Appendix

### Course Progress Bars

Each course card on the Courses page displays a coloured progress bar showing what percentage of the content items in that course have been marked as completed. Progress is calculated automatically from your watch history.

### YouTube / External Links

Use the **YouTube** tab in the Upload Modal to add a YouTube URL as a content item. The video opens in your browser when you click it (no in-app embedding). The same goes for generic external links added via the **Link** tab.

### API Docs (Developer)

```
http://localhost:8000/api/docs
```

You can log in via the `/api/auth/login` endpoint and then use the **Authorize** button to set your Bearer token for testing all endpoints directly in the browser.

### Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI 0.115, Python 3.11 |
| Database | SQLite + SQLAlchemy 2.0 (async) |
| Migrations | Alembic 1.18 |
| Auth | JWT (python-jose) + bcrypt |
| AI | OpenAI / Anthropic / Gemini / Ollama / HuggingFace SDKs |
| Transcription | OpenAI Whisper |
| PDF Export | WeasyPrint |
| Rate Limiting | SlowAPI |
| Frontend | React 18 + TypeScript + Vite |
| State | Zustand 5 |
| HTTP Client | Axios 1.7 |
| Drag & Drop | @dnd-kit |
| Markdown | react-markdown + remark-gfm |
| Styling | Custom CSS (cyberpunk dark theme) |

---

*Percy LMS — Your personal learning OS.*
