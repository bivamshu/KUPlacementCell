"""Render PHASE_4_DOCUMENTATION.md to a well-formatted PDF."""
from __future__ import annotations

import re
from pathlib import Path

import markdown
from xhtml2pdf import pisa

ROOT = Path(__file__).resolve().parents[1]
DOC_DIR = ROOT / "documentation"
MD_PATH = DOC_DIR / "PHASE_4_DOCUMENTATION.md"
PDF_PATH = DOC_DIR / "PHASE_4_DOCUMENTATION.pdf"

CSS = """
@page {
  size: A4;
  margin: 1.8cm 1.6cm 2.0cm 1.6cm;
  @frame footer {
    -pdf-frame-content: footerContent;
    bottom: 0.6cm;
    margin-left: 1.6cm;
    margin-right: 1.6cm;
    height: 1.0cm;
  }
}

body {
  font-family: Helvetica, Arial, sans-serif;
  font-size: 10pt;
  line-height: 1.45;
  color: #1a1a1a;
}

h1 {
  font-size: 18pt;
  color: #0f2744;
  border-bottom: 2pt solid #0f2744;
  padding-bottom: 4pt;
  margin-top: 18pt;
  margin-bottom: 10pt;
  page-break-before: always;
}

h1.title-page {
  page-break-before: avoid;
  font-size: 22pt;
  border-bottom: 3pt solid #0f2744;
  margin-top: 0;
}

h2 {
  font-size: 13pt;
  color: #163a5f;
  margin-top: 16pt;
  margin-bottom: 6pt;
  border-bottom: 0.75pt solid #c5d0dc;
  padding-bottom: 2pt;
}

h3 {
  font-size: 11pt;
  color: #1f4b73;
  margin-top: 12pt;
  margin-bottom: 4pt;
}

p, li {
  font-size: 10pt;
  text-align: justify;
}

strong { color: #0f2744; }

code, pre {
  font-family: Courier, monospace;
  font-size: 8.5pt;
}

code {
  background-color: #f0f3f6;
  padding: 1pt 2pt;
}

pre {
  background-color: #f4f6f8;
  border: 0.5pt solid #d0d7de;
  padding: 8pt;
  margin: 8pt 0;
  white-space: pre-wrap;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 8pt 0 12pt 0;
  font-size: 9pt;
}

th {
  background-color: #0f2744;
  color: #ffffff;
  text-align: left;
  padding: 5pt 6pt;
  font-weight: bold;
}

td {
  border: 0.5pt solid #c5d0dc;
  padding: 4pt 6pt;
  vertical-align: top;
}

tr:nth-child(even) td {
  background-color: #f7f9fb;
}

blockquote {
  border-left: 3pt solid #163a5f;
  margin-left: 0;
  padding-left: 10pt;
  color: #333;
}

ul, ol {
  margin-top: 4pt;
  margin-bottom: 8pt;
}

.meta {
  background-color: #eef3f8;
  border: 0.5pt solid #c5d0dc;
  padding: 10pt 12pt;
  margin-bottom: 14pt;
}

.footer {
  font-size: 8pt;
  color: #666;
  text-align: center;
  border-top: 0.5pt solid #c5d0dc;
  padding-top: 4pt;
}

.cover-sub {
  font-size: 11pt;
  color: #445;
  margin-top: 6pt;
}
"""


def md_to_html(md_text: str) -> str:
    # Avoid broken HTML from literal &lt; in markdown source
    md_text = md_text.replace("&lt;", "<").replace("&gt;", ">")

    body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "sane_lists", "nl2br"],
    )

    # Promote first h1 as title-page class
    body = re.sub(
        r"<h1>(.*?)</h1>",
        r'<h1 class="title-page">\1</h1>',
        body,
        count=1,
        flags=re.DOTALL,
    )

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>KUPC Phase 4 — Resume Upload &amp; AI Analysis</title>
  <style>{CSS}</style>
</head>
<body>
  <div class="meta">
    <strong>Kathmandu University Placement Connect (KUPC)</strong><br/>
    <span class="cover-sub">Phase 4 Specification — Resume Upload &amp; AI Analysis</span><br/>
    Status: Planned &nbsp;|&nbsp; Date: 2026-07-11 &nbsp;|&nbsp; Depends on: Phase 3 (complete)
  </div>
  {body}
  <div id="footerContent" class="footer">
    KUPC Phase 4 Specification &mdash; Confidential project documentation &mdash; Page
    <pdf:pagenumber/> / <pdf:pagecount/>
  </div>
</body>
</html>
"""


def main() -> None:
    md_text = MD_PATH.read_text(encoding="utf-8")
    html_doc = md_to_html(md_text)

    PDF_PATH.parent.mkdir(parents=True, exist_ok=True)
    with PDF_PATH.open("wb") as out:
        result = pisa.CreatePDF(html_doc, dest=out, encoding="utf-8")

    if result.err:
        raise SystemExit(f"PDF generation failed with {result.err} error(s)")

    print(f"Wrote {PDF_PATH} ({PDF_PATH.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
