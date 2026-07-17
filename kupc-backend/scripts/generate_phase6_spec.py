"""
Generate KUPC Phase 6 Specification PDF — Job Posting & Discovery.
Mirrors the formatting style of KUPC_Phase5_Specification.pdf / Phase 4 specs.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
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
OUT_FILE = "KUPC_Phase6_Specification.pdf"
TODAY = date.today().strftime("%B %d, %Y")
BLUE = colors.HexColor("#1E3A8A")
BLUE2 = colors.HexColor("#1E40AF")
BLUE3 = colors.HexColor("#1D4ED8")
GRAY = colors.HexColor("#4B5563")
LIGHT = colors.HexColor("#EFF6FF")
GRID = colors.HexColor("#E5E7EB")


def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "DocTitle",
            parent=base["Title"],
            fontSize=20,
            leading=24,
            spaceAfter=4,
            alignment=TA_CENTER,
            textColor=BLUE,
        ),
        "subtitle": ParagraphStyle(
            "DocSubtitle",
            parent=base["Normal"],
            fontSize=11,
            leading=14,
            spaceAfter=12,
            alignment=TA_CENTER,
            textColor=GRAY,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontSize=14,
            leading=17,
            spaceBefore=12,
            spaceAfter=7,
            textColor=BLUE2,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontSize=11.5,
            leading=14,
            spaceBefore=10,
            spaceAfter=5,
            textColor=BLUE3,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=base["Heading3"],
            fontSize=10.5,
            leading=13,
            spaceBefore=8,
            spaceAfter=4,
            textColor=BLUE,
            fontName="Helvetica-Bold",
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontSize=9.5,
            leading=13,
            spaceAfter=5,
            alignment=TA_JUSTIFY,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontSize=9.5,
            leading=12.5,
            leftIndent=14,
            spaceAfter=2,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#6B7280"),
        ),
        "step": ParagraphStyle(
            "Step",
            parent=base["Normal"],
            fontSize=9,
            leading=12.5,
            leftIndent=10,
            spaceAfter=3,
        ),
        "step_sub": ParagraphStyle(
            "StepSub",
            parent=base["Normal"],
            fontSize=8.5,
            leading=11.5,
            leftIndent=24,
            spaceAfter=2,
            textColor=colors.HexColor("#374151"),
        ),
        "code": ParagraphStyle(
            "CodeLine",
            parent=base["Normal"],
            fontName="Courier",
            fontSize=8,
            leading=10.5,
            leftIndent=20,
            spaceAfter=2,
            textColor=colors.HexColor("#111827"),
            backColor=colors.HexColor("#F3F4F6"),
        ),
        "callout": ParagraphStyle(
            "Callout",
            parent=base["Normal"],
            fontSize=9,
            leading=12,
            spaceBefore=4,
            spaceAfter=6,
            leftIndent=6,
            rightIndent=6,
            textColor=colors.HexColor("#1E3A8A"),
            backColor=colors.HexColor("#F8FAFC"),
        ),
    }


def p(styles, key, text):
    return Paragraph(text, styles[key])


def bullets(styles, items: list[str]):
    return [p(styles, "bullet", f"• {item}") for item in items]


def steps(styles, items: list[str]):
    out = []
    for i, item in enumerate(items, 1):
        out.append(p(styles, "step", f"<b>{i}.</b> {item}"))
    return out


def substeps(styles, items: list[str]):
    return [p(styles, "step_sub", f"– {item}") for item in items]


def make_table(data, col_widths=None, header=True):
    # Wrap cells as Paragraphs so text wraps cleanly
    wrapped = []
    cell = ParagraphStyle(
        "Cell",
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#111827"),
    )
    header_cell = ParagraphStyle(
        "HeaderCell",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=BLUE,
    )
    for r_i, row in enumerate(data):
        wrapped.append(
            [
                Paragraph(str(c), header_cell if header and r_i == 0 else cell)
                for c in row
            ]
        )
    table = Table(wrapped, colWidths=col_widths, repeatRows=1 if header else 0)
    cmds = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, GRID),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        cmds += [
            ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
            ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ]
    table.setStyle(TableStyle(cmds))
    return table


def add_footer(canvas, doc, title: str):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#9CA3AF"))
    canvas.drawString(2 * cm, 1.2 * cm, f"KUPC — {title}")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


def hr():
    return HRFlowable(width="100%", thickness=1, color=colors.HexColor("#BFDBFE"), spaceBefore=4, spaceAfter=8)


def section_exit(styles, items: list[str]):
    story = [p(styles, "h3", "Exit checklist")]
    data = [["#", "Criterion", "Done when"]]
    for i, (crit, done) in enumerate(items, 1):
        data.append([str(i), crit, done])
    story.append(make_table(data, col_widths=[1 * cm, 7.5 * cm, 8.5 * cm]))
    return story


def build_story(styles) -> list:
    s = styles
    story: list = []

    # ── Cover ──────────────────────────────────────────────────────────
    story.append(p(s, "title", "KUPC Phase 6 Specification"))
    story.append(
        p(
            s,
            "subtitle",
            "Job Posting &amp; Discovery<br/>"
            f"Version 1.0 · {TODAY} · Status: Draft for sprint planning · Detailed milestone steps",
        )
    )
    story.append(hr())

    story.append(p(s, "h1", "Document Control"))
    story.append(
        make_table(
            [
                ["Field", "Value"],
                ["Project", "KUPC — Kathmandu University Placement Connect"],
                ["Phase", "6 — Job Posting &amp; Discovery"],
                ["Depends on", "Phase 2 (Auth), Phase 3B (jobs / saved_jobs schema &amp; repos), Phase 5 (profiles + verified company)"],
                ["Feeds into", "Phase 7 — Swipe Engine; later Matching / Chat"],
                ["Repos", "kupc-backend + frontend (monorepo)"],
                ["Audience", "Backend engineers, frontend engineers, technical reviewers"],
                ["References", "Backend Spec v2.0 §7/§16; PHASE_3B_DOCUMENTATION.md; PHASE_5_DOCUMENTATION.md; frontend/INTEGRATION.md"],
            ],
            col_widths=[3.5 * cm, 13.5 * cm],
        )
    )

    # ── 1. Goal ────────────────────────────────────────────────────────
    story.append(p(s, "h1", "1. Phase Goal"))
    story.append(
        p(
            s,
            "body",
            "Turn the Phase 3 <b>jobs</b> and <b>saved_jobs</b> tables into a working product surface: "
            "verified companies can create and manage postings; students can discover open roles with "
            "search/filter, open a job detail page with company context, and save/unsave jobs. "
            "Replace the Phase 2 placeholder <font face='Courier'>POST /jobs</font> stub and the "
            "frontend mock Discover / Job Post / Saved screens with live API wiring.",
        )
    )
    story.append(
        p(
            s,
            "body",
            "<b>Phase 2</b> answered: <i>Who is making this request?</i><br/>"
            "<b>Phase 3</b> answered: <i>Where do jobs and saved bookmarks live?</i><br/>"
            "<b>Phase 5</b> answered: <i>Who is this company, and are they verified?</i><br/>"
            "<b>Phase 6</b> answers: <i>How does a company post a job, and how does a student find it?</i>",
        )
    )

    # ── 2. Why ─────────────────────────────────────────────────────────
    story.append(p(s, "h1", "2. Why This Phase Now"))
    story.extend(
        bullets(
            s,
            [
                "Backend Spec v2.0 listed Job Posting &amp; Discovery as a high-priority phase; Profiles (shipped as Phase 5) were a prerequisite.",
                "<font face='Courier'>jobs.repository.ts</font> and <font face='Courier'>savedJobs.repository.ts</font> already exist — Phase 6 adds the HTTP module, not new tables.",
                "<font face='Courier'>requireVerifiedCompany</font> middleware already blocks pending companies from posting.",
                "Frontend Discover / Job Post / Saved screens are still mock (<font face='Courier'>// MOCK: Phase 6+</font>) — students and companies have no real job loop yet.",
                "Swipe / match (later phases) need real job IDs and an open-jobs feed to operate on.",
            ],
        )
    )

    story.append(p(s, "h2", "2.1 Design decisions (locked)"))
    story.append(
        make_table(
            [
                ["Decision", "Choice", "Why"],
                ["Module layout", "Mirror <font face='Courier'>src/modules/resumes/</font> and students/companies", "Same Controller → Service → Repository layering"],
                ["Repositories", "Reuse Phase 3B <font face='Courier'>jobsRepository</font> / <font face='Courier'>savedJobsRepository</font>; extend for search/pagination", "No ad-hoc <font face='Courier'>.from('jobs')</font> outside <font face='Courier'>src/database/</font>"],
                ["HTTP naming", "snake_case on the wire", "Matches auth, profiles, resumes"],
                ["Posting gate", "<font face='Courier'>authenticate</font> + <font face='Courier'>authorize(COMPANY)</font> + <font face='Courier'>requireVerifiedCompany</font>", "Already tested in Phase 2 matrix"],
                ["Default status", "Create as <font face='Courier'>draft</font>; explicit publish → <font face='Courier'>open</font>", "Avoids accidental public posts; matches product UX"],
                ["Public feed", "Only <font face='Courier'>status = 'open'</font> jobs; join approved company card", "Students must not see drafts or pending-company posts"],
                ["Ownership", "Company may only mutate jobs where <font face='Courier'>jobs.company_id</font> matches their company row", "Prevent cross-tenant edits"],
                ["Pagination", "Cursor or limit/offset (limit default 20, max 50)", "Feeds will grow beyond seed volume"],
            ],
            col_widths=[3.2 * cm, 6.5 * cm, 7.3 * cm],
        )
    )

    # ── 3. Overview ────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(p(s, "h1", "3. Milestone Overview"))
    story.append(
        make_table(
            [
                ["ID", "Side", "Title", "Exit criterion (summary)"],
                ["B1", "Backend", "Jobs module scaffold &amp; contracts", "Types/Zod/errors/routes replace stub; mount green"],
                ["B2", "Backend", "Company job CRUD", "Verified company create/list/update/publish/close/delete"],
                ["B3", "Backend", "Student discovery feed", "Open-job list + filters + public job detail"],
                ["B4", "Backend", "Saved jobs API", "Student save / unsave / list with job cards"],
                ["B5", "Backend", "Swagger, hardening &amp; test matrix", "<font face='Courier'>npm run test:phase6</font> green; phase5 still green"],
                ["F1", "Frontend", "jobsApi + savedJobsApi", "Typed clients call /api/v1/jobs"],
                ["F2", "Frontend", "Company job posting UI", "Live create/edit form replaces mock Job Post"],
                ["F3", "Frontend", "Company manage jobs", "List own jobs; publish/close/delete actions"],
                ["F4", "Frontend", "Student discover feed", "Live open jobs replace Discover mocks"],
                ["F5", "Frontend", "Saved jobs wiring", "Live save/unsave/list on Saved screen"],
                ["F6", "Frontend", "Job detail + polish + docs", "Detail page; loading/error; INTEGRATION.md"],
            ],
            col_widths=[1.2 * cm, 2 * cm, 4.8 * cm, 9 * cm],
        )
    )

    story.append(p(s, "h2", "3.1 Out of scope"))
    story.extend(
        bullets(
            s,
            [
                "Swipe engine, mutual match detection, conversations (Phase 7+)",
                "Applicant kanban / application status workflow",
                "pgvector recommendations / semantic ranking",
                "Admin job moderation UI",
                "Job attachments / rich media beyond text fields already on <font face='Courier'>jobs</font>",
                "Changing Phase 3 schema columns unless a documented gap is found (prefer repository extensions)",
            ],
        )
    )

    story.append(p(s, "h2", "3.2 Suggested order"))
    story.append(
        p(
            s,
            "body",
            "<b>B1 → B2 → B3 → B4 → B5</b> on the backend. Frontend may start <b>F1</b> as soon as B1 contracts "
            "are stable, then <b>F2–F3</b> after B2, <b>F4–F5</b> after B3–B4, and finish with <b>F6</b>.",
        )
    )

    story.append(p(s, "h2", "3.3 Existing assets (do not reinvent)"))
    story.append(
        make_table(
            [
                ["Asset", "Location", "Role in Phase 6"],
                ["jobs table + indexes", "Phase 3B migrations", "Source of truth for postings"],
                ["saved_jobs table", "Phase 3B migrations", "Bookmarks"],
                ["jobsRepository", "src/database/jobs.repository.ts", "create / findById / listByCompany / listOpenForFeed / update / deleteById"],
                ["savedJobsRepository", "src/database/savedJobs.repository.ts", "save / unsave / listByStudent / exists"],
                ["requireVerifiedCompany", "src/middleware/requireVerifiedCompany.ts", "Gate all mutating company job routes"],
                ["Placeholder route", "src/routes/jobs.ts", "Replace with real module router"],
                ["Company public card", "Phase 5 companies module", "Embed on job detail / feed cards"],
                ["Mock UI", "frontend Discover / Job Post / Saved", "Replace with live screens"],
            ],
            col_widths=[4 * cm, 6 * cm, 7 * cm],
        )
    )

    # ── 4. API contract ────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(p(s, "h1", "4. API Contract (Backend)"))
    story.append(
        p(
            s,
            "body",
            "All paths under <font face='Courier'>/api/v1</font>. Bearer JWT required unless noted. "
            "Responses use the existing envelope: "
            "<font face='Courier'>{ success, data, message, error }</font>.",
        )
    )

    story.append(p(s, "h2", "4.1 Company job management"))
    story.append(
        make_table(
            [
                ["Method", "Path", "Auth", "Description"],
                ["POST", "/jobs", "Company + verified", "Create job (default status draft)"],
                ["GET", "/jobs/me", "Company + verified", "List own jobs (all statuses)"],
                ["GET", "/jobs/me/:id", "Company + verified", "Own job detail (any status)"],
                ["PATCH", "/jobs/me/:id", "Company + verified", "Update fields (title, description, location, job_type, min_cgpa)"],
                ["POST", "/jobs/me/:id/publish", "Company + verified", "draft → open"],
                ["POST", "/jobs/me/:id/close", "Company + verified", "open → closed"],
                ["DELETE", "/jobs/me/:id", "Company + verified", "Delete own job (CASCADE cleans related rows)"],
            ],
            col_widths=[1.8 * cm, 4.5 * cm, 3.2 * cm, 7.5 * cm],
        )
    )

    story.append(p(s, "h2", "4.2 Student discovery &amp; saved jobs"))
    story.append(
        make_table(
            [
                ["Method", "Path", "Auth", "Description"],
                ["GET", "/jobs", "Student (or any auth)", "Open-job feed; query: q, job_type, location, min_cgpa, limit, cursor/offset"],
                ["GET", "/jobs/:id", "Authenticated", "Public job detail if open; include company public card"],
                ["POST", "/jobs/:id/save", "Student", "Save / bookmark (idempotent upsert)"],
                ["DELETE", "/jobs/:id/save", "Student", "Unsave"],
                ["GET", "/jobs/saved", "Student", "List saved jobs with job + company summary"],
            ],
            col_widths=[1.8 * cm, 4.5 * cm, 3.2 * cm, 7.5 * cm],
        )
    )
    story.append(
        p(
            s,
            "callout",
            "<b>Route order:</b> Register <font face='Courier'>/me</font>, <font face='Courier'>/saved</font>, "
            "and static paths <b>before</b> <font face='Courier'>/:id</font> so path segments are never captured as UUIDs.",
        )
    )

    story.append(p(s, "h2", "4.2 DTO shapes (snake_case)"))
    story.append(p(s, "body", "<b>JobDto</b> (owner / full):"))
    story.append(
        p(
            s,
            "code",
            '{ "id", "company_id", "title", "description", "location", "job_type", '
            '"min_cgpa", "status", "created_at", "updated_at" }',
        )
    )
    story.append(p(s, "body", "<b>JobFeedCardDto</b> (student feed): JobDto fields needed for cards + nested company summary:"))
    story.append(
        p(
            s,
            "code",
            '{ ..., "company": { "id", "company_name", "logo_url", "industry", "website" }, "is_saved": boolean }',
        )
    )
    story.append(p(s, "body", "<b>CreateJobBody / UpdateJobBody</b> (Zod):"))
    story.append(
        p(
            s,
            "code",
            "title (2–120), description (20–10000), location optional, "
            "job_type in internship|full_time|part_time, min_cgpa 0–4 optional",
        )
    )

    story.append(p(s, "h2", "4.3 Error codes (stable)"))
    story.append(
        make_table(
            [
                ["Code", "HTTP", "When"],
                ["JOB_NOT_FOUND", "404", "Missing id, or student requesting non-open / foreign draft"],
                ["JOB_FORBIDDEN", "403", "Company mutates another company's job"],
                ["PENDING_VERIFICATION", "403", "Unverified company hits posting routes (existing)"],
                ["INVALID_JOB_PAYLOAD", "400", "Zod validation failure"],
                ["INVALID_JOB_TRANSITION", "409", "e.g. publish when already open; close when draft"],
                ["JOB_ALREADY_SAVED", "409", "Optional — prefer idempotent 200 on save"],
                ["SAVED_JOB_NOT_FOUND", "404", "Unsave when not saved"],
            ],
            col_widths=[4.5 * cm, 1.8 * cm, 10.7 * cm],
        )
    )

    # ── 5. Backend milestones ──────────────────────────────────────────
    story.append(PageBreak())
    story.append(p(s, "h1", "5. Backend Milestones — Detailed Steps"))
    story.append(
        p(
            s,
            "body",
            "Follow the Phase 4/5 module layout: "
            "<font face='Courier'>src/modules/jobs/</font> with types, validation, service, controller, "
            "routes, mapper, errors, constants, index. Repositories remain the only table access path.",
        )
    )

    # B1
    story.append(p(s, "h2", "Milestone B1 — Jobs Module Scaffold &amp; Contracts"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Lock contracts and replace the Phase 2 placeholder router with a real module shell. "
            "<b>Depends on:</b> Phase 2 auth middleware, Phase 3B jobsRepository. "
            "<b>Does not include:</b> Full CRUD behavior (B2), feed filters (B3), saved jobs (B4).",
        )
    )
    story.append(p(s, "h3", "Rationale"))
    story.append(
        p(
            s,
            "body",
            "Without shared DTOs and Zod schemas, company CRUD and student feed invent incompatible shapes. "
            "Replacing <font face='Courier'>src/routes/jobs.ts</font> early prevents the stub from remaining "
            "the accidental source of truth.",
        )
    )
    story.append(p(s, "h3", "Steps"))
    story.extend(
        steps(
            s,
            [
                "Create folder <font face='Courier'>src/modules/jobs/</font> mirroring students/resumes.",
                "Add <font face='Courier'>jobs.constants.ts</font>: JobType, JobStatus enums; JOB_ERROR_CODES.",
                "Add <font face='Courier'>jobs.types.ts</font>: JobDto, JobFeedCardDto, CreateJobInput, UpdateJobInput, JobListQuery.",
                "Add <font face='Courier'>jobs.validation.ts</font>: createJobSchema, updateJobSchema, jobIdParamsSchema, feedQuerySchema.",
                "Add <font face='Courier'>jobs.errors.ts</font>: helpers returning AppError with stable codes.",
                "Add <font face='Courier'>jobs.mapper.ts</font>: JobRecord → JobDto; feed mapper accepting optional company + is_saved.",
                "Add thin <font face='Courier'>jobs.controller.ts</font> / <font face='Courier'>jobs.service.ts</font> stubs that throw 'Not implemented' only if needed — prefer implementing create/list in B2 immediately after scaffold.",
                "Add <font face='Courier'>jobs.routes.ts</font> with authenticate on all routes; mount path order documented.",
                "Export from <font face='Courier'>index.ts</font>; change <font face='Courier'>src/routes/index.ts</font> to import jobsRouter from modules/jobs (delete or gut placeholder <font face='Courier'>src/routes/jobs.ts</font>).",
                "Document contracts in this spec §4; prepare Swagger stubs for B5.",
            ],
        )
    )
    story.append(p(s, "h3", "Files expected to change / create"))
    story.extend(
        bullets(
            s,
            [
                "Create: <font face='Courier'>src/modules/jobs/*</font> (constants, types, validation, errors, mapper, service, controller, routes, index)",
                "Modify: <font face='Courier'>src/routes/index.ts</font> (import path)",
                "Remove or deprecate: <font face='Courier'>src/routes/jobs.ts</font> placeholder",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Module folder exists", "src/modules/jobs/* scaffold present"),
                ("Placeholder replaced", "POST /jobs no longer returns placeholder-job-id"),
                ("Auth gates wired", "Unauthenticated → 401; student POST → 403"),
                ("Contracts typed", "JobDto / Zod schemas match §4"),
            ],
        )
    )

    # B2
    story.append(PageBreak())
    story.append(p(s, "h2", "Milestone B2 — Company Job CRUD"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Verified companies can create, list, update, publish, close, and delete their own jobs. "
            "<b>Depends on:</b> B1, companiesRepository.findByUserId, requireVerifiedCompany.",
        )
    )
    story.append(p(s, "h3", "Rationale"))
    story.append(
        p(
            s,
            "body",
            "Posting is the company half of the marketplace. Draft-then-publish prevents incomplete descriptions "
            "from appearing in the student feed. Ownership checks are mandatory because company_id is not the same "
            "as auth user id (companies.id ≠ users.id).",
        )
    )
    story.append(p(s, "h3", "Steps"))
    story.extend(
        steps(
            s,
            [
                "In service helpers: resolveCompanyId(userId) via companiesRepository.findByUserId; throw COMPANY_NOT_FOUND / PENDING handled by middleware.",
                "Implement createJob: map body → jobsRepository.create({ companyId, ..., status: 'draft' }); return JobDto.",
                "Implement listMine: jobsRepository.listByCompany(companyId).",
                "Implement getMine(jobId): findById; if null or company_id mismatch → JOB_NOT_FOUND / JOB_FORBIDDEN.",
                "Implement updateMine: only allowed fields; never allow changing company_id; status changes only via publish/close endpoints.",
                "Implement publish: only draft → open; else INVALID_JOB_TRANSITION.",
                "Implement close: only open → closed; else INVALID_JOB_TRANSITION.",
                "Implement deleteMine: ownership check then jobsRepository.deleteById.",
                "Wire routes with authorize(Role.COMPANY) + requireVerifiedCompany on all /me* mutating and listing routes.",
                "Manual smoke: approved company creates draft → publish → appears conceptually as open; pending company gets 403 PENDING_VERIFICATION.",
            ],
        )
    )
    story.append(p(s, "h3", "Files expected to change"))
    story.extend(
        bullets(
            s,
            [
                "Modify: <font face='Courier'>src/modules/jobs/jobs.service.ts</font>, controller, routes",
                "Possibly extend: <font face='Courier'>src/database/jobs.repository.ts</font> if update needs partial-null clearing",
                "Tests (later B5): <font face='Courier'>src/__tests__/phase6.jobs.crud.test.ts</font>",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Create draft", "POST /jobs → 201 with status draft"),
                ("List own", "GET /jobs/me returns only this company's jobs"),
                ("Ownership", "Company B cannot PATCH/DELETE company A's job"),
                ("Publish/close", "Valid transitions 200; invalid → 409"),
                ("Verification gate", "Pending company → 403 PENDING_VERIFICATION"),
            ],
        )
    )

    # B3
    story.append(p(s, "h2", "Milestone B3 — Student Discovery Feed"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Authenticated students (and other roles) can list open jobs with filters and open a public "
            "job detail that includes an approved company card. "
            "<b>Depends on:</b> B2 (open jobs exist), Phase 5 company public mapper.",
        )
    )
    story.append(p(s, "h3", "Rationale"))
    story.append(
        p(
            s,
            "body",
            "Discover is the student half of the marketplace. Filtering by job_type / location / min_cgpa / text search "
            "makes the Phase 3 indexes useful. Embedding a company summary avoids N+1 frontend calls to "
            "<font face='Courier'>GET /companies/:id</font> for every card.",
        )
    )
    story.append(p(s, "h3", "Steps"))
    story.extend(
        steps(
            s,
            [
                "Extend jobsRepository with listOpenFiltered({ q, jobType, location, minCgpa, limit, offset }) — keep SQL/filters inside repository.",
                "Service listFeed(viewer): call repository; for each job load company (batch by company_ids); skip non-approved companies defensively; map JobFeedCardDto; set is_saved via savedJobsRepository.exists when viewer is student.",
                "Service getPublic(jobId): findById; if status !== 'open' → JOB_NOT_FOUND; load company; if not approved → JOB_NOT_FOUND; return detail DTO.",
                "Routes: GET / and GET /:id with authenticate; authorize STUDENT for feed preferred, or any authenticated role (document choice — recommend any authenticated for admin preview, student for save flags).",
                "Validate query params with feedQuerySchema (coerce numbers; clamp limit).",
                "Manual smoke: publish a job → GET /jobs returns it → GET /jobs/:id includes company_name / logo_url.",
            ],
        )
    )
    story.append(p(s, "h3", "Files expected to change"))
    story.extend(
        bullets(
            s,
            [
                "Modify: <font face='Courier'>src/database/jobs.repository.ts</font> (filtered list)",
                "Modify: <font face='Courier'>src/modules/jobs/jobs.service.ts</font>, mapper, validation, routes",
                "Reuse: <font face='Courier'>companiesRepository.findById</font> / Phase 5 public card fields",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Open only", "Draft/closed jobs never appear in GET /jobs"),
                ("Filters", "job_type / q / location change result set"),
                ("Detail", "GET /jobs/:id returns company summary for open jobs"),
                ("404 hygiene", "Unknown id or draft id → 404 JOB_NOT_FOUND (no leak)"),
            ],
        )
    )

    # B4
    story.append(PageBreak())
    story.append(p(s, "h2", "Milestone B4 — Saved Jobs API"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Students can bookmark open jobs and list bookmarks. "
            "<b>Depends on:</b> B3 (public job existence checks), savedJobsRepository.",
        )
    )
    story.append(p(s, "h3", "Rationale"))
    story.append(
        p(
            s,
            "body",
            "Saved jobs are already modeled and seeded in Phase 3B. Wiring them unblocks the frontend Saved screen "
            "and gives Discover a heart/bookmark control without inventing client-only state.",
        )
    )
    story.append(p(s, "h3", "Steps"))
    story.extend(
        steps(
            s,
            [
                "Service save(studentUserId, jobId): ensure job is open; resolve student profile id (students.id === users.id in this schema); savedJobsRepository.save; return { saved: true }.",
                "Service unsave: savedJobsRepository.unsave; 404 if not exists (or idempotent 200 — pick one and document; recommend idempotent).",
                "Service listSaved: listByStudent; hydrate jobs + companies into JobFeedCardDto[]; drop rows whose job was deleted/closed (or show closed badge — prefer filter closed).",
                "Routes: POST/DELETE /jobs/:id/save and GET /jobs/saved with authorize(Role.STUDENT); register /saved before /:id.",
                "Optional repo helper: listByStudentWithJobs join — only if N+1 becomes painful; otherwise hydrate in service for B4.",
            ],
        )
    )
    story.append(p(s, "h3", "Files expected to change"))
    story.extend(
        bullets(
            s,
            [
                "Modify: jobs.service / routes / mapper",
                "Possibly extend: <font face='Courier'>src/database/savedJobs.repository.ts</font>",
                "Tests: <font face='Courier'>src/__tests__/phase6.saved.test.ts</font>",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Save open job", "POST → 200; row in saved_jobs"),
                ("Cannot save draft", "404/400 with stable code"),
                ("List", "GET /jobs/saved returns hydrated cards"),
                ("Unsave", "DELETE removes bookmark"),
                ("Role gate", "Company JWT cannot save (403)"),
            ],
        )
    )

    # B5
    story.append(p(s, "h2", "Milestone B5 — Swagger, Hardening &amp; Test Matrix"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Document every Phase 6 endpoint in OpenAPI, harden validation/CORS/route order, "
            "and ship a green <font face='Courier'>test:phase6</font> suite without regressing Phase 4/5.",
        )
    )
    story.append(p(s, "h3", "Rationale"))
    story.append(
        p(
            s,
            "body",
            "Phase 4 and 5 used a final matrix milestone so contracts stay honest. Job posting touches "
            "verification, ownership, and public/private status — regressions here break trust in the marketplace.",
        )
    )
    story.append(p(s, "h3", "Steps"))
    story.extend(
        steps(
            s,
            [
                "Extend <font face='Courier'>src/config/swagger.ts</font> with JobDto schemas and all §4 paths (security + examples).",
                "Confirm Zod .strip()/.strict() on bodies; unknown keys cannot set status via PATCH.",
                "Confirm CORS allows Vite origins used in local dev (5173/5174) — already updated in Phase 5 hotfix; keep listed.",
                "Add <font face='Courier'>src/__tests__/phase6.*.test.ts</font>: crud, feed filters, saved jobs, swagger presence, matrix file listing module files.",
                "Add npm script <font face='Courier'>test:phase6</font> in package.json.",
                "Write <font face='Courier'>documentation/PHASE_6_DOCUMENTATION.md</font> as milestones complete (implementation log, like Phase 5).",
                "Run <font face='Courier'>npm run test:phase5</font>, <font face='Courier'>test:phase4</font>, and typecheck — all green.",
            ],
        )
    )
    story.append(p(s, "h3", "Files expected to change"))
    story.extend(
        bullets(
            s,
            [
                "Modify: swagger.ts, package.json",
                "Create: phase6 test files + PHASE_6_DOCUMENTATION.md",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("OpenAPI", "All Phase 6 paths visible at /api/docs"),
                ("test:phase6", "Jest suite green in CI/local"),
                ("No regressions", "phase4 + phase5 scripts still green"),
                ("Docs", "PHASE_6_DOCUMENTATION.md started/updated"),
            ],
        )
    )

    # ── 6. Frontend milestones ─────────────────────────────────────────
    story.append(PageBreak())
    story.append(p(s, "h1", "6. Frontend Milestones — Detailed Steps"))
    story.append(
        p(
            s,
            "body",
            "Build on Phase 5 patterns: typed clients in <font face='Courier'>src/lib/api/</font>, "
            "screens under <font face='Courier'>src/app/screens/</font>, react-router + RoleGate, "
            "ErrorBanner / LoadingSpinner / EmptyState.",
        )
    )

    # F1
    story.append(p(s, "h2", "Milestone F1 — jobsApi &amp; savedJobsApi"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Typed API clients matching §4 contracts. "
            "<b>Depends on:</b> B1 contracts stable (can stub until B2/B3 land).",
        )
    )
    story.append(p(s, "h3", "Rationale"))
    story.append(
        p(
            s,
            "body",
            "Phase 5 proved that screens stay thin when fetch logic lives in <font face='Courier'>lib/api</font>. "
            "Job screens must not re-implement token headers or envelope parsing.",
        )
    )
    story.append(p(s, "h3", "Steps"))
    story.extend(
        steps(
            s,
            [
                "Add JobDto / JobFeedCardDto / CreateJobInput types to <font face='Courier'>src/lib/api/types.ts</font>.",
                "Create <font face='Courier'>jobsApi.ts</font>: create, listMine, getMine, updateMine, publish, close, remove, listFeed, getById.",
                "Create <font face='Courier'>savedJobsApi.ts</font> or methods on jobsApi: save, unsave, listSaved.",
                "Export from <font face='Courier'>src/lib/api/index.ts</font>.",
                "Map new error codes in <font face='Courier'>errorMessages.ts</font> (JOB_NOT_FOUND, PENDING_VERIFICATION, INVALID_JOB_TRANSITION, …).",
            ],
        )
    )
    story.append(p(s, "h3", "Files expected to change"))
    story.extend(
        bullets(
            s,
            [
                "Create: jobsApi.ts (+ optional savedJobsApi.ts)",
                "Modify: types.ts, index.ts, errorMessages.ts",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Clients export", "jobsApi callable from screens"),
                ("Types compile", "tsc --noEmit clean for new files"),
                ("Errors mapped", "User-facing strings for Phase 6 codes"),
            ],
        )
    )

    # F2
    story.append(p(s, "h2", "Milestone F2 — Company Job Posting UI"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Replace mock Job Post screen with live create (and edit) against POST/PATCH /jobs. "
            "<b>Depends on:</b> B2, F1, RoleGate COMPANY.",
        )
    )
    story.append(p(s, "h3", "Rationale"))
    story.append(
        p(
            s,
            "body",
            "Companies need a real path from dashboard → post a role. Draft-first UX matches backend defaults "
            "and avoids publishing incomplete posts.",
        )
    )
    story.append(p(s, "h3", "Steps"))
    story.extend(
        steps(
            s,
            [
                "Extract/create <font face='Courier'>src/app/screens/JobPostPage.tsx</font> from prototype Job Post UI.",
                "Wire form submit → jobsApi.create; show ErrorBanner on failure (especially PENDING_VERIFICATION).",
                "After create, navigate to manage list or detail; offer Publish button calling jobsApi.publish.",
                "Support edit mode via route param when GET /jobs/me/:id + PATCH.",
                "Keep visual language consistent with CompanyProfilePage (no new design system).",
            ],
        )
    )
    story.append(p(s, "h3", "Files expected to change"))
    story.extend(
        bullets(
            s,
            [
                "Create/Modify: JobPostPage.tsx",
                "Modify: App.tsx routes (/app/job-post), prototypeScreens.tsx (remove/replace mock)",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Create works", "Approved company creates draft visible via API"),
                ("Pending blocked", "Clear message when verification pending"),
                ("Validation errors", "Inline / banner from API codes"),
            ],
        )
    )

    # F3
    story.append(p(s, "h2", "Milestone F3 — Company Manage Jobs"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Company can see all own jobs and publish / close / delete from a list. "
            "<b>Depends on:</b> B2, F2.",
        )
    )
    story.append(p(s, "h3", "Rationale"))
    story.append(
        p(
            s,
            "body",
            "Without a manage list, drafts are stranded after create. Closing jobs is required when a role is filled "
            "so they leave the student feed.",
        )
    )
    story.append(p(s, "h3", "Steps"))
    story.extend(
        steps(
            s,
            [
                "Add CompanyJobsPage (or section on company dashboard) calling jobsApi.listMine.",
                "Actions: Publish (draft), Close (open), Edit, Delete with confirm.",
                "EmptyState when no jobs; LoadingSpinner while fetching.",
                "Link from CompanyDashboard quick actions.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("List live", "Shows statuses draft/open/closed"),
                ("Transitions", "Publish/close update UI without full reload bugs"),
                ("Delete", "Removes row after confirm"),
            ],
        )
    )

    # F4
    story.append(PageBreak())
    story.append(p(s, "h2", "Milestone F4 — Student Discover Feed (Live)"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Replace mock Discover cards with GET /jobs feed. "
            "<b>Depends on:</b> B3, F1.",
        )
    )
    story.append(p(s, "h3", "Rationale"))
    story.append(
        p(
            s,
            "body",
            "Discover is the primary student job surface. Keeping swipe gestures as visual chrome is fine, but "
            "the underlying cards must be real open jobs — swipe persistence itself is Phase 7.",
        )
    )
    story.append(p(s, "h3", "Steps"))
    story.extend(
        steps(
            s,
            [
                "Create/update DiscoverPage to fetch jobsApi.listFeed on mount.",
                "Add filter controls: job_type, location text, optional min_cgpa, search q.",
                "Render company logo/name from nested company object.",
                "Bookmark control → jobsApi.save / unsave; optimistic UI optional.",
                "EmptyState when no open jobs; ErrorBanner on failure.",
                "Mark remaining swipe-only behavior with <font face='Courier'>// MOCK: Phase 7</font> if still local-only.",
            ],
        )
    )
    story.append(p(s, "h3", "Files expected to change"))
    story.extend(
        bullets(
            s,
            [
                "Modify: Discover route component (prototypeScreens or new screens/DiscoverPage.tsx)",
                "Modify: App.tsx if route element changes",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Live cards", "Published jobs appear after refresh"),
                ("Filters work", "Query params change results"),
                ("Mocks scoped", "No hardcoded COMPANY seed cards for feed data"),
            ],
        )
    )

    # F5
    story.append(p(s, "h2", "Milestone F5 — Saved Jobs Wiring"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Saved screen uses GET /jobs/saved and can unsave. "
            "<b>Depends on:</b> B4, F4 bookmark control.",
        )
    )
    story.append(p(s, "h3", "Rationale"))
    story.append(
        p(
            s,
            "body",
            "Phase 5 left Saved as mockSavedJobs. Students expect bookmarks to survive reload — that requires the API.",
        )
    )
    story.append(p(s, "h3", "Steps"))
    story.extend(
        steps(
            s,
            [
                "Replace mockSavedJobs usage with jobsApi.listSaved.",
                "Unsave button → DELETE /jobs/:id/save; remove from list.",
                "Click-through to job detail (F6) or company public profile.",
                "Delete or quarantine <font face='Courier'>mockSavedJobs.ts</font> once unused.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("List persists", "Reload still shows bookmarks"),
                ("Unsave works", "Row disappears and feed is_saved updates"),
                ("Mock removed", "No import of mockSavedJobs in live route"),
            ],
        )
    )

    # F6
    story.append(p(s, "h2", "Milestone F6 — Job Detail, Polish &amp; Documentation"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Job detail page, consistent loading/error/empty states, update INTEGRATION.md, "
            "and finish PHASE_6_DOCUMENTATION.md. "
            "<b>Depends on:</b> F2–F5.",
        )
    )
    story.append(p(s, "h3", "Rationale"))
    story.append(
        p(
            s,
            "body",
            "Feed cards are not enough for decisions — students need full description + company context. "
            "Documentation keeps the monorepo operable for the next teammate (same standard as Phase 5 F8).",
        )
    )
    story.append(p(s, "h3", "Steps"))
    story.extend(
        steps(
            s,
            [
                "Add JobDetailPage at /app/jobs/:id (or modal) using jobsApi.getById.",
                "Show save toggle, company card link to public company profile when approved.",
                "Audit Discover / Job Post / Saved / Manage for LoadingSpinner, ErrorBanner, EmptyState.",
                "Update <font face='Courier'>frontend/INTEGRATION.md</font> live-vs-mock table (Discover/Saved/Job Post → Live).",
                "Update <font face='Courier'>frontend/README.md</font> phase status.",
                "Complete <font face='Courier'>kupc-backend/documentation/PHASE_6_DOCUMENTATION.md</font> with decisions + exit evidence.",
                "Manual smoke checklist end-to-end (see §7).",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Detail page", "Open job renders full description + company"),
                ("UX polish", "No raw failed-to-fetch without ErrorBanner"),
                ("Docs updated", "INTEGRATION.md + PHASE_6_DOCUMENTATION.md"),
                ("Mock labels", "Swipe/chat/kanban still marked Phase 7+"),
            ],
        )
    )

    # ── 7. Phase exit ──────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(p(s, "h1", "7. Phase 6 Exit Checklist (Whole Phase)"))
    story.append(
        make_table(
            [
                ["#", "Criterion", "Owner"],
                ["1", "B1–B5 complete; npm run test:phase6 green", "Backend"],
                ["2", "Swagger documents all Phase 6 job endpoints", "Backend"],
                ["3", "Verified company: create draft → publish → appears in student feed", "Both"],
                ["4", "Pending company cannot POST /jobs (403 PENDING_VERIFICATION)", "Backend"],
                ["5", "Student feed filters + job detail with company card", "Both"],
                ["6", "Save / unsave / list saved persists across reload", "Both"],
                ["7", "Company can close/delete own jobs; cannot mutate others'", "Backend"],
                ["8", "Frontend Discover / Job Post / Saved no longer use mock job data", "Frontend"],
                ["9", "INTEGRATION.md + PHASE_6_DOCUMENTATION.md written", "Both"],
                ["10", "test:phase4 and test:phase5 still green; tsc clean", "Both"],
            ],
            col_widths=[1 * cm, 12 * cm, 4 * cm],
        )
    )

    story.append(p(s, "h2", "7.1 Manual smoke script"))
    story.extend(
        steps(
            s,
            [
                "Approve a company in Supabase (or admin flow) so requireVerifiedCompany passes.",
                "Company login → Job Post → create role → Publish.",
                "Student login → Discover → see the job → open detail → Save.",
                "Open Saved → confirm job → Unsave → confirm gone.",
                "Company Manage → Close job → student feed no longer lists it.",
                "Pending company account → Job Post submit → clear pending-verification error.",
            ],
        )
    )

    # ── 8. Phase 7 preview ─────────────────────────────────────────────
    story.append(p(s, "h1", "8. Phase 7 Preview — Swipe Engine"))
    story.append(
        p(
            s,
            "body",
            "After Phase 6, implement transactional swipe recording on open jobs "
            "(<font face='Courier'>swipes</font> table already exists), dedupe, optional undo window, "
            "and prepare mutual-right detection for the Matching phase. Discover UI swipe gestures become "
            "persistent API calls instead of local-only mock state.",
        )
    )

    story.append(Spacer(1, 12))
    story.append(hr())
    story.append(
        p(
            s,
            "meta",
            f"End of KUPC Phase 6 Specification · Generated {TODAY} · "
            "Implement milestones in order; update PHASE_6_DOCUMENTATION.md as each milestone ships.",
        )
    )

    return story


def main():
    styles = build_styles()
    path = OUT_DIR / OUT_FILE
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title="KUPC Phase 6 Specification — Job Posting & Discovery",
        author="KUPC Engineering",
    )
    doc.build(
        build_story(styles),
        onFirstPage=lambda c, d: add_footer(c, d, "Phase 6 Specification"),
        onLaterPages=lambda c, d: add_footer(c, d, "Phase 6 Specification"),
    )
    print(f"Wrote {path}")


if __name__ == "__main__":
    main()
