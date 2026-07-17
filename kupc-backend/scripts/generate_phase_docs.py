"""
Generate KUPC progress report and Phase 5 specification PDFs.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT_DIR = Path(__file__).resolve().parents[1] / "documentation"
TODAY = date.today().strftime("%B %d, %Y")


def build_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "DocTitle",
            parent=base["Title"],
            fontSize=22,
            leading=26,
            spaceAfter=6,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#1E3A8A"),
        ),
        "subtitle": ParagraphStyle(
            "DocSubtitle",
            parent=base["Normal"],
            fontSize=11,
            leading=14,
            spaceAfter=14,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#4B5563"),
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontSize=15,
            leading=18,
            spaceBefore=14,
            spaceAfter=8,
            textColor=colors.HexColor("#1E40AF"),
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontSize=12,
            leading=15,
            spaceBefore=10,
            spaceAfter=6,
            textColor=colors.HexColor("#1D4ED8"),
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontSize=10,
            leading=14,
            spaceAfter=6,
            alignment=TA_JUSTIFY,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontSize=10,
            leading=13,
            leftIndent=14,
            spaceAfter=3,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#6B7280"),
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=base["Heading3"],
            fontSize=10.5,
            leading=13,
            spaceBefore=8,
            spaceAfter=4,
            textColor=colors.HexColor("#1E3A8A"),
            fontName="Helvetica-Bold",
        ),
        "step": ParagraphStyle(
            "Step",
            parent=base["Normal"],
            fontSize=9.5,
            leading=13,
            leftIndent=12,
            spaceAfter=3,
        ),
        "step_sub": ParagraphStyle(
            "StepSub",
            parent=base["Normal"],
            fontSize=9,
            leading=12,
            leftIndent=26,
            spaceAfter=2,
            textColor=colors.HexColor("#374151"),
        ),
        "code": ParagraphStyle(
            "CodeLine",
            parent=base["Normal"],
            fontName="Courier",
            fontSize=8.5,
            leading=11,
            leftIndent=26,
            spaceAfter=2,
            textColor=colors.HexColor("#111827"),
            backColor=colors.HexColor("#F3F4F6"),
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=base["Normal"],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#9CA3AF"),
            alignment=TA_CENTER,
        ),
    }
    return styles


def add_steps(story, styles, steps: list[str]):
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"<b>{i}.</b> {step}", styles["step"]))


def add_substeps(story, styles, items: list[str]):
    for item in items:
        story.append(Paragraph(f"– {item}", styles["step_sub"]))


def make_table(data, col_widths=None, header=True):
    table = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    style_cmds = [
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E5E7EB")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        style_cmds += [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EFF6FF")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ]
    table.setStyle(TableStyle(style_cmds))
    return table


def add_footer(canvas, doc, title: str):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#9CA3AF"))
    canvas.drawString(2 * cm, 1.2 * cm, f"KUPC — {title}")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


def build_progress_report(styles) -> list:
    story = []
    story.append(Paragraph("KUPC Project Progress Report", styles["title"]))
    story.append(
        Paragraph(
            "Kathmandu University Placement Connect — Backend &amp; Frontend Status",
            styles["subtitle"],
        )
    )
    story.append(Paragraph(f"Report date: {TODAY}", styles["meta"]))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#BFDBFE")))
    story.append(Spacer(1, 10))

    story.append(
        Paragraph(
            "This report compares completed work against the KUPC Backend Specification v2.0 "
            "roadmap, internal phase documentation, and the current state of the frontend prototype. "
            "The frontend was reviewed at <font name='Courier'>c:/projects/KU-Placement-Cell/frontend</font>.",
            styles["body"],
        )
    )

    story.append(Paragraph("Executive Summary", styles["h1"]))
    story.append(
        Paragraph(
            "The backend has completed Phases 1–4: project setup, authentication, database implementation, "
            "and the full resume upload + AI analysis pipeline (62 automated tests passing for Phase 4). "
            "The frontend is a high-fidelity Figma Make prototype with rich mock UI across student, company, "
            "and admin flows, but it has <b>zero backend integration</b> — no API client, no auth screens, "
            "and all data is hardcoded in <font name='Courier'>App.tsx</font>.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "Per Backend Specification v2.0, the next listed feature phase is <b>Job Posting &amp; Discovery</b>. "
            "However, Student &amp; Company Profile APIs (v2 Phase 3) were deferred during implementation and "
            "remain unbuilt. Profiles and frontend integration are prerequisites before job posting can deliver "
            "end-to-end value.",
            styles["body"],
        )
    )

    story.append(Paragraph("Backend — Completed Work", styles["h1"]))
    backend_done = [
        ["Phase", "Scope", "Status", "Evidence"],
        [
            "1",
            "Project setup & architecture",
            "Complete",
            "Express + TS scaffold, env validation (Zod), logging, CORS, helmet, rate limiting",
        ],
        [
            "2",
            "Authentication & authorization",
            "Complete",
            "Student/company/admin auth, JWT + refresh rotation, RBAC, OTP, 50+ auth tests",
        ],
        [
            "3A",
            "Database design",
            "Complete",
            "Schema design doc, ERD, conventions, RLS strategy",
        ],
        [
            "3B",
            "Database implementation",
            "Complete",
            "Supabase tables, indexes, RLS, seed data (200 jobs), repository layer, tests",
        ],
        [
            "4",
            "Resume upload & AI analysis",
            "Complete",
            "Storage upload, BullMQ worker, PDF extract, OpenAI scoring, read APIs, Swagger, 62 tests",
        ],
    ]
    story.append(make_table(backend_done, col_widths=[1.2 * cm, 4.2 * cm, 2 * cm, 9.6 * cm]))

    story.append(Paragraph("Backend — APIs Currently Live", styles["h2"]))
    apis = [
        ["Module", "Endpoints", "Notes"],
        [
            "Auth",
            "POST register/student, register/company, verify-otp, login, admin/login, refresh, logout; GET /me",
            "Production-ready identity layer",
        ],
        [
            "Resumes",
            "POST /resumes (upload), GET list, GET by id, GET analysis, DELETE",
            "Async analysis via worker process",
        ],
        [
            "Jobs",
            "POST /jobs (placeholder only)",
            "Returns stub response; repository exists but no service layer",
        ],
        [
            "Dashboard stubs",
            "GET student/admin/company dashboard",
            "RBAC smoke routes only",
        ],
    ]
    story.append(make_table(apis, col_widths=[2.5 * cm, 5.5 * cm, 9 * cm]))

    story.append(Paragraph("Backend — Remaining Work (per v2 spec)", styles["h1"]))
    backend_remaining = [
        ["v2 Phase", "Feature", "Current State"],
        ["3", "Student & Company Profiles", "DB + repositories only; no profile CRUD APIs or storage uploads"],
        ["5", "Job Posting & Discovery", "Placeholder route; jobs.repository ready; no search/filter/saved-jobs APIs"],
        ["6", "Swipe Engine", "swipes.repository exists; no API or business logic"],
        ["7", "Matching Engine", "matches + conversations repos exist; not wired"],
        ["8", "Real-Time Chat", "messages repo exists; no WebSocket/SSE layer"],
        ["9", "Notifications", "notifications repo exists; no delivery service"],
        ["10", "Search & Recommendations", "Not started (pgvector, embeddings)"],
        ["11", "Company Verification Workflow", "Admin UI in frontend mock only; partial DB support"],
        ["12–18", "Dashboards, analytics, admin, security, docs, CI/CD", "Mostly not implemented"],
    ]
    story.append(make_table(backend_remaining, col_widths=[2 * cm, 5 * cm, 10 * cm]))

    story.append(PageBreak())
    story.append(Paragraph("Frontend — Completed Work", styles["h1"]))
    frontend_done = [
        ["Area", "Status", "Details"],
        ["Tech stack", "Complete", "React 18, Vite 6, Tailwind v4, motion, recharts, MUI icons"],
        ["Landing page", "Complete", "Role entry (student / company / admin) with branded hero"],
        ["Student UI", "Mock complete", "Dashboard, discover (swipe), matches, chat, resume analyzer, profile, settings, notifications"],
        ["Company UI", "Mock complete", "Dashboard, job posting form, applicant kanban, discover students, analytics placeholder"],
        ["Admin UI", "Mock complete", "Overview, company approval queue, user management, analytics charts"],
        ["Design system", "Partial", "47 shadcn/ui components in components/ui/ — largely unused; custom inline components used instead"],
        ["Product spec", "Complete", "kupc-figma-prompt.md defines full screen inventory and brand guidelines"],
    ]
    story.append(make_table(frontend_done, col_widths=[3 * cm, 2.5 * cm, 11.5 * cm]))

    story.append(Paragraph("Frontend — Remaining Work", styles["h1"]))
    for item in [
        "<b>Backend integration (0%)</b> — No fetch/axios calls, no .env, no API base URL configuration.",
        "<b>Authentication UI</b> — No login, register, OTP verification, or session/token management screens.",
        "<b>Routing</b> — Single monolithic App.tsx (~2,100 lines) with useState screen switching; no react-router.",
        "<b>Resume analyzer</b> — Simulated with setTimeout; not connected to POST /api/v1/resumes or analysis polling.",
        "<b>Job posting</b> — Form UI exists but has no submit handler or API integration.",
        "<b>Company profile editor</b> — Placeholder screen only ('Update your banner, about...').",
        "<b>Discover / swipe / chat / matches</b> — Fully mocked with hardcoded COMPANIES, STUDENTS, MESSAGES arrays.",
        "<b>Apply-to-job flow</b> — Not implemented.",
        "<b>State persistence</b> — No localStorage/session handling; refresh loses all state.",
        "<b>Error/loading states</b> — Not wired for real network calls.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    story.append(Paragraph("Alignment Gap Analysis", styles["h1"]))
    story.append(
        Paragraph(
            "Internal documentation renumbered phases for pragmatic delivery: database work became Phase 3, "
            "resumes became Phase 4. Phase 4 documentation explicitly states the next backend milestone is "
            "<b>Student &amp; Company Profiles</b>, while Backend Specification v2.0 lists that as Phase 3 "
            "(not built as APIs) and positions <b>Job Posting &amp; Discovery</b> as Phase 5.",
            styles["body"],
        )
    )
    gap = [
        ["Capability", "Backend", "Frontend", "Gap"],
        ["Auth", "Complete", "Missing UI", "Users cannot log in from the app"],
        ["Student profile", "DB only", "Mock static data", "No read/update flow"],
        ["Company profile", "DB only", "Placeholder screen", "No CRUD or logo upload"],
        ["Resume AI", "Complete pipeline", "Fake 2s timeout", "Highest-value quick win once wired"],
        ["Jobs", "Placeholder API", "Form UI, no handler", "Neither side is production-ready"],
        ["Swipe/Match/Chat", "DB repos only", "Rich mock UI", "Large integration effort ahead"],
    ]
    story.append(make_table(gap, col_widths=[3.2 * cm, 2.8 * cm, 3.2 * cm, 7.8 * cm]))

    story.append(Paragraph("Test & Quality Snapshot", styles["h1"]))
    quality = [
        ["Suite", "Command", "Status"],
        ["Phase 2 auth", "npm run test (auth suites)", "Passing"],
        ["Phase 3 DB/repos", "npm run test:phase3", "Passing"],
        ["Phase 4 resumes", "npm run test:phase4", "62 tests, 11 suites — all pass"],
        ["Typecheck", "npm run typecheck", "Passing"],
        ["Frontend tests", "—", "None configured"],
        ["E2E tests", "—", "Not started"],
    ]
    story.append(make_table(quality, col_widths=[3.5 * cm, 5 * cm, 8.5 * cm]))

    story.append(Paragraph("Recommended Next Phase", styles["h1"]))
    story.append(
        Paragraph(
            "<b>Phase 5 — Student &amp; Company Profiles + Frontend Integration Foundation</b> "
            "(see companion specification PDF). Job Posting &amp; Discovery should follow as Phase 6, "
            "matching Backend Specification v2.0 ordering once profiles, auth UI, and the API client exist.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "Rationale: the resume pipeline (Phase 4) and auth layer (Phase 2) are production-ready on the backend "
            "but unreachable from the frontend. Company job posting requires verified company context and profile data. "
            "Building job APIs before profiles would produce endpoints the UI still cannot consume meaningfully.",
            styles["body"],
        )
    )

    return story


def build_phase5_spec(styles) -> list:
    story = []
    story.append(Paragraph("KUPC Phase 5 Specification", styles["title"]))
    story.append(
        Paragraph(
            "Student &amp; Company Profiles + Frontend Integration Foundation",
            styles["subtitle"],
        )
    )
    story.append(
        Paragraph(
            f"Version 1.1 · {TODAY} · Status: Draft for sprint planning · Detailed milestone steps",
            styles["meta"],
        )
    )
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#BFDBFE")))
    story.append(Spacer(1, 10))

    # ── Document control ──────────────────────────────────────────────────────
    story.append(Paragraph("Document Control", styles["h1"]))
    doc_ctrl = [
        ["Field", "Value"],
        ["Project", "KUPC — Kathmandu University Placement Connect"],
        ["Phase", "5 (recommended — supersedes deferred v2 Phase 3 profile work)"],
        ["Depends on", "Phase 2 (Auth), Phase 3B (DB/repos), Phase 4 (Resumes)"],
        ["Feeds into", "Phase 6 — Job Posting &amp; Discovery (v2 spec Phase 5)"],
        ["Repos", "kupc-backend + frontend (monorepo)"],
        ["Audience", "Backend engineers, frontend engineers, technical reviewers"],
    ]
    story.append(make_table(doc_ctrl, col_widths=[4 * cm, 13 * cm]))

    # ── Goals ─────────────────────────────────────────────────────────────────
    story.append(Paragraph("1. Phase Goal", styles["h1"]))
    story.append(
        Paragraph(
            "Make the product <b>usable end-to-end</b> for authenticated students and companies by delivering "
            "profile APIs on the backend and wiring the existing frontend prototype to real backend services — "
            "starting with auth, profiles, and resume analysis.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "At the end of Phase 5, a student can register, verify OTP, log in, view/edit their profile, "
            "upload a resume, and see real AI analysis results. A company can log in, view/edit its profile "
            "(pending verification), and see verification status. The frontend no longer relies on hardcoded mock data "
            "for these flows.",
            styles["body"],
        )
    )

    story.append(Paragraph("2. Why This Phase (Not Job Posting Yet)", styles["h1"]))
    for item in [
        "Backend Specification v2.0 lists Job Posting as Phase 5, but v2 Phase 3 (Profiles) was never implemented as APIs.",
        "Phase 4 internal docs explicitly target Profiles as the next backend milestone.",
        "Frontend has 0% API integration — job endpoints would have no consumer.",
        "Job posting requires company identity, profile metadata, and requireVerifiedCompany middleware context.",
        "Resume analysis (completed backend) is the highest-value feature to wire first.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # ── Milestone overview ────────────────────────────────────────────────────
    story.append(Paragraph("3. Milestone Overview", styles["h1"]))
    overview = [
        ["ID", "Side", "Title", "Exit criterion"],
        ["B1", "Backend", "Students profile module", "GET/PATCH /students/me + public GET pass tests"],
        ["B2", "Backend", "Companies profile module", "GET/PATCH /companies/me + public GET pass tests"],
        ["B3", "Backend", "Avatar &amp; logo storage", "Uploads land in Supabase; URLs persisted"],
        ["B4", "Backend", "Swagger, errors, hardening", "OpenAPI paths live; error codes stable"],
        ["B5", "Backend", "Phase 5 test matrix", "npm run test:phase5 green; phase4 still green"],
        ["F1", "Frontend", "API client &amp; env", "Authenticated requests reach /api/v1"],
        ["F2", "Frontend", "Token &amp; session layer", "Refresh on 401; session survives reload"],
        ["F3", "Frontend", "Auth screens", "Register → OTP → login for all three roles"],
        ["F4", "Frontend", "Guards &amp; role routing", "Wrong role cannot open protected screens"],
        ["F5", "Frontend", "Student profile wiring", "Live GET/PATCH replaces STUDENTS[0]"],
        ["F6", "Frontend", "Company profile wiring", "Placeholder replaced; live CRUD"],
        ["F7", "Frontend", "Resume analyzer wiring", "Real upload + poll + score UI"],
        ["F8", "Frontend", "UX polish &amp; cleanup", "Loading/error/empty; mock data scoped"],
    ]
    story.append(make_table(overview, col_widths=[1.2 * cm, 2 * cm, 4.5 * cm, 9.3 * cm]))

    story.append(Paragraph("3.1 Out of Scope", styles["h2"]))
    for item in [
        "Job CRUD, search/filter, saved jobs (Phase 6)",
        "Swipe engine, matching, chat, notifications",
        "Admin company-approval API workflow (v2 Phase 11)",
        "pgvector recommendations",
        "Full App.tsx → react-router rewrite (optional stretch only)",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    story.append(Paragraph("3.2 Suggested Order", styles["h2"]))
    story.append(
        Paragraph(
            "B1 → B2 → B3 → B4 → B5 in parallel with F1 → F2 → F3 → F4. "
            "Then F5 and F6 (need B1–B3). Then F7 (needs Phase 4 resumes + F2). Finish with F8.",
            styles["body"],
        )
    )

    # ── API contract ──────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("4. API Contract (Backend)", styles["h1"]))
    api_contract = [
        ["Method", "Path", "Auth", "Description"],
        ["GET", "/api/v1/students/me", "Student", "Own profile + linked resume summary"],
        ["PATCH", "/api/v1/students/me", "Student", "bio, phone, degree, cgpa, department, graduation_year"],
        ["POST", "/api/v1/students/me/avatar", "Student", "Multipart image; returns profile_picture_url"],
        ["GET", "/api/v1/students/:id", "Authenticated", "Public student card (no phone / KU id)"],
        ["GET", "/api/v1/companies/me", "Company", "Own profile incl. verification_status"],
        ["PATCH", "/api/v1/companies/me", "Company", "company_name, website, industry, description"],
        ["POST", "/api/v1/companies/me/logo", "Company", "Multipart logo; returns logo_url"],
        ["GET", "/api/v1/companies/:id", "Authenticated", "Approved companies only"],
    ]
    story.append(make_table(api_contract, col_widths=[1.8 * cm, 5.2 * cm, 2.8 * cm, 7.2 * cm]))

    story.append(Paragraph("Reuse existing auth (already live):", styles["body"]))
    for item in [
        "POST /api/v1/auth/register/student, /register/company, /verify-otp",
        "POST /api/v1/auth/login, /admin/login, /refresh, /logout",
        "GET /api/v1/auth/me",
        "Resume APIs (Phase 4): POST/GET/DELETE /api/v1/resumes, GET /:id/analysis",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # =========================================================================
    # BACKEND MILESTONES
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("5. Backend Milestones — Detailed Steps", styles["h1"]))
    story.append(
        Paragraph(
            "Follow the Phase 4 resumes module layout: "
            "<font name='Courier'>src/modules/&lt;name&gt;/</font> with types, validation, service, "
            "controller, routes, mapper, errors, constants, index. Mount under "
            "<font name='Courier'>src/routes/index.ts</font> at <font name='Courier'>/api/v1</font>. "
            "Repositories already exist in <font name='Courier'>src/database/</font>.",
            styles["body"],
        )
    )

    # ── B1 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Milestone B1 — Students Profile Module", styles["h2"]))
    story.append(
        Paragraph(
            "<b>Goal:</b> Expose authenticated student profile read/update and a public card endpoint. "
            "<b>Depends on:</b> Phase 2 auth middleware, <font name='Courier'>studentsRepository</font>.",
            styles["body"],
        )
    )
    story.append(Paragraph("Backend steps", styles["h3"]))
    add_steps(
        story,
        styles,
        [
            "Create folder <font name='Courier'>src/modules/students/</font> mirroring resumes module structure.",
            "Add <font name='Courier'>students.types.ts</font>: StudentProfileDto, StudentPublicCardDto, "
            "UpdateStudentProfileInput (camelCase API shape).",
            "Add <font name='Courier'>students.validation.ts</font> with Zod: "
            "PATCH body (optional string/number fields, cgpa 0–4, graduation_year integer), "
            "params schema for <font name='Courier'>:id</font> (UUID).",
            "Add <font name='Courier'>students.errors.ts</font>: STUDENT_NOT_FOUND, STUDENT_PROFILE_FORBIDDEN, "
            "INVALID_PROFILE_PAYLOAD — map to AppError with stable codes.",
            "Add <font name='Courier'>students.mapper.ts</font>: map StudentRecord → StudentProfileDto; "
            "public mapper that <b>omits</b> phone and ku_id.",
            "Add <font name='Courier'>students.service.ts</font>:",
        ],
    )
    add_substeps(
        story,
        styles,
        [
            "getMe(userId): studentsRepository.findById; throw STUDENT_NOT_FOUND if null; "
            "optionally join active resume summary via resumesRepository if resume_id set.",
            "updateMe(userId, input): call studentsRepository.updateProfile; return mapped DTO.",
            "getPublicById(id): findById; return public mapper (for company discover later).",
        ],
    )
    add_steps(
        story,
        styles,
        [
            "Add <font name='Courier'>students.controller.ts</font>: thin handlers reading "
            "<font name='Courier'>req.user.id</font>, calling service, wrapping with successResponse.",
            "Add <font name='Courier'>students.routes.ts</font>:",
        ],
    )
    add_substeps(
        story,
        styles,
        [
            "Router-level: authenticate on all routes.",
            "GET /me + PATCH /me: authorize(Role.STUDENT).",
            "GET /:id: authorize any authenticated role (STUDENT | COMPANY | ADMIN).",
            "Register PATCH before /:id so 'me' is never captured as an id.",
        ],
    )
    add_steps(
        story,
        styles,
        [
            "Export from <font name='Courier'>students/index.ts</font> and mount: "
            "<font name='Courier'>router.use('/students', studentsRouter)</font> in "
            "<font name='Courier'>src/routes/index.ts</font>.",
            "Manual smoke: login as student → GET /students/me → PATCH bio → GET again.",
        ],
    )
    story.append(Paragraph("Exit criteria B1", styles["h3"]))
    for item in [
        "GET /students/me returns 200 with profile for student JWT; 401 without token; 403 for company JWT.",
        "PATCH updates only allowed fields; invalid cgpa returns 400 with stable error code.",
        "GET /students/:id returns public card without phone/ku_id.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # ── B2 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Milestone B2 — Companies Profile Module", styles["h2"]))
    story.append(
        Paragraph(
            "<b>Goal:</b> Company self-service profile + public approved-company card. "
            "<b>Depends on:</b> B1 patterns, <font name='Courier'>companiesRepository</font>.",
            styles["body"],
        )
    )
    story.append(Paragraph("Backend steps", styles["h3"]))
    add_steps(
        story,
        styles,
        [
            "Create <font name='Courier'>src/modules/companies/</font> (types, validation, errors, mapper, "
            "service, controller, routes, index) — copy structure from students.",
            "DTO must include verification_status and verified_at on /me (companies need to see pending state).",
            "Validation: PATCH allows companyName (min 2), website URL optional, industry, description (max length).",
            "Service getMe(userId): companiesRepository.findByUserId.",
            "Service getPublicById(id): findById; if verification_status !== 'approved', throw NOT_FOUND "
            "(do not leak pending companies to students).",
            "Service updateMe: companiesRepository.updateProfile — never allow client to set verification_status.",
            "Routes: authenticate all; GET/PATCH /me authorize(Role.COMPANY); GET /:id any authenticated role.",
            "Mount at <font name='Courier'>/companies</font> in routes/index.ts.",
            "Smoke: company login → GET /companies/me shows pending → PATCH description → confirm.",
        ],
    )
    story.append(Paragraph("Exit criteria B2", styles["h3"]))
    for item in [
        "Company can read/update own profile; cannot change verification_status via PATCH.",
        "Public GET returns 404 for pending/rejected companies.",
        "Student JWT cannot PATCH /companies/me (403).",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # ── B3 ────────────────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Milestone B3 — Avatar &amp; Logo Storage Uploads", styles["h2"]))
    story.append(
        Paragraph(
            "<b>Goal:</b> Multipart image upload for student avatar and company logo, stored in Supabase Storage, "
            "URL written to profile rows. <b>Pattern:</b> Phase 4 <font name='Courier'>resumeStorage.ts</font> "
            "+ multer middleware.",
            styles["body"],
        )
    )
    story.append(Paragraph("Backend steps", styles["h3"]))
    add_steps(
        story,
        styles,
        [
            "In Supabase dashboard (or SQL migration notes), create storage buckets "
            "<font name='Courier'>avatars</font> and <font name='Courier'>company-logos</font> "
            "with public read; uploads only via service role from the API.",
            "Add env keys if needed (bucket names) to <font name='Courier'>src/config/env.ts</font> Zod schema "
            "with defaults matching Phase 4 RESUME_* style.",
            "Create <font name='Courier'>src/services/profileImageStorage.ts</font> (or under each module): "
            "uploadAvatar(userId, buffer, mime), uploadCompanyLogo(companyId, buffer, mime) — "
            "path like <font name='Courier'>{userId}/{timestamp}.jpg</font>.",
            "Add multer middleware: accept image/jpeg, image/png, image/webp; max 2 MB; single field "
            "<font name='Courier'>file</font> or <font name='Courier'>avatar</font> / <font name='Courier'>logo</font>.",
            "Students: POST /students/me/avatar → upload → studentsRepository.updateProfile({ profilePictureUrl }) → "
            "return updated profile DTO.",
            "Companies: POST /companies/me/logo → same pattern with logo_url.",
            "On replace: optionally delete previous object from storage (best-effort; do not fail the request).",
            "Map multer errors to AppError (INVALID_FILE_TYPE, FILE_TOO_LARGE) like resumes upload utils.",
            "Add light rate limiter on upload routes (reuse or clone resumeUploadRateLimiter pattern).",
        ],
    )
    story.append(Paragraph("Exit criteria B3", styles["h3"]))
    for item in [
        "Valid JPEG/PNG returns 200 with new URL; URL is publicly fetchable.",
        "PDF or &gt;2 MB returns 400 with stable code.",
        "students.profile_picture_url / companies.logo_url updated in DB.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # ── B4 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Milestone B4 — Swagger, Error Catalog &amp; Hardening", styles["h2"]))
    story.append(Paragraph("Backend steps", styles["h3"]))
    add_steps(
        story,
        styles,
        [
            "Extend <font name='Courier'>src/config/swagger.ts</font> paths for every students/companies "
            "endpoint (request/response schemas, bearer security, error examples).",
            "Document error codes in PHASE_5_DOCUMENTATION.md (create file): "
            "STUDENT_NOT_FOUND, COMPANY_NOT_FOUND, COMPANY_NOT_PUBLIC, INVALID_FILE_TYPE, etc.",
            "Confirm CORS allows the Vite origin (localhost:5173) for Authorization header.",
            "Ensure PATCH does not accept unknown keys (Zod .strict() or strip).",
            "Double-check route order: /me and /me/avatar registered before /:id.",
            "Run <font name='Courier'>npm run typecheck</font>; fix any new module export issues.",
        ],
    )
    story.append(Paragraph("Exit criteria B4", styles["h3"]))
    for item in [
        "Swagger UI at /api/docs lists all Phase 5 endpoints with try-it-out schemas.",
        "Typecheck passes; no unused exports from new modules.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # ── B5 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Milestone B5 — Phase 5 Test Matrix", styles["h2"]))
    story.append(Paragraph("Backend steps", styles["h3"]))
    add_steps(
        story,
        styles,
        [
            "Add <font name='Courier'>src/__tests__/phase5.students.test.ts</font>: "
            "auth matrix, happy path GET/PATCH, validation failures, public card field stripping.",
            "Add <font name='Courier'>src/__tests__/phase5.companies.test.ts</font>: "
            "pending company not public, approved public, company-only PATCH, student forbidden.",
            "Add <font name='Courier'>src/__tests__/phase5.upload.test.ts</font>: "
            "mock storage upload; assert repository update called with URL; reject bad mime.",
            "Add <font name='Courier'>src/__tests__/phase5.swagger.test.ts</font>: "
            "assert path keys exist on swaggerSpec (mirror phase4.swagger.test.ts).",
            "Add npm script <font name='Courier'>test:phase5</font> in package.json: "
            "<font name='Courier'>jest --runInBand src/__tests__/phase5</font>.",
            "Run <font name='Courier'>npm run test:phase5</font> and "
            "<font name='Courier'>npm run test:phase4</font> — both must pass.",
            "Write <font name='Courier'>documentation/PHASE_5_DOCUMENTATION.md</font> "
            "with milestone table Status=Complete as each lands.",
        ],
    )
    story.append(Paragraph("Exit criteria B5", styles["h3"]))
    for item in [
        "npm run test:phase5 exits 0.",
        "npm run test:phase4 still green (no regressions).",
        "PHASE_5_DOCUMENTATION.md checked in with milestone status.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # =========================================================================
    # FRONTEND MILESTONES
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("6. Frontend Milestones — Detailed Steps", styles["h1"]))
    story.append(
        Paragraph(
            "Frontend root: <font name='Courier'>c:/projects/KU-Placement-Cell/frontend</font>. "
            "Today everything lives in <font name='Courier'>src/app/App.tsx</font> (~2100 lines) with "
            "useState screen switching and hardcoded COMPANIES / STUDENTS / MESSAGES. Phase 5 does "
            "<b>not</b> require a full rewrite — add an integration layer beside App.tsx and replace "
            "only the wired screens.",
            styles["body"],
        )
    )

    # ── F1 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Milestone F1 — API Client &amp; Environment", styles["h2"]))
    story.append(
        Paragraph(
            "<b>Goal:</b> One place for all HTTP calls to the backend. "
            "<b>Depends on:</b> Backend running locally (default port from Phase 1 env).",
            styles["body"],
        )
    )
    story.append(Paragraph("Frontend steps", styles["h3"]))
    add_steps(
        story,
        styles,
        [
            "Create <font name='Courier'>frontend/.env.example</font> and <font name='Courier'>.env</font> "
            "with <font name='Courier'>VITE_API_URL=http://localhost:5000/api/v1</font>.",
            "Create <font name='Courier'>src/lib/api/client.ts</font>:",
        ],
    )
    add_substeps(
        story,
        styles,
        [
            "read base URL from import.meta.env.VITE_API_URL.",
            "apiRequest&lt;T&gt;(path, options): fetch, JSON parse, throw ApiError on non-OK.",
            "Parse backend envelope { success, data, message, error } — return data on success.",
            "Support body: JSON (default) and FormData (skip Content-Type so browser sets boundary).",
        ],
    )
    add_steps(
        story,
        styles,
        [
            "Create <font name='Courier'>src/lib/api/types.ts</font> for shared DTO types "
            "(AuthTokens, StudentProfile, CompanyProfile, ResumeAnalysis).",
            "Create thin API modules: <font name='Courier'>authApi.ts</font>, "
            "<font name='Courier'>studentsApi.ts</font>, <font name='Courier'>companiesApi.ts</font>, "
            "<font name='Courier'>resumesApi.ts</font> — one function per endpoint.",
            "Verify CORS: from browser console or a temporary button, call GET "
            "<font name='Courier'>/health</font> or unauthenticated register validation.",
            "Confirm Vite proxies are <b>not</b> required if CORS is correct; document either approach.",
        ],
    )
    story.append(Paragraph("Exit criteria F1", styles["h3"]))
    for item in [
        "Importing studentsApi from a throwaway call reaches the backend without CORS errors.",
        ".env.example committed; secrets never committed.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # ── F2 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Milestone F2 — Token Storage &amp; Session Layer", styles["h2"]))
    story.append(Paragraph("Frontend steps", styles["h3"]))
    add_steps(
        story,
        styles,
        [
            "Create <font name='Courier'>src/lib/auth/tokenStore.ts</font>: "
            "get/set/clear accessToken + refreshToken in localStorage "
            "(keys e.g. kupc_access, kupc_refresh).",
            "Extend api client: if access token present, set "
            "<font name='Courier'>Authorization: Bearer …</font>.",
            "On HTTP 401: attempt single refresh via POST /auth/refresh with refresh token; "
            "store new pair; retry original request once; if refresh fails, clear tokens and emit "
            "session-expired event.",
            "Create <font name='Courier'>src/lib/auth/AuthContext.tsx</font>:",
        ],
    )
    add_substeps(
        story,
        styles,
        [
            "State: user (from /auth/me), role, status: idle | loading | authenticated | anonymous.",
            "login(email, password) → authApi.login → save tokens → fetchMe().",
            "logout() → authApi.logout (best-effort) → clear tokens → set anonymous.",
            "On mount: if access token exists, call /auth/me; else anonymous.",
        ],
    )
    add_steps(
        story,
        styles,
        [
            "Wrap App root with AuthProvider in <font name='Courier'>src/main.tsx</font> "
            "(or wherever createRoot is).",
            "Expose useAuth() hook for screens.",
        ],
    )
    story.append(Paragraph("Exit criteria F2", styles["h3"]))
    for item in [
        "After manual token inject + reload, AuthContext hydrates user from /auth/me.",
        "Expired access token triggers refresh without forcing re-login when refresh is valid.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # ── F3 ────────────────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Milestone F3 — Auth Screens", styles["h2"]))
    story.append(
        Paragraph(
            "<b>Goal:</b> Real login/register/OTP UI. Landing page currently jumps straight into the app "
            "via onEnter(role) — replace that with auth flows.",
            styles["body"],
        )
    )
    story.append(Paragraph("Frontend steps", styles["h3"]))
    add_steps(
        story,
        styles,
        [
            "Add Screen union values (or separate auth view state): "
            "login, register-student, register-company, verify-otp, admin-login.",
            "Build <font name='Courier'>LoginPage</font>: email + password → authApi.login → "
            "on success set role from /me and navigate to dashboard.",
            "Build <font name='Courier'>RegisterStudentPage</font>: fields matching "
            "registerStudentSchema (KU email, password, full name, ku_id) → POST /auth/register/student → "
            "navigate to verify-otp with email in state.",
            "Build <font name='Courier'>VerifyOtpPage</font>: 6-digit OTP → POST /auth/verify-otp → "
            "then login or accept tokens if API returns them → dashboard.",
            "Build <font name='Courier'>RegisterCompanyPage</font>: company_name, email, password, website → "
            "POST /auth/register/company → login screen with success banner "
            "(pending verification messaging).",
            "Build <font name='Courier'>AdminLoginPage</font>: POST /auth/admin/login.",
            "Update LandingPage CTAs: Student / Company / Admin open the correct auth screen "
            "(not fake dashboard entry).",
            "Surface backend error codes as readable messages "
            "(EMAIL_ALREADY_EXISTS, INVALID_OTP, INVALID_CREDENTIALS, etc.).",
            "Disable submit buttons while request in flight; show inline field errors.",
        ],
    )
    story.append(Paragraph("Exit criteria F3", styles["h3"]))
    for item in [
        "Student can register → verify OTP → land on student dashboard with real JWT.",
        "Company can register → login → see company shell (verification pending).",
        "Admin can login via admin route.",
        "Wrong password shows error; no silent failure.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # ── F4 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Milestone F4 — Guards &amp; Role Routing", styles["h2"]))
    story.append(Paragraph("Frontend steps", styles["h3"]))
    add_steps(
        story,
        styles,
        [
            "In App shell: if AuthContext status is loading, show full-page spinner (not landing).",
            "If anonymous and screen is not an auth/landing screen, redirect to login.",
            "If authenticated, set role from user.role (STUDENT→student, COMPANY→company, ADMIN→admin) — "
            "do not trust the landing-page role picker alone.",
            "Filter sidebar NAV items by role (already partially done); additionally block screenComponent "
            "access if role mismatch (e.g. student opening company-approval → redirect dashboard).",
            "On logout from Settings: call AuthContext.logout and return to landing.",
            "Optional: deep-link query ?screen=profile after login for later phases.",
        ],
    )
    story.append(Paragraph("Exit criteria F4", styles["h3"]))
    for item in [
        "Unauthenticated user cannot remain on dashboard after refresh.",
        "Student JWT cannot open admin screens via setScreen hacking.",
        "Logout clears tokens and returns to landing.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # ── F5 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Milestone F5 — Wire Student Profile Screen", styles["h2"]))
    story.append(
        Paragraph(
            "<b>Depends on:</b> B1, F2. Target component: <font name='Courier'>StudentProfile</font> "
            "in App.tsx (currently reads STUDENTS[0]).",
            styles["body"],
        )
    )
    story.append(Paragraph("Frontend steps", styles["h3"]))
    add_steps(
        story,
        styles,
        [
            "On mount of StudentProfile: studentsApi.getMe() → local form state "
            "(full_name read-only or editable per backend rules; bio, phone, degree, cgpa, department, "
            "graduation_year editable).",
            "Show skeleton/spinner while loading; toast or banner on load error.",
            "Save button → studentsApi.updateMe(patch) → update local state from response.",
            "Avatar: file input → studentsApi.uploadAvatar(file) → refresh profile image src.",
            "Display linked resume summary if API returns resume_id / analysis score "
            "(link button to resume screen).",
            "Remove STUDENTS[0] usage from this screen and from sidebar avatar when authenticated "
            "(use profile_picture_url or initials fallback).",
            "Keep SettingsPage personal fields in sync or make Settings a thin alias that navigates "
            "to profile (avoid two sources of truth).",
        ],
    )
    story.append(Paragraph("Exit criteria F5", styles["h3"]))
    for item in [
        "Profile shows live backend data after login (not Priya mock).",
        "Editing bio and saving persists after full page reload.",
        "Avatar upload updates the visible image.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # ── F6 ────────────────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Milestone F6 — Wire Company Profile Editor", styles["h2"]))
    story.append(
        Paragraph(
            "<b>Depends on:</b> B2–B3, F2. Target: replace the "
            "<font name='Courier'>company-profile</font> placeholder block in App.tsx.",
            styles["body"],
        )
    )
    story.append(Paragraph("Frontend steps", styles["h3"]))
    add_steps(
        story,
        styles,
        [
            "Create CompanyProfileEditor component (can live in App.tsx or "
            "<font name='Courier'>src/app/screens/CompanyProfile.tsx</font>).",
            "On mount: companiesApi.getMe() → form fields company_name, website, industry, description.",
            "Show verification_status badge: pending (amber), approved (green), rejected (red) — "
            "copy explaining that job posting requires approval.",
            "Save → companiesApi.updateMe; logo file input → companiesApi.uploadLogo.",
            "Disable logo/name edit messaging if product rules require lock after approval "
            "(default: allow description/industry always; document any locks).",
            "Wire screenComponent['company-profile'] to the new editor.",
            "Company dashboard header: show real company_name from context/me instead of mock.",
        ],
    )
    story.append(Paragraph("Exit criteria F6", styles["h3"]))
    for item in [
        "Placeholder text is gone; form loads and saves against API.",
        "Pending companies see clear verification status.",
        "Logo upload displays after save.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # ── F7 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Milestone F7 — Wire Resume Analyzer", styles["h2"]))
    story.append(
        Paragraph(
            "<b>Depends on:</b> Phase 4 backend + worker running (Redis, OPENAI_API_KEY), F2. "
            "Target: <font name='Courier'>ResumeAnalyzer</font> — currently fake setTimeout(~2s).",
            styles["body"],
        )
    )
    story.append(Paragraph("Frontend steps", styles["h3"]))
    add_steps(
        story,
        styles,
        [
            "Replace mock analyze handler: on PDF select/upload, call resumesApi.upload(file) "
            "expecting 202 with resumeId + analysisId + status pending.",
            "Set UI to analyzing state immediately on 202.",
            "Poll resumesApi.getAnalysis(resumeId) every 2 seconds (max ~60 attempts).",
            "On status completed: map response into existing ScoreRing / breakdown / strengths / "
            "suggestions UI (align field names with resumes.mapper / INTEGRATION-inspired shape).",
            "On status failed: show error message from API; allow retry upload.",
            "List prior resumes via resumesApi.list() in a side panel or dropdown "
            "(optional but recommended).",
            "Delete resume: confirm dialog → resumesApi.remove(id) → refresh list.",
            "Clear the fake timeout and hardcoded score constants from the component.",
            "Document in README: both <font name='Courier'>npm run dev</font> (API) and "
            "<font name='Courier'>npm run worker:resumes</font> must run for analysis to complete.",
        ],
    )
    story.append(Paragraph("Exit criteria F7", styles["h3"]))
    for item in [
        "Uploading a real PDF produces a live ATS score from OpenAI (worker path).",
        "Pending → processing → completed states visible in UI.",
        "Failed analysis shows recoverable error.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # ── F8 ────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Milestone F8 — UX Polish &amp; Mock-Data Cleanup", styles["h2"]))
    story.append(Paragraph("Frontend steps", styles["h3"]))
    add_steps(
        story,
        styles,
        [
            "Add shared LoadingSpinner, ErrorBanner, EmptyState components; use on all wired screens.",
            "Global toast or top banner for network failures (offline, 500).",
            "Scope mock data: keep COMPANIES/STUDENTS/MESSAGES only for discover, matches, chat, "
            "kanban, admin approval until later phases — add a code comment "
            "// MOCK: Phase 6+.",
            "Ensure Settings logout and notification bell do not crash when user is real "
            "(notifications may remain mock).",
            "Mobile sanity check: auth forms and profile forms usable at 375px width.",
            "Write <font name='Courier'>frontend/INTEGRATION.md</font> short note: env vars, "
            "how to run backend+worker+frontend, which screens are live vs mock.",
            "Manual test matrix (checklist below) executed and results noted in Phase 5 docs.",
        ],
    )
    story.append(Paragraph("Exit criteria F8", styles["h3"]))
    for item in [
        "No STUDENTS[0] in profile/resume/auth paths.",
        "Discover/chat still work as demos with mocks.",
        "frontend/INTEGRATION.md exists.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    # =========================================================================
    # CROSS-CUTTING
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("7. Data &amp; Storage Notes", styles["h1"]))
    story.append(
        Paragraph(
            "Reuse Phase 3B tables <font name='Courier'>students</font> and "
            "<font name='Courier'>companies</font>. "
            "Repositories already implement updateProfile. New work is HTTP layer + storage buckets "
            "<font name='Courier'>avatars</font> and <font name='Courier'>company-logos</font>. "
            "Resume bucket from Phase 4 is unchanged.",
            styles["body"],
        )
    )

    story.append(Paragraph("8. Local Dev Runbook", styles["h1"]))
    runbook = [
        ["#", "Process", "Command / notes"],
        ["1", "Supabase", "Local or cloud project; migrations applied; storage buckets created"],
        ["2", "Redis", "Required for resume worker (Phase 4)"],
        ["3", "Backend API", "cd kupc-backend && npm run dev"],
        ["4", "Resume worker", "cd kupc-backend && npm run worker:resumes"],
        ["5", "Frontend", "cd frontend && npm run dev (Vite)"],
        ["6", "Docs", "Swagger at http://localhost:&lt;port&gt;/api/docs"],
    ]
    story.append(make_table(runbook, col_widths=[1 * cm, 3.5 * cm, 12.5 * cm]))

    story.append(Paragraph("9. Testing Strategy", styles["h1"]))
    story.append(Paragraph("Backend", styles["h3"]))
    for item in [
        "supertest integration tests per endpoint (auth, validation, RBAC, not-found).",
        "Upload tests with mocked Supabase Storage (mirror Phase 4).",
        "Swagger path presence tests.",
        "Scripts: test:phase5, plus regression test:phase4.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))
    story.append(Paragraph("Frontend (manual matrix)", styles["h3"]))
    manual = [
        ["#", "Case", "Expected"],
        ["1", "Student register + OTP + login", "Dashboard; token in localStorage"],
        ["2", "Reload while logged in", "Session restored via /auth/me"],
        ["3", "Edit student bio + reload", "Bio persisted"],
        ["4", "Upload avatar", "Image visible in profile + sidebar"],
        ["5", "Upload resume PDF", "Score appears after worker completes"],
        ["6", "Company register + login", "Profile shows verification pending"],
        ["7", "Company edit description + logo", "Persists after reload"],
        ["8", "Admin login", "Admin shell; no student routes"],
        ["9", "Student opens /companies/me via API abuse", "403 from API; UI never offers it"],
        ["10", "Logout", "Landing; tokens cleared"],
    ]
    story.append(make_table(manual, col_widths=[1 * cm, 6 * cm, 10 * cm]))

    story.append(Paragraph("10. Exit Checklist (Phase Complete)", styles["h1"]))
    checklist = [
        ["#", "Criterion", "Owner"],
        ["1", "B1–B5 complete; test:phase5 green", "Backend"],
        ["2", "Swagger documents all Phase 5 endpoints", "Backend"],
        ["3", "Student register → OTP → login → session persists", "Frontend"],
        ["4", "Student profile view/edit + avatar against live API", "Both"],
        ["5", "Resume analyzer shows real ATS score from worker", "Both"],
        ["6", "Company login + profile edit + logo; status visible", "Both"],
        ["7", "Guards block cross-role screens", "Frontend"],
        ["8", "PHASE_5_DOCUMENTATION.md + frontend/INTEGRATION.md written", "Both"],
        ["9", "test:phase4 still green", "Backend"],
    ]
    story.append(make_table(checklist, col_widths=[1 * cm, 11 * cm, 5 * cm]))

    story.append(Paragraph("11. Phase 6 Preview — Job Posting &amp; Discovery", styles["h1"]))
    story.append(
        Paragraph(
            "After Phase 5, implement Backend Specification v2.0 Job Posting &amp; Discovery: "
            "full jobs module (CRUD for verified companies, student feed with filters, saved jobs), "
            "wire the existing JobPosting form, and replace mock discover cards with real open jobs. "
            "jobs.repository and indexes from Phase 3B are already in place.",
            styles["body"],
        )
    )

    return story


def write_pdf(filename: str, title: str, story_parts: list):
    path = OUT_DIR / filename
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=title,
    )
    doc.build(
        story_parts,
        onFirstPage=lambda c, d: add_footer(c, d, title),
        onLaterPages=lambda c, d: add_footer(c, d, title),
    )
    print(f"Wrote {path}")


def main():
    styles = build_styles()
    write_pdf(
        "KUPC_Progress_Report.pdf",
        "Progress Report",
        build_progress_report(styles),
    )
    write_pdf(
        "KUPC_Phase5_Specification.pdf",
        "Phase 5 Specification",
        build_phase5_spec(styles),
    )


if __name__ == "__main__":
    main()
