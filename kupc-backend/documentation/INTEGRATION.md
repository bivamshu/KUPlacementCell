# analytiCV — Integration Documentation

Resume analysis, editing, and building platform. Use this doc to understand what exists and how to plug the analyzer (or other pieces) into another jobs project.

---

## 1. What this project is

**analytiCV** is two apps that talk over HTTP:

| App | Path | Stack | Default port |
|-----|------|-------|--------------|
| Frontend | `frontend/` | Next.js 16, React 19, Tailwind 4, NextAuth, Supabase JS | `3000` |
| Backend | `backend/` | FastAPI, spaCy, ChromaDB, PyMuPDF, WeasyPrint | `8000` |

Not a monorepo — no shared packages. Reuse by **calling the FastAPI API** or **copying Python modules**.

```
Browser
  ├─► Next.js (:3000)  ──proxies──► FastAPI (:8000)
  │         │                          │
  │         ├─ Supabase (users/resumes)│
  │         └─ Gemini (chat only)      ├─ spaCy + ChromaDB (analyzer)
  │                                    ├─ PyMuPDF (PDF extract)
  │                                    └─ Jinja2 + WeasyPrint (builder)
  └─► FastAPI directly (editor via NEXT_PUBLIC_API_URL)
```

---

## 2. Features

### Frontend (user-facing)

| Feature | Route | Notes |
|---------|-------|--------|
| Landing | `/` | Marketing hero + CTAs |
| **Resume analyzer** | `/analyzer` | Upload PDF → ATS score, breakdown, strengths, suggestions |
| Save analysis | (from analyzer) | Logged-in users → Supabase `resumes` |
| Analyzer → Editor handoff | sessionStorage | Passes PDF into `/editor` |
| **Resume builder** | `/builder` | Form + template + live HTML preview + PDF download |
| Templates | Modern / Classic / Minimal | From backend `/api/templates` |
| **Inline PDF editor** | `/editor` | Overlay edit, weak-block highlights, live ATS, client PDF export |
| **Resume chat** | `/chat` | Gemini Q&A over saved resume (auth required) |
| Auth | `/auth/login`, `/auth/signup` | NextAuth credentials + bcrypt |
| Profile | `/profile` | Shows user + latest resume (auth required) |

### Backend (capabilities)

| Capability | Endpoint / module | What it does |
|------------|-------------------|--------------|
| PDF resume validation | `is_resume_pdf()` | Keyword heuristics before parse |
| Full parse + ATS + feedback | `POST /api/analyzer` | spaCy extract + score + Chroma tips |
| Coordinate text extraction | `POST /api/extract-pdf-blocks` | Blocks with x/y for editor overlays |
| Block weakness analysis | `POST /api/analyze-blocks` | Rule-based issues + unified ATS |
| Template catalog | `GET /api/templates` | Config for Modern/Classic/Minimal |
| HTML resume build | `POST /api/build-resume` | Jinja2 render |
| PDF generation | `POST /api/generate-pdf` | WeasyPrint HTML → PDF |
| Edit persistence | `POST /api/update-resume`, `GET /api/get-edits/{id}`, `DELETE /api/clear-edits` | File-backed (`resume_data.json`) — **single-tenant** |

### Next.js BFF routes (app logic + proxies)

| Method | Path | Role |
|--------|------|------|
| `GET`/`POST` | `/api/auth/[...nextauth]` | Login sessions |
| `POST` | `/api/signup` | Create user in Supabase |
| `GET` | `/api/user?email=` | Latest resume for email |
| `POST` | `/api/saveResume?email=` | Upsert analyzer result |
| `POST` | `/api/chat` | Gemini chat with resume context |
| `POST` | `/api/analyzer` | Proxy → FastAPI analyzer |
| `GET` | `/api/templates` | Proxy → templates |
| `POST` | `/api/build-resume` | Proxy → build HTML |
| `POST` | `/api/generate-pdf` | Proxy → PDF |
| `POST` | `/api/extract-pdf-blocks` | Proxy (`BACKEND_API_URL`) |
| `POST` | `/api/analyze-blocks` | Proxy (`BACKEND_API_URL`) |

---

## 3. How the “AI” works

There are **three separate systems**. Only chat uses a real LLM.

### A. Full resume analyzer (main integration target)

**Path:** `POST /api/analyzer` → `backend/resume_parser.py`

```
PDF upload
  → validate resume-like content
  → PyMuPDF extract text
  → spaCy (en_core_web_sm): NER (name/org/location) + PhraseMatcher (skills)
  → regex: email, phone, LinkedIn, GitHub, dates, sections
  → structure: summary, skills by category, experience, education
  → rule-based ATS score (0–100)
  → detect issues → ChromaDB semantic retrieval of tips
  → JSON response
```

**Not an LLM.** Parsing and scoring are deterministic NLP + heuristics. Feedback is **RAG over a hardcoded tip bank** in ChromaDB (`ChromaFeedbackDB.FEEDBACK_KNOWLEDGE`), not generated text.

**ATS scoring (max 100):**

| Category | Max | How scored |
|----------|-----|------------|
| Contact info | 20 | email/phone/linkedin/location (+5 each) |
| Skills | 25 | `min(25, skill_count * 2)` from taxonomy match |
| Experience | 30 | roles + quantifiers + action verbs |
| Education | 10 | `min(10, edu_count * 5)` |
| Formatting / keywords | 15 | summary present + skill keyword density |

**Grades:** A ≥85, B ≥70, C ≥55, else D.

**Feedback flow:**

1. Detect issues (short summary, few roles, few metrics, weak verbs, few bullets).
2. Query Chroma with those issues + experience context.
3. Return ranked suggestions + strengths + `issues_identified`.

**Skill taxonomy** (PhraseMatcher categories): `languages`, `frameworks`, `databases`, `cloud`, `data_ml`, `other` — see `ResumeParser.SKILLS` in `resume_parser.py`.

### B. Block-level editor analysis

**Path:** `POST /api/analyze-blocks` → `analyze_block_content()` in `api.py`

Pure **rules**: weak verbs, missing numbers, passive voice, short summary, generic phrases, outdated skills.  
`job_description` is accepted in the request body but **not used** in scoring today.

### C. Chat assistant

**Path:** `POST /api/chat` (Next.js only) → Google Gemini `gemini-3-flash-preview`

1. Load latest Supabase resume for `email`.
2. Inject fields into a system-style prompt.
3. Call Gemini; return markdown reply.

Requires `GEMINI_API_KEY`. Independent of the FastAPI analyzer.

---

## 4. Architecture (for integration)

### Recommended: call FastAPI only

For a jobs platform that only needs “upload resume → get score + structured data”:

```
Your app  ──POST multipart PDF──►  FastAPI /api/analyzer  ──►  JSON
```

You do **not** need Next.js, Supabase, Gemini, builder, or editor.

### Optional pieces

| Need | Integrate |
|------|-----------|
| Auth + save history | NextAuth + Supabase tables (or replace with your auth/DB) |
| Chat over analysis | `/api/chat` + Gemini + stored resume |
| Template builder | `/api/build-resume` + `/api/generate-pdf` |
| Inline edit UX | `/api/extract-pdf-blocks` + `/api/analyze-blocks` + frontend editor |

### Key Python modules to reuse as a library

| Module | Path | Role |
|--------|------|------|
| Parser + ATS + feedback | `backend/resume_parser.py` | Core analyzer (also CLI: `python resume_parser.py file.pdf --json`) |
| API surface | `backend/api.py` | HTTP wrappers |
| PDF blocks | `backend/pdf_extractor.py` | Editor extraction |
| HTML builder | `backend/resume_builder.py` | Templates |
| PDF gen | `backend/pdf_generator.py` | WeasyPrint |
| Templates | `backend/templates/{modern,classic,minimal}/` | Jinja + CSS + `config.json` |

### Frontend helpers (if keeping Next UI)

| File | Role |
|------|------|
| `frontend/services/editorApi.ts` | Browser → FastAPI (`NEXT_PUBLIC_API_URL`) |
| `frontend/services/builderApi.ts` | Build / download PDF |
| `frontend/types/resume.ts` | Builder types |
| `frontend/types/editor.ts` | Editor / block types |

---

## 5. API reference (FastAPI)

Base URL: `http://localhost:8000` (or your deploy host).

### `GET /health`

```json
{ "status": "healthy" }
```

### `POST /api/analyzer` — primary integration endpoint

**Request:** `multipart/form-data` with field `file` (PDF only).

**Success:**

```json
{
  "success": true,
  "data": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "...",
    "location": "...",
    "linkedin": "...",
    "github": "...",
    "summary": "...",
    "skills": {
      "languages": ["Python", "TypeScript"],
      "frameworks": ["React"],
      "databases": [],
      "cloud": ["AWS"],
      "data_ml": [],
      "other": ["Git"]
    },
    "experience": [
      {
        "title": "...",
        "company": "...",
        "duration": "...",
        "highlights": ["..."]
      }
    ],
    "education": [
      { "degree": "...", "institution": "..." }
    ],
    "ats_score": {
      "total_score": 72,
      "grade": "B (Good)",
      "breakdown": [
        {
          "category": "contact_info",
          "label": "Contact Info",
          "score": 15,
          "max_score": 20,
          "percentage": 75
        }
      ]
    },
    "feedback": {
      "suggestions": [
        {
          "suggestion": "Include specific metrics...",
          "category": "experience_writing",
          "priority": "high",
          "relevance_score": 0.82,
          "relevance_percentage": 82
        }
      ],
      "strengths": ["Has GitHub profile"],
      "issues_identified": ["lack of quantified achievements"],
      "total_suggestions": 10
    },
    "metadata": {
      "parsed_at": "2026-07-11T00:00:00",
      "parser_version": "1.0.0",
      "status": "success"
    }
  }
}
```

**Errors:** `400` non-PDF / not resume-like; `500` parse failure.

**curl example:**

```bash
curl -X POST http://localhost:8000/api/analyzer \
  -F "file=@/path/to/resume.pdf"
```

### `POST /api/extract-pdf-blocks`

**Request:** multipart `file` (PDF).  
**Response:** `{ success, data: { pages, blocks, sections, metadata }, message }`  
Clears global editor state on upload.

### `POST /api/analyze-blocks`

**Request JSON:**

```json
{
  "blocks": [
    {
      "id": "uuid",
      "text": "Helped with backend tasks",
      "block_type": "bullet",
      "section": "experience"
    }
  ],
  "job_description": "optional, currently unused"
}
```

**Response:** `{ success, weak_blocks, total_analyzed, issues_found, ats_score, ats_score_details }`

### `GET /api/templates`

Lists template configs (id, name, colors, features, category).

### `POST /api/build-resume`

**Body:** `ResumeDataModel` — `personal_info`, `summary`, `experience[]`, `education[]`, `skills` (dict or category list), `projects[]`, `certifications[]`, `template` id.  
**Response:** `{ html: "..." }`

### `POST /api/generate-pdf`

Same body as build-resume. **Response:** `application/pdf` bytes.

### Editor state (caution for multi-tenant apps)

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/update-resume` | Saves edits + recalculates ATS |
| `GET` | `/api/get-edits/{resume_id}` | Reads `resume_data.json` |
| `DELETE` | `/api/clear-edits` | Clears all edits |

State is **global / single-file**, not per-user. Do not rely on this as-is in a multi-user jobs product.

---

## 6. Data models

### Analyzer `Resume` (Python)

```python
@dataclass
class Resume:
    name, email, phone, location, linkedin, github  # Optional[str]
    summary: Optional[str]
    skills: Dict[str, List[str]]
    experience: List[Dict]   # title, company, duration, highlights
    education: List[Dict]    # degree, institution
    ats_score: Optional[Dict]
    feedback: Optional[Dict]
```

### Builder payload (frontend `ResumeData`)

See `frontend/types/resume.ts`: `personal_info`, `summary`, `experience`, `education`, `skills`, `projects`, `certifications`, optional `template`.

### Supabase (inferred; no migrations in repo)

**`users`:** `id`, `name`, `email`, `password` (bcrypt hash)

**`resumes`:** `email`, `name`, `phone`, `location`, `linkedin`, `github`, `summary`, `skills` (JSONB), `experience` (JSONB), `education` (JSONB), `ats_score`, `grade`, `suggestions`, `strengths`, `issues`, `parsed_at`

Only needed if you keep auth / save / chat.

---

## 7. Environment & local run

No `.env.example` in repo. Create env as needed:

| Variable | Where | Required for |
|----------|-------|----------------|
| `GEMINI_API_KEY` | frontend chat route | Chat |
| `NEXTAUTH_SECRET` | NextAuth | Auth |
| `NEXTAUTH_URL` | NextAuth (prod) | Auth callbacks |
| `NEXT_PUBLIC_SUPABASE_URL` | frontend | Auth, save, chat context |
| `SUPABASE_SERVICE_ROLE_KEY` | frontend server | Supabase writes |
| `BACKEND_API_URL` | some Next proxies | Defaults `http://localhost:8000` |
| `NEXT_PUBLIC_API_URL` | `editorApi.ts` (browser) | Defaults `http://localhost:8000` |

**Analyzer-only** needs no API keys — spaCy + Chroma run locally.

```bash
# Backend
pip install -r requirements.txt
cd backend && python api.py          # http://127.0.0.1:8000

# Frontend (full UI)
cd frontend && npm install && npm run dev   # http://localhost:3000
```

**System deps:** WeasyPrint needs Pango/Cairo (builder PDF). spaCy model `en_core_web_sm` is pinned in `requirements.txt`. Chroma persists under `./chroma_feedback_db` relative to process CWD.

**Production gotchas:**

- Several Next proxies still hardcode `http://localhost:8000` (`analyzer`, `build-resume`, `generate-pdf`, `templates`) — point them at your backend URL.
- Editor often hits FastAPI from the browser — CORS must allow your frontend origin.
- Editor edit store is not multi-tenant.

---

## 8. Integration playbook (jobs project)

### Minimal: analyzer only

1. Run or deploy `backend/` (FastAPI).
2. From your app, `POST` PDF to `/api/analyzer`.
3. Store `data` (score, skills, experience, feedback) in your own DB / job-application flow.
4. Optionally map `ats_score` + `feedback.suggestions` onto your UI.

### Match-to-job (future work in this codebase)

`job_description` on `/api/analyze-blocks` is a stub. For JD matching you would:

- extend scoring to compare resume skills/keywords vs JD, or
- add an LLM pass that takes analyzer JSON + JD.

Today’s analyzer is **resume quality / ATS readiness**, not job-fit matching.

### What to skip if you only need analysis

- Entire `frontend/` (unless you want the UI)
- Gemini chat
- Builder / WeasyPrint
- Editor + `resume_data.json`
- Supabase / NextAuth (use your existing auth)

### What to keep / copy

- `backend/resume_parser.py` + `backend/api.py` (or just the parser as a library)
- `requirements.txt` deps: `fastapi`, `spacy`, `en_core_web_sm`, `chromadb`, `PyMuPDF`, `python-multipart`, `uvicorn`

---

## 9. Feature map by product surface

```
┌─────────────────────────────────────────────────────────────┐
│ Landing                                                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
     ┌──────────────────────┼──────────────────────┐
     ▼                      ▼                      ▼
 Analyzer              Builder                 Editor
 PDF → ATS+parse       Forms → HTML/PDF        Blocks → edit
     │                      │                      │
     ├─ save (auth)         └─ templates           ├─ weak blocks
     ├─ → Editor handoff                           └─ live ATS
     └─ feeds Chat context (via Supabase)
                            │
                            ▼
                     Chat (Gemini + saved resume)
```

---

## 10. Quick file index

| Concern | Location |
|---------|----------|
| All FastAPI routes | `backend/api.py` |
| Parse / ATS / Chroma feedback | `backend/resume_parser.py` |
| PDF coordinate extract | `backend/pdf_extractor.py` |
| Template HTML | `backend/resume_builder.py`, `backend/templates/` |
| PDF from HTML | `backend/pdf_generator.py` |
| Analyzer UI | `frontend/app/(app)/analyzer/page.tsx` |
| Builder UI | `frontend/app/(app)/builder/page.tsx` |
| Editor UI | `frontend/app/(app)/editor/page.tsx` |
| Chat + Gemini | `frontend/app/api/chat/route.ts` |
| Save analysis | `frontend/app/api/saveResume/route.ts` |
| Auth | `frontend/app/api/auth/[...nextauth]/route.ts` |

---

**Bottom line for your jobs project:** treat **`POST /api/analyzer`** as the product core — structured resume JSON + ATS score + tip retrieval. Everything else (builder, editor, chat, auth) is optional product surface around that pipeline.
