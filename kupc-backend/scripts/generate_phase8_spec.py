"""
Generate KUPC Phase 8 Specification PDF — Chat & Conversations.
Same formatting style as KUPC_Phase7_Specification.pdf.
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
OUT_FILE = "KUPC_Phase8_Specification.pdf"
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
    story.append(p(s, "title", "KUPC Phase 8 Specification"))
    story.append(
        p(
            s,
            "subtitle",
            "Chat &amp; Conversations<br/>"
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
                ["Phase", "8 — Chat &amp; Conversations"],
                [
                    "Depends on",
                    "Phase 2 (Auth), Phase 3B (<font face='Courier'>conversations</font> / "
                    "<font face='Courier'>messages</font> / <font face='Courier'>notifications</font> "
                    "schema &amp; repos), Phase 7 (matches exist from real swipe + reciprocation)",
                ],
                [
                    "Feeds into",
                    "Later — richer notifications UX; optional realtime transport upgrades; "
                    "admin moderation of abuse reports",
                ],
                ["Repos", "kupc-backend + frontend (monorepo)"],
                ["Audience", "Backend engineers, frontend engineers, technical reviewers"],
                [
                    "References",
                    "PHASE_3B_DOCUMENTATION.md; PHASE_7_DOCUMENTATION.md; "
                    "KUPC_Phase7_Specification.pdf; frontend/INTEGRATION.md; "
                    "<font face='Courier'>conversations.repository.ts</font> / "
                    "<font face='Courier'>messages.repository.ts</font>",
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
            "Turn a <b>match</b> into a durable 1:1 conversation: after a company reciprocates a "
            "student right-swipe, both parties can open a thread, exchange messages, and see "
            "read state. Replace the prototype Chat screen "
            "(hardcoded <font face='Courier'>MESSAGES</font> / <font face='Courier'>MATCHES</font> "
            "sidebar) and enable the Matches “Chat (Phase 8)” control.",
        )
    )
    story.append(
        p(
            s,
            "body",
            "<b>Phase 7</b> answered: <i>How does interest become a match?</i><br/>"
            "<b>Phase 8</b> answers: <i>How do matched parties talk about the role?</i>",
        )
    )

    # ── 2. Why ─────────────────────────────────────────────────────────
    story.append(p(s, "h1", "2. Why This Phase Now"))
    story.extend(
        bullets(
            s,
            [
                "Phase 7 shipped live Matches without messaging — the hiring loop stops at a badge.",
                "Phase 3B already provides <font face='Courier'>conversations</font> (1:1 per "
                "<font face='Courier'>match_id</font>), <font face='Courier'>messages</font>, "
                "RLS participant policies, and repositories "
                "(<font face='Courier'>createForMatch</font>, <font face='Courier'>listByConversation</font>, "
                "<font face='Courier'>markRead</font>).",
                "Seed data already creates ~25 conversations with opener messages — product paths "
                "must match that model (match-scoped threads only).",
                "Realtime WebSockets are <b>not</b> required for MVP; HTTP list + send + short-interval "
                "polling is enough for a campus demo, with SSE/WebSocket as an optional stretch.",
            ],
        )
    )

    # ── 3. Scope ───────────────────────────────────────────────────────
    story.append(p(s, "h1", "3. Scope &amp; Milestones"))
    story.append(
        make_table(
            [
                ["ID", "Side", "Topic", "Outcome"],
                [
                    "B1",
                    "Backend",
                    "Chat module scaffold",
                    "Routes, Zod, DTOs, auth gates under "
                    "<font face='Courier'>/conversations</font> (+ messages); stubs until B2/B3",
                ],
                [
                    "B2",
                    "Backend",
                    "Ensure conversation + list mine",
                    "Get-or-create by <font face='Courier'>match_id</font>; list threads for student/company",
                ],
                [
                    "B3",
                    "Backend",
                    "Send / list / mark-read messages",
                    "Participant-only send &amp; history; optional mark read",
                ],
                [
                    "B4",
                    "Backend",
                    "Match → conversation hook",
                    "Idempotent ensure on <font face='Courier'>POST /matches</font> (or document lazy-only)",
                ],
                [
                    "B5",
                    "Backend",
                    "Notifications (optional)",
                    "Insert <font face='Courier'>type=message</font> (and/or match) via "
                    "<font face='Courier'>notificationsRepository</font>",
                ],
                [
                    "B6",
                    "Backend",
                    "Swagger + test matrix",
                    "OpenAPI + <font face='Courier'>test:phase8</font> green",
                ],
                [
                    "F1",
                    "Frontend",
                    "conversationsApi + messagesApi",
                    "Typed clients matching Phase 8 contracts",
                ],
                [
                    "F2",
                    "Frontend",
                    "Matches → Chat entry",
                    "Enable Chat on match cards; deep-link "
                    "<font face='Courier'>/app/chat?matchId=…</font> (or conversation id)",
                ],
                [
                    "F3",
                    "Frontend",
                    "Live Chat page",
                    "Replace mock sidebar + thread with API list/send; polling refresh",
                ],
                [
                    "F4",
                    "Frontend",
                    "Notifications polish (optional)",
                    "Surface unread / deep-link if B5 ships",
                ],
                [
                    "F5",
                    "Frontend",
                    "Polish + docs",
                    "INTEGRATION.md + PHASE_8_DOCUMENTATION.md; whole-phase smoke",
                ],
            ],
            col_widths=[1.4 * cm, 2.2 * cm, 4.5 * cm, 8.9 * cm],
        )
    )

    story.append(p(s, "h3", "3.1 Out of scope"))
    story.extend(
        bullets(
            s,
            [
                "Group chats, file attachments, voice/video calls",
                "Typing indicators / presence (may stay cosmetic mock)",
                "End-to-end encryption",
                "Admin message moderation tooling (reports table exists — later)",
                "Changing Phase 3 schema unless a documented gap is found (prefer repository extensions)",
                "Reopening Phase 7 swipe/match product rules",
            ],
        )
    )

    story.append(p(s, "h3", "3.2 Suggested order"))
    story.append(
        p(
            s,
            "body",
            "<b>B1 → B2 → B3 → B4 → B6</b> on the backend (B5 optional in parallel after B3). "
            "Frontend may start <b>F1</b> as soon as B1 contracts are stable, then <b>F2–F3</b> after "
            "B2–B3, finish with <b>F5</b> (and <b>F4</b> only if B5 lands).",
        )
    )

    # ── 4. HTTP contracts ──────────────────────────────────────────────
    story.append(PageBreak())
    story.append(p(s, "h1", "4. HTTP Contracts (illustrative)"))
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

    story.append(p(s, "h2", "4.1 Conversations"))
    story.append(
        make_table(
            [
                ["Method", "Path", "Auth", "Description"],
                [
                    "GET",
                    "/conversations/me",
                    "Student or Company",
                    "List my threads: conversation + nested match job + counterparty summary + "
                    "last message preview + unread count (if cheap).",
                ],
                [
                    "POST",
                    "/conversations/ensure",
                    "Student or Company",
                    "Body: <font face='Courier'>{ match_id }</font>. "
                    "Caller must be a participant on the match. Returns existing conversation or "
                    "creates via <font face='Courier'>createForMatch</font> (idempotent).",
                ],
                [
                    "GET",
                    "/conversations/:id",
                    "Participant",
                    "Conversation detail + counterparty card (optional if list is enough).",
                ],
            ],
            col_widths=[1.8 * cm, 4.2 * cm, 3 * cm, 8 * cm],
        )
    )

    story.append(p(s, "h2", "4.2 Messages"))
    story.append(
        make_table(
            [
                ["Method", "Path", "Auth", "Description"],
                [
                    "GET",
                    "/conversations/:id/messages",
                    "Participant",
                    "Chronological messages. Query: "
                    "<font face='Courier'>limit</font> / <font face='Courier'>before</font> "
                    "(cursor optional; MVP may return full recent window).",
                ],
                [
                    "POST",
                    "/conversations/:id/messages",
                    "Participant",
                    "Body: <font face='Courier'>{ content }</font>. "
                    "Trimmed non-empty string; max length (e.g. 4000). "
                    "<font face='Courier'>sender_id</font> = auth user.",
                ],
                [
                    "POST",
                    "/conversations/:id/read",
                    "Participant",
                    "Mark peer messages as read (or mark all unread in thread). "
                    "Returns <font face='Courier'>{ updated: n }</font> or conversation summary.",
                ],
            ],
            col_widths=[1.8 * cm, 5 * cm, 2.5 * cm, 7.7 * cm],
        )
    )

    story.append(p(s, "h2", "4.3 DTOs (illustrative)"))
    story.extend(
        bullets(
            s,
            [
                "<font face='Courier'>ConversationDto</font> — id, match_id, created_at, nested "
                "<font face='Courier'>job</font> + counterparty "
                "(<font face='Courier'>student</font> or <font face='Courier'>company</font>), "
                "optional <font face='Courier'>last_message</font>, <font face='Courier'>unread_count</font>",
                "<font face='Courier'>MessageDto</font> — id, conversation_id, sender_id, content, "
                "sent_at, read_at",
                "<font face='Courier'>EnsureConversationBody</font> — <font face='Courier'>{ match_id }</font>",
                "<font face='Courier'>CreateMessageBody</font> — <font face='Courier'>{ content }</font>",
            ],
        )
    )

    story.append(p(s, "h2", "4.4 Error codes"))
    story.append(
        make_table(
            [
                ["Code", "HTTP", "When"],
                ["CONVERSATION_NOT_FOUND", "404", "Unknown id or not a participant"],
                ["CONVERSATION_FORBIDDEN", "403", "Match exists but caller is not a party"],
                ["MATCH_NOT_FOUND", "404", "ensure with invalid match_id"],
                ["MESSAGE_NOT_FOUND", "404", "mark-read / lookup missing"],
                ["INVALID_MESSAGE_PAYLOAD", "400", "Empty / oversized content"],
                ["INVALID_CONVERSATION_PAYLOAD", "400", "Zod validation"],
                ["NOT_IMPLEMENTED", "501", "Scaffold stubs until B2/B3"],
            ],
            col_widths=[5 * cm, 1.8 * cm, 10.2 * cm],
        )
    )

    # ── 5. Product rules ───────────────────────────────────────────────
    story.append(p(s, "h1", "5. Locked Product Rules"))
    story.extend(
        bullets(
            s,
            [
                "<b>One conversation per match</b> — unique <font face='Courier'>match_id</font>; "
                "never create a second thread for the same match.",
                "<b>Participants only</b> — student_id or company_id on the match (company user id = "
                "companies.id). Non-participants get 404/403 (prefer opaque 404 for enumeration).",
                "<b>No chat without a match</b> — Discover / Interest never open threads; Matches is "
                "the entry (or deep-link with match_id after ensure).",
                "<b>Service-role writes</b> — same as Phase 3B/7: feature modules use repositories + "
                "admin client; clients never insert via anon key.",
                "<b>Realtime MVP = polling</b> — Chat page polls messages every ~3–5s while focused "
                "(or on window focus). SSE/WebSocket is optional stretch, not a gate.",
                "<b>Eager vs lazy conversation</b> — <b>Lock:</b> support "
                "<font face='Courier'>POST /conversations/ensure</font> always; "
                "<b>also</b> call ensure (idempotent) from match create (B4) so seed-like data appears "
                "without opening Chat first.",
            ],
        )
    )

    story.append(p(s, "h3", "5.1 Repository gaps to close"))
    story.extend(
        bullets(
            s,
            [
                "Extend <font face='Courier'>conversationsRepository</font> with list-by-participant "
                "(student / company) joining matches — not present today (only "
                "<font face='Courier'>createForMatch</font> / finders).",
                "Optional: <font face='Courier'>messagesRepository.markAllUnreadForConversation</font> "
                "for peer messages; or loop <font face='Courier'>markRead</font>.",
                "Unread count: derive from messages where "
                "<font face='Courier'>sender_id ≠ me</font> and <font face='Courier'>read_at IS NULL</font>.",
            ],
        )
    )

    # ── 6. Milestones detail ───────────────────────────────────────────
    story.append(PageBreak())
    story.append(p(s, "h1", "6. Milestone Details"))

    # B1
    story.append(p(s, "h2", "Milestone B1 — Chat Module Scaffold &amp; Contracts"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Create <font face='Courier'>src/modules/conversations/</font> "
            "(messages nested under conversation routes or sibling module) with contracts, "
            "validation, and auth gates. Handlers may return "
            "<font face='Courier'>501 NOT_IMPLEMENTED</font> until B2–B3. "
            "<b>Depends on:</b> Phase 2 auth, Phase 3B repos.",
        )
    )
    story.extend(
        steps(
            s,
            [
                "Add constants, types, Zod schemas, errors, mappers, stub service, controller, routes.",
                "Mount at <font face='Courier'>/api/v1/conversations</font>.",
                "Static paths (<font face='Courier'>/me</font>, <font face='Courier'>/ensure</font>) "
                "before <font face='Courier'>/:id</font>.",
                "Authorize STUDENT | COMPANY on all routes; participant checks land in B2/B3.",
                "Add scaffold + mapper tests; <font face='Courier'>npm run test:phase8</font>.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Module exists", "conversations module files present"),
                ("Auth gates", "No token → 401; wrong role → 403"),
                ("Validation", "Empty ensure/message body → 400"),
                ("Stubs", "Valid calls → 501 until B2/B3"),
            ],
        )
    )

    # B2
    story.append(p(s, "h2", "Milestone B2 — Ensure Conversation + List Mine"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Participants can open/list threads for their matches.",
        )
    )
    story.extend(
        steps(
            s,
            [
                "Implement ensure: load match → verify participant → "
                "<font face='Courier'>findByMatchId</font> or <font face='Courier'>createForMatch</font>.",
                "Implement listMine: role-aware query of conversations via matches "
                "(extend repository as needed).",
                "Map nested job + counterparty like Phase 7 MatchDto cards.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Ensure idempotent", "Second ensure returns same conversation id"),
                ("Ownership", "Foreign match → 403/404"),
                ("List", "Student and company each see own threads"),
            ],
        )
    )

    # B3
    story.append(p(s, "h2", "Milestone B3 — Send / List / Mark-Read Messages"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> Full message history and send for participants.",
        )
    )
    story.extend(
        steps(
            s,
            [
                "GET messages ordered by <font face='Courier'>sent_at</font> ascending.",
                "POST message with auth user as sender; reject empty content.",
                "Mark-read endpoint updates peer messages’ "
                "<font face='Courier'>read_at</font>.",
                "Reuse Express 5 <font face='Courier'>defineProperty</font> validate pattern for query params.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Send", "201 MessageDto"),
                ("List", "Both participants see the same history"),
                ("Non-participant", "404/403"),
            ],
        )
    )

    # B4
    story.append(p(s, "h2", "Milestone B4 — Match Create Hook"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> After Phase 7 <font face='Courier'>POST /matches</font> succeeds "
            "(including idempotent return), ensure a conversation row exists.",
        )
    )
    story.extend(
        steps(
            s,
            [
                "From <font face='Courier'>matchesService.create</font>, after insert/return, "
                "call get-or-create conversation (ignore unique races).",
                "Do not fail the match if conversation ensure fails after match insert — "
                "log and rely on ensure endpoint; or fail closed if you prefer atomicity "
                "(document the choice in PHASE_8_DOCUMENTATION.md).",
                "<b>Preferred lock:</b> best-effort ensure; Chat can still call ensure.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("New match", "Conversation row exists (or ensure recreates)"),
                ("Idempotent match", "No duplicate conversations"),
            ],
        )
    )

    # B5
    story.append(p(s, "h2", "Milestone B5 — Notifications (Optional)"))
    story.append(
        p(
            s,
            "body",
            "<b>Goal:</b> When a message is sent, notify the other participant "
            "(<font face='Courier'>type=message</font>, payload with conversation_id / match_id). "
            "Optionally notify on match create (<font face='Courier'>type=match</font>) if not done earlier.",
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Insert", "Row in notifications for the peer"),
                ("Skip if deferred", "Document as out of Phase 8 MVP"),
            ],
        )
    )

    # B6
    story.append(p(s, "h2", "Milestone B6 — Swagger, Hardening &amp; Test Matrix"))
    story.extend(
        steps(
            s,
            [
                "Document all §4 paths in <font face='Courier'>swagger.ts</font>.",
                "Add <font face='Courier'>phase8.swagger</font> + "
                "<font face='Courier'>phase8.matrix</font> tests; "
                "<font face='Courier'>test:phase8</font> script.",
                "Keep <font face='Courier'>test:phase7</font> green.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("OpenAPI", "Conversation/message paths at /api/docs"),
                ("test:phase8", "Full suite green"),
            ],
        )
    )

    # F1–F5
    story.append(PageBreak())
    story.append(p(s, "h2", "Milestone F1 — conversationsApi &amp; messagesApi"))
    story.extend(
        steps(
            s,
            [
                "Add types + clients under <font face='Courier'>frontend/src/lib/api/</font>.",
                "Map Phase 8 error codes in <font face='Courier'>errorMessages.ts</font>.",
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

    story.append(p(s, "h2", "Milestone F2 — Matches → Chat Entry"))
    story.extend(
        steps(
            s,
            [
                "Replace disabled Chat button with navigation to Chat using "
                "<font face='Courier'>match_id</font> (call ensure on open if needed).",
                "Empty Matches still CTA to Discover / Interest as today.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Entry", "From Matches, Chat opens the right thread"),
                ("No match", "Cannot invent a conversation id"),
            ],
        )
    )

    story.append(p(s, "h2", "Milestone F3 — Live Chat Page"))
    story.extend(
        steps(
            s,
            [
                "Replace prototype ChatPage: sidebar from "
                "<font face='Courier'>GET /conversations/me</font>; "
                "thread from messages list; send via POST.",
                "Poll while tab focused; ErrorBanner on failure.",
                "Remove hardcoded MESSAGES / MATCHES usage from Chat (keep nowhere else unless documented).",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Send/receive", "Both seed accounts can converse on a match"),
                ("Mock removed", "No hardcoded message array for live Chat"),
            ],
        )
    )

    story.append(p(s, "h2", "Milestone F4 — Notifications Polish (Optional)"))
    story.extend(
        steps(
            s,
            [
                "If B5 ships: wire Notifications page subset or badge to "
                "<font face='Courier'>notificationsRepository</font> list API "
                "(may need a thin notifications module if none exists).",
                "Deep-link notification → Chat thread.",
            ],
        )
    )

    story.append(p(s, "h2", "Milestone F5 — Polish &amp; Documentation"))
    story.extend(
        steps(
            s,
            [
                "Update <font face='Courier'>frontend/INTEGRATION.md</font> live-vs-mock "
                "(Chat live; dashboards still mock).",
                "Write <font face='Courier'>kupc-backend/documentation/PHASE_8_DOCUMENTATION.md</font> "
                "as milestones ship.",
                "Manual smoke: match → both open Chat → exchange messages → refresh persists.",
            ],
        )
    )
    story.extend(
        section_exit(
            s,
            [
                ("Docs", "INTEGRATION + PHASE_8_DOCUMENTATION"),
                ("Smoke", "End-to-end path works on seed accounts"),
            ],
        )
    )

    # ── 7. Exit ────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(p(s, "h1", "7. Phase 8 Exit Checklist (Whole Phase)"))
    story.append(
        make_table(
            [
                ["#", "Criterion", "Owner"],
                ["1", "B1–B3 (and B4/B6) complete; npm run test:phase8 green", "Backend"],
                ["2", "Swagger documents conversation + message endpoints", "Backend"],
                ["3", "Ensure conversation is idempotent per match", "Backend"],
                ["4", "Only match participants can list/send messages", "Backend"],
                ["5", "Match create ensures conversation (or ensure recovers)", "Both"],
                ["6", "Matches Chat entry opens the correct thread", "Frontend"],
                ["7", "Chat page no longer uses hardcoded MESSAGES for data", "Frontend"],
                ["8", "Messages persist across refresh for both parties", "Both"],
                ["9", "INTEGRATION.md + PHASE_8_DOCUMENTATION.md written", "Both"],
                ["10", "test:phase7 still green; frontend tsc clean", "Both"],
            ],
            col_widths=[1 * cm, 12 * cm, 4 * cm],
        )
    )

    story.append(p(s, "h2", "7.1 Manual smoke script"))
    story.extend(
        steps(
            s,
            [
                "Login seed.student.001 → Discover → Like an open job owned by an approved seed company.",
                "Login that company → Interest → Match the student.",
                "Both accounts → Matches → Chat → ensure thread opens (same conversation).",
                "Student sends a message; company refreshes / polls → sees it; reply.",
                "Reload Chat → history still present.",
                "Non-participant JWT must not read that conversation id.",
                "Pending company still blocked from Match (Phase 7); no chat without match.",
            ],
        )
    )

    # ── 8. Preview ─────────────────────────────────────────────────────
    story.append(p(s, "h1", "8. After Phase 8"))
    story.append(
        p(
            s,
            "body",
            "Optional upgrades: SSE/WebSocket push, richer notification center, "
            "attachment uploads, and admin tools on <font face='Courier'>reports</font>. "
            "Do not expand chat into multi-party or job-broadcast channels without a new phase.",
        )
    )

    story.append(Spacer(1, 12))
    story.append(hr())
    story.append(
        p(
            s,
            "meta",
            f"End of KUPC Phase 8 Specification · Generated {TODAY} · "
            "Implement milestones in order; update PHASE_8_DOCUMENTATION.md as each milestone ships.",
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
        title="KUPC Phase 8 Specification — Chat & Conversations",
        author="KUPC Engineering",
    )
    doc.build(
        build_story(styles),
        onFirstPage=lambda c, d: add_footer(c, d, "Phase 8 Specification"),
        onLaterPages=lambda c, d: add_footer(c, d, "Phase 8 Specification"),
    )
    print(f"Wrote {path}")


if __name__ == "__main__":
    main()
