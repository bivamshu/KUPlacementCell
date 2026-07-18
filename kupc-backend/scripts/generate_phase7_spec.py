"""
Generate KUPC Phase 7 Specification PDF — Swipe Engine.
Same formatting style as KUPC_Phase6_Specification.pdf.
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
OUT_FILE = "KUPC_Phase7_Specification.pdf"
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


def make_table(data, col_widths=None, header=True):
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
    return HRFlowable(
        width="100%", thickness=1, color=colors.HexColor("#BFDBFE"), spaceBefore=4, spaceAfter=8
    )


def section_exit(styles, items: list[tuple[str, str]]):
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
    story.append(p(s, "title", "KUPC Phase 7 Specification"))
    story.append(
        p(
            s,
            "subtitle",
            "Swipe Engine<br/>"
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
                ["Phase", "7 — Swipe Engine"],
                [
                    "Depends on",
                    "Phase 2 (Auth), Phase 3B (<font face='Courier'>swipes</font> / "
                    "<font face='Courier'>matches</font> schema &amp; repos), Phase 6 (open jobs feed + Discover UI)",
                ],
                ["Feeds into", "Phase 8+ — Chat / conversations; richer Matching UX; notifications"],
                ["Repos", "kupc-backend + frontend (monorepo)"],
                ["Audience", "Backend engineers, frontend engineers, technical reviewers"],
                [
                    "References",
                    "Backend Spec v2.0; PHASE_3B_DOCUMENTATION.md; PHASE_6_DOCUMENTATION.md; "
                    "KUPC_Phase6_Specification.pdf; frontend/INTEGRATION.md",
                ],
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
            "Turn Discover swipe gestures into durable product behavior: students record "
            "<b>left</b> (pass) or <b>right</b> (interest) decisions on open jobs; already-swiped "
            "jobs leave the deck; companies can see inbound interest and reciprocate to create a "
            "<b>match</b>. Replace local-only Discover swipe state "
            "(<font face='Courier'>// MOCK: Phase 7</font>) with live APIs backed by Phase 3B "
            "<font face='Courier'>swipes</font> and <font face='Courier'>matches</font> tables.",
        )
    )
    story.append(
        p(
            s,
            "body",
            "<b>Phase 6</b> answered: <i>How does a company post a job, and how does a student find it?</i><br/>"
            "<b>Phase 7</b> answers: <i>How does a student express interest, and when does that become a match?</i>",
        )
    )

    # ── 2. Why ─────────────────────────────────────────────────────────
    story.append(p(s, "h1", "2. Why This Phase Now"))
    story.extend(
        bullets(
            s,
            [
                "Phase 6 shipped open-job discovery; Discover still advances a local deck without writing "
                "<font face='Courier'>swipes</font> — reloads reshuffle the same cards.",
                "<font face='Courier'>swipes.repository.ts</font> and <font face='Courier'>matches.repository.ts</font> "
                "already exist (Phase 3B) — Phase 7 adds the HTTP module and UI wiring, not new core tables.",
                "Seed data already creates sample swipes/matches; product paths must match that model "
                "(student right-swipe + company reciprocation → match).",
                "Chat (conversations/messages) stays out of scope until matches are created by real user actions.",
            ],
        )
    )

    # ── 3. Scope ───────────────────────────────────────────────────────
    story.append(p(s, "h1", "3. Scope &amp; Milestones"))
    story.append(
        make_table(
            [
                ["ID", "Side", "Topic", "Outcome"],
                ["B1", "Backend", "Swipes module scaffold", "Routes, Zod, DTOs, auth gates; stubs until B2"],
                ["B2", "Backend", "Record swipe + feed exclusion", "POST swipe; Discover omits swiped job IDs"],
                ["B3", "Backend", "Undo (optional window)", "Delete/reverse recent swipe within TTL if adopted"],
                ["B4", "Backend", "Company interest + match", "List right-swipes on own jobs; reciprocate → match"],
                ["B5", "Backend", "Matches read APIs", "Student/company list own matches (no chat yet)"],
                ["B6", "Backend", "Swagger + test matrix", "OpenAPI + <font face='Courier'>test:phase7</font> green"],
                ["F1", "Frontend", "swipesApi + matchesApi", "Typed clients matching Phase 7 contracts"],
                ["F2", "Frontend", "Discover live swipe", "Like/Nope → API; deck excludes swiped"],
                ["F3", "Frontend", "Company interest inbox", "See students who liked a job; reciprocate"],
                ["F4", "Frontend", "Matches list (live)", "Replace mock Matches with API list"],
                ["F5", "Frontend", "Polish + docs", "INTEGRATION.md + PHASE_7_DOCUMENTATION.md"],
            ],
            col_widths=[1.4 * cm, 2.2 * cm, 5 * cm, 8.4 * cm],
        )
    )

    story.append(p(s, "h3", "3.1 Out of scope"))
    story.extend(
        bullets(
            s,
            [
                "Realtime chat / message sending UI (Phase 8+)",
                "Applicant kanban / application workflow",
                "Push notifications beyond optional match notification insert",
                "pgvector / semantic ranking of the deck",
                "Admin moderation of swipes",
                "Changing Phase 3 schema unless a documented gap is found (prefer repository extensions)",
            ],
        )
    )

    story.append(p(s, "h3", "3.2 Suggested order"))
    story.append(
        p(
            s,
            "body",
            "B1 → B2 → B5 (read matches) in parallel with F1. Then B4 + F2–F3. "
            "Optional B3 undo after B2 is stable. Finish B6 + F4–F5.",
        )
    )

    story.append(p(s, "h3", "3.3 Existing assets (do not reinvent)"))
    story.append(
        make_table(
            [
                ["Asset", "Location", "Role in Phase 7"],
                ["swipes table + UNIQUE", "Phase 3B migrations", "One decision per student/job"],
                ["matches table", "Phase 3B migrations", "Mutual interest outcome"],
                ["swipesRepository", "src/database/swipes.repository.ts", "create / list / find right-swipe"],
                ["matchesRepository", "src/database/matches.repository.ts", "create / list / findByTriple"],
                ["jobs feed", "Phase 6 jobs module", "Source deck; exclude swiped IDs"],
                ["Discover UI", "frontend DiscoverPage", "Replace local advance with API"],
                ["Seed swipes/matches", "scripts/seed.ts", "Demo data model reference"],
            ],
            col_widths=[4 * cm, 6 * cm, 7 * cm],
        )
    )

    # ── 4. API Contract ────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(p(s, "h1", "4. API Contract (Backend)"))
    story.append(
        p(
            s,
            "body",
            "All paths under <font face='Courier'>/api/v1</font>. Bearer JWT required. "
            "Responses use the existing envelope: "
            "<font face='Courier'>{ success, data, message, error }</font>. "
            "Wire naming remains <b>snake_case</b>.",
        )
    )

    story.append(p(s, "h2", "4.1 Student swipes"))
    story.append(
        make_table(
            [
                ["Method", "Path", "Auth", "Description"],
                [
                    "POST",
                    "/swipes",
                    "Student",
                    "Body: <font face='Courier'>{ job_id, direction: left|right }</font>. "
                    "Resolves company_id from job; rejects non-open / non-approved. Idempotent conflict → 409.",
                ],
                [
                    "DELETE",
                    "/swipes/:jobId",
                    "Student",
                    "Optional undo (B3). Only within configured window (e.g. 30s) if enabled; else 409.",
                ],
                [
                    "GET",
                    "/swipes/me",
                    "Student",
                    "Optional history list (debug / profile); not required for Discover MVP.",
                ],
            ],
            col_widths=[1.8 * cm, 3.5 * cm, 2.2 * cm, 9.5 * cm],
        )
    )

    story.append(p(s, "h2", "4.2 Discover feed (Phase 6 extension)"))
    story.append(
        p(
            s,
            "body",
            "<font face='Courier'>GET /jobs</font> must exclude job IDs already present in "
            "<font face='Courier'>swipes</font> for the authenticated student "
            "(use <font face='Courier'>swipesRepository.listJobIdsByStudent</font> + repository filter / "
            "<font face='Courier'>listOpenForFeed(excludeJobIds)</font>). "
            "Companies calling the feed are unchanged (no swipe exclusion).",
        )
    )

    story.append(p(s, "h2", "4.3 Company interest &amp; match"))
    story.append(
        make_table(
            [
                ["Method", "Path", "Auth", "Description"],
                [
                    "GET",
                    "/swipes/inbound",
                    "Company + verified",
                    "Right-swipes on the company’s open/closed jobs (student summary + job title).",
                ],
                [
                    "POST",
                    "/matches",
                    "Company + verified",
                    "Body: <font face='Courier'>{ job_id, student_id }</font>. "
                    "Requires existing student right-swipe; creates match if missing (idempotent).",
                ],
                [
                    "GET",
                    "/matches/me",
                    "Student or Company",
                    "List own matches with nested job + counterparty summary.",
                ],
            ],
            col_widths=[1.8 * cm, 3.8 * cm, 3 * cm, 8.4 * cm],
        )
    )

    story.append(p(s, "h2", "4.4 DTOs (illustrative)"))
    story.extend(
        bullets(
            s,
            [
                "<font face='Courier'>SwipeDto</font> — id, student_id, company_id, job_id, direction, swiped_at",
                "<font face='Courier'>MatchDto</font> — id, student_id, company_id, job_id, matched_at, "
                "nested <font face='Courier'>job</font> + <font face='Courier'>student</font> or "
                "<font face='Courier'>company</font> card",
                "<font face='Courier'>InboundSwipeDto</font> — swipe + student public summary + job title/status",
            ],
        )
    )

    story.append(p(s, "h2", "4.5 Error codes"))
    story.append(
        make_table(
            [
                ["Code", "HTTP", "When"],
                ["SWIPE_NOT_FOUND", "404", "Undo / lookup missing"],
                ["SWIPE_CONFLICT", "409", "Duplicate swipe (unique violation)"],
                ["SWIPE_JOB_NOT_OPEN", "409", "Job not open or company not approved"],
                ["SWIPE_UNDO_EXPIRED", "409", "Outside undo window"],
                ["MATCH_FORBIDDEN", "403", "Company does not own job / no right-swipe"],
                ["MATCH_NOT_FOUND", "404", "Match id missing"],
                ["INVALID_SWIPE_PAYLOAD", "400", "Zod validation"],
            ],
            col_widths=[4.5 * cm, 1.8 * cm, 10.7 * cm],
        )
    )

    # ── 5. Product rules ───────────────────────────────────────────────
    story.append(p(s, "h1", "5. Locked Product Rules"))
    story.extend(
        bullets(
            s,
            [
                "<b>One swipe per student per job</b> — enforced by DB unique "
                "(student_id, company_id, job_id); API returns 409 on replay.",
                "<b>Right ≠ match</b> — a student right-swipe alone does not create a match; "
                "company reciprocation (or an explicit Phase 7 match endpoint) does.",
                "<b>Feed hygiene</b> — after any swipe, that job never reappears on Discover for that student.",
                "<b>Save is independent</b> — Phase 6 saved_jobs remain bookmarks; swiping does not auto-save "
                "(unless product later chooses otherwise — out of Phase 7 default).",
                "<b>Match writes are server-owned</b> — clients never insert into matches via anon key; "
                "service_role through the module (same as Phase 3B RLS design).",
            ],
        )
    )

    # ── 6. Milestones detail ───────────────────────────────────────────
    story.append(PageBreak())
    story.append(p(s, "h1", "6. Milestone Details"))

    # B1
    story.append(p(s, "h2", "Milestone B1 — Swipes Module Scaffold"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Create <font face='Courier'>src/modules/swipes/</font> (and thin matches routes or "
            "sibling module) with contracts, validation, and auth gates. Handlers may return "
            "<font face='Courier'>501 NOT_IMPLEMENTED</font> until B2–B5. "
            "<b>Depends on:</b> Phase 2 auth, Phase 3B repos.",
        )
    )
    story.extend(
        steps(
            s,
            [
                "Add constants, types, Zod schemas, error codes, mapper stubs.",
                "Mount router under <font face='Courier'>/api/v1</font> (swipes + matches paths).",
                "Gate: student-only for POST /swipes; company+verified for inbound/match create.",
                "Add <font face='Courier'>phase7.scaffold.test.ts</font>; script "
                "<font face='Courier'>npm run test:phase7</font>.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Module mounted", "Routes reachable; 401 without token"),
                ("Role gates", "Company POST /swipes → 403"),
                ("Contracts typed", "DTOs match §4"),
            ],
        )
    )

    # B2
    story.append(p(s, "h2", "Milestone B2 — Record Swipe + Feed Exclusion"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Persist left/right swipes; Discover feed excludes swiped jobs for students.",
        )
    )
    story.extend(
        steps(
            s,
            [
                "Implement createSwipe: load job via jobsRepository; require status open + approved company; "
                "insert via swipesRepository.create.",
                "Map unique violation → SWIPE_CONFLICT.",
                "Update jobsService.listFeed for STUDENT viewers: "
                "excludeJobIds = listJobIdsByStudent(viewer.id).",
                "HTTP tests: swipe right → job absent from subsequent GET /jobs.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Swipe persists", "Row in swipes after POST"),
                ("Deck shrinks", "Swiped job not in feed"),
                ("Closed job blocked", "SWIPE_JOB_NOT_OPEN"),
            ],
        )
    )

    # B3
    story.append(p(s, "h2", "Milestone B3 — Undo Window (Optional)"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Allow DELETE of a swipe within a short TTL (config, e.g. 30 seconds) so Discover "
            "can offer “Undo”. If skipped, document as deferred and keep UI without undo.",
        )
    )
    story.extend(
        steps(
            s,
            [
                "Add repository deleteByStudentAndJob (or soft-delete if preferred — default hard delete).",
                "Service checks swiped_at + TTL; else SWIPE_UNDO_EXPIRED.",
                "If match already created from that swipe, refuse undo (409) or cascade policy — lock: refuse.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Undo works", "Within TTL, swipe gone and job may return to feed"),
                ("Expired blocked", "Outside TTL → 409"),
            ],
        )
    )

    # B4
    story.append(p(s, "h2", "Milestone B4 — Company Interest + Match Creation"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Verified companies list students who right-swiped their jobs and can create a match.",
        )
    )
    story.extend(
        steps(
            s,
            [
                "GET /swipes/inbound — filter direction=right, company_id=caller; join student public summary + job.",
                "POST /matches — verify job ownership; require findStudentRightSwipe; matchesRepository.create "
                "or return existing (idempotent).",
                "Optionally insert notifications (type=match) for both parties if notificationsRepository is ready.",
                "Do not open conversations here unless already trivial — prefer Phase 8 for chat thread creation "
                "(or create empty conversation row if seed model requires it; document the choice).",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Inbound list", "Company sees right-swipes on own jobs"),
                ("Match create", "POST creates matches row once"),
                ("Ownership", "Other company’s job → 403"),
            ],
        )
    )

    # B5
    story.append(p(s, "h2", "Milestone B5 — Matches Read APIs"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Students and companies list their matches with enough nested data for a Matches screen.",
        )
    )
    story.extend(
        steps(
            s,
            [
                "GET /matches/me — role-aware listByStudent / listByCompany.",
                "Map to MatchDto with job title + counterparty name/logo.",
                "No message history in this phase.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Student list", "Returns matches for seed/demo accounts"),
                ("Company list", "Symmetric"),
            ],
        )
    )

    # B6
    story.append(p(s, "h2", "Milestone B6 — Swagger, Hardening &amp; Test Matrix"))
    story.extend(
        steps(
            s,
            [
                "Document all §4 paths in swagger.ts.",
                "Add phase7.swagger + phase7.matrix tests; keep Express 5 query validation pattern "
                "(defineProperty, not Object.assign) from Phase 6 hotfix.",
                "Ensure test:phase6 still green.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("OpenAPI", "Swipe/match paths at /api/docs"),
                ("test:phase7", "Full suite green"),
            ],
        )
    )

    # F1–F5
    story.append(PageBreak())
    story.append(p(s, "h2", "Milestone F1 — swipesApi &amp; matchesApi"))
    story.extend(
        steps(
            s,
            [
                "Add types + clients under frontend/src/lib/api/.",
                "Map Phase 7 error codes in errorMessages.ts.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Clients export", "Importable from lib/api"),
                ("Types compile", "tsc clean"),
            ],
        )
    )

    story.append(p(s, "h2", "Milestone F2 — Discover Live Swipe"))
    story.extend(
        steps(
            s,
            [
                "Wire Discover Like/Nope (and drag end) to swipesApi.create.",
                "On success, advance deck; on conflict, treat as already swiped and skip.",
                "Refetch or locally filter so swiped jobs do not return after refresh.",
                "Remove or rewrite <font face='Courier'>// MOCK: Phase 7</font> comments on persistence.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Persist", "Reload does not re-show swiped job"),
                ("Errors", "ErrorBanner on failure"),
            ],
        )
    )

    story.append(p(s, "h2", "Milestone F3 — Company Interest Inbox"))
    story.extend(
        steps(
            s,
            [
                "New screen or section (e.g. under Applicants stub / new Interest route) listing inbound right-swipes.",
                "Action: Match → POST /matches; update row state.",
                "Link from Company Dashboard quick actions.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Inbox live", "Shows student interest"),
                ("Match action", "Creates match visible on /matches/me"),
            ],
        )
    )

    story.append(p(s, "h2", "Milestone F4 — Matches Page Live"))
    story.extend(
        steps(
            s,
            [
                "Replace prototype MatchesPage mock list with matchesApi.listMine.",
                "EmptyState when none; click-through to job detail where useful.",
                "Chat button may remain disabled with Phase 8 label.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("List live", "Seed/reciprocated matches appear"),
                ("Mock removed", "No hardcoded MATCHES array for data"),
            ],
        )
    )

    story.append(p(s, "h2", "Milestone F5 — Polish &amp; Documentation"))
    story.extend(
        steps(
            s,
            [
                "Update frontend/INTEGRATION.md live-vs-mock table (Discover swipe / Matches / Interest).",
                "Write kupc-backend/documentation/PHASE_7_DOCUMENTATION.md as milestones ship.",
                "Manual smoke: student swipe → company match → both see Matches.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Docs", "INTEGRATION + PHASE_7_DOCUMENTATION"),
                ("Smoke", "End-to-end path works on seed accounts"),
            ],
        )
    )

    # ── 7. Exit ────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(p(s, "h1", "7. Phase 7 Exit Checklist (Whole Phase)"))
    story.append(
        make_table(
            [
                ["#", "Criterion", "Owner"],
                ["1", "B1–B6 complete; npm run test:phase7 green", "Backend"],
                ["2", "Swagger documents swipe + match endpoints", "Backend"],
                ["3", "Student swipe persists; feed excludes that job after reload", "Both"],
                ["4", "Duplicate swipe → 409 SWIPE_CONFLICT", "Backend"],
                ["5", "Company inbound + reciprocate creates match", "Both"],
                ["6", "GET /matches/me works for student and company", "Both"],
                ["7", "Discover UI no longer local-only for swipe persistence", "Frontend"],
                ["8", "Matches screen not using mock MATCHES seed array", "Frontend"],
                ["9", "INTEGRATION.md + PHASE_7_DOCUMENTATION.md written", "Both"],
                ["10", "test:phase6 still green; frontend tsc clean", "Both"],
            ],
            col_widths=[1 * cm, 12 * cm, 4 * cm],
        )
    )

    story.append(p(s, "h2", "7.1 Manual smoke script"))
    story.extend(
        steps(
            s,
            [
                "Login seed.student.001 → Discover → Like (right) an open job.",
                "Refresh Discover → same job must not reappear.",
                "Login seed.company (job owner) → Interest inbox → Match that student.",
                "Both accounts → Matches → see the new match.",
                "Student tries to swipe same job again → conflict handled gracefully.",
                "Pending company must not access inbound/match mutating routes.",
            ],
        )
    )

    # ── 8. Preview ─────────────────────────────────────────────────────
    story.append(p(s, "h1", "8. Phase 8 Preview — Chat &amp; Conversations"))
    story.append(
        p(
            s,
            "body",
            "After Phase 7, open conversation threads per match "
            "(<font face='Courier'>conversations</font> / <font face='Courier'>messages</font> already in Phase 3B), "
            "wire the Chat UI, and optionally emit match notifications. "
            "Discover/Matches remain the entry points; Phase 7 must not invent ad-hoc chat APIs.",
        )
    )

    story.append(Spacer(1, 12))
    story.append(hr())
    story.append(
        p(
            s,
            "meta",
            f"End of KUPC Phase 7 Specification · Generated {TODAY} · "
            "Implement milestones in order; update PHASE_7_DOCUMENTATION.md as each milestone ships.",
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
        title="KUPC Phase 7 Specification — Swipe Engine",
        author="KUPC Engineering",
    )
    doc.build(
        build_story(styles),
        onFirstPage=lambda c, d: add_footer(c, d, "Phase 7 Specification"),
        onLaterPages=lambda c, d: add_footer(c, d, "Phase 7 Specification"),
    )
    print(f"Wrote {path}")


if __name__ == "__main__":
    main()
