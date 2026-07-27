# Builds "Robot Eval — User Guide.pdf": a plain-English, screenshot-driven
# guide to the platform for non-technical readers.
# Usage: python3 scripts/build-guide-pdf.py

from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle,
)
from PIL import Image as PILImage

# Embed real TrueType fonts so text renders in every PDF viewer.
FONTS = "/System/Library/Fonts/Supplemental"
pdfmetrics.registerFont(TTFont("Guide", f"{FONTS}/Arial.ttf"))
pdfmetrics.registerFont(TTFont("Guide-Bold", f"{FONTS}/Arial Bold.ttf"))
pdfmetrics.registerFont(TTFont("Guide-Italic", f"{FONTS}/Arial Italic.ttf"))
pdfmetrics.registerFontFamily(
    "Guide", normal="Guide", bold="Guide-Bold", italic="Guide-Italic", boldItalic="Guide-Bold"
)

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "guide-shots"
OUT = ROOT / "Robot Eval — User Guide.pdf"

TEAL = colors.HexColor("#157a6e")
DARK = colors.HexColor("#1a1b1d")
GREY = colors.HexColor("#52565c")
LIGHT_RULE = colors.HexColor("#e2e0da")

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Title"], fontName="Guide-Bold",
                    fontSize=26, textColor=DARK, spaceAfter=6, alignment=0)
H2 = ParagraphStyle("H2", parent=styles["Heading1"], fontName="Guide-Bold",
                    fontSize=16, textColor=DARK, spaceBefore=10, spaceAfter=6)
H3 = ParagraphStyle("H3", parent=styles["Heading2"], fontName="Guide-Bold",
                    fontSize=12, textColor=TEAL, spaceBefore=8, spaceAfter=4)
BODY = ParagraphStyle("Body", parent=styles["Normal"], fontName="Guide",
                      fontSize=10.5, leading=15, textColor=DARK, spaceAfter=6)
CAPTION = ParagraphStyle("Caption", parent=styles["Normal"], fontName="Guide-Italic",
                         fontSize=9, leading=12, textColor=GREY, spaceBefore=3, spaceAfter=10)
SUB = ParagraphStyle("Sub", parent=styles["Normal"], fontName="Guide",
                     fontSize=12, leading=17, textColor=GREY, spaceAfter=4)


def shot(name, width=6.9 * inch):
    """Image flowable scaled to width, preserving aspect ratio."""
    path = SHOTS / f"{name}.png"
    with PILImage.open(path) as im:
        w, h = im.size
    return Image(str(path), width=width, height=width * h / w)


def bullets(items):
    return [Paragraph(f"•&nbsp;&nbsp;{t}", BODY) for t in items]


story = []

# ── Cover ────────────────────────────────────────────────────────────────
story.append(Spacer(1, 40))
story.append(Paragraph("Robot Eval", H1))
story.append(Paragraph("A simple guide to using the platform — no technical background needed.", SUB))
story.append(Spacer(1, 18))
story.append(shot("overview"))
story.append(Paragraph("The Overview page — the first thing you see when you open Robot Eval.", CAPTION))
story.append(Spacer(1, 10))
story.append(Paragraph(
    "Robot Eval is a website that helps teams understand how well their robots are doing. "
    "Robots practice tasks — picking things up, cooking, plugging in cables — and every practice "
    "attempt is recorded on video. This platform collects all those recordings in one place so you "
    "can watch them, see which attempts worked, spot what keeps going wrong, and check whether the "
    "robot is getting better over time.", BODY))
story.append(PageBreak())

# ── Glossary ─────────────────────────────────────────────────────────────
story.append(Paragraph("Words you'll see (and what they really mean)", H2))
story.append(Paragraph(
    "The platform uses a few robotics words. Here is a plain-English translation of each one:", BODY))

glossary = [
    ["Word on screen", "What it means in plain English"],
    ["Episode", "One single attempt at a task, recorded on video. Like one 'take' in filming."],
    ["Dataset", "A collection of episodes that belong together — e.g. all attempts at making coffee."],
    ["Task", "What the robot was asked to do, e.g. 'Insert the cable into the port'."],
    ["Policy", "The robot's 'brain' — the software that decides its movements. Policies have\nversion numbers (like app updates), e.g. policy-v1.4.2."],
    ["human-teleop", "A person remotely steered the robot for that episode (no AI brain involved).\nTeams record these to teach the robot by example."],
    ["Rollout", "Another word for letting the robot attempt a task and recording it."],
    ["Success / Failure", "Whether the attempt worked. Judged automatically or by a person."],
    ["Unscored", "Nobody (and no software) has judged this attempt yet — the video exists,\nbut it hasn't been marked as success or failure."],
    ["Failure category", "The kind of mistake, e.g. 'Grasp slipped' (dropped its grip) or 'Collision'\n(bumped into something)."],
    ["Success rate", "Out of the attempts that were judged, the percentage that worked."],
    ["Benchmark pack", "A themed group of tasks used to test robots, e.g. tabletop object handling."],
    ["Embodiment", "Which physical robot was used — its model and body type."],
    ["DoF", "'Degrees of freedom' — how many joints the robot can move. More joints,\nmore dexterity. A human arm has 7."],
    ["Sensors / cameras", "The robot's 'eyes' — e.g. a wrist camera or an overhead camera."],
    ["Coverage", "How complete the recorded information is for an episode (100% = nothing missing)."],
    ["Adapter", "A translator that lets the platform read recordings from any robot software."],
    ["Source format", "Which recording system the data originally came from (LeRobot, ROS 2, etc.)."],
    ["Duration", "How long the attempt took, in seconds."],
    ["Interventions", "How many times a person had to step in and help mid-attempt."],
]
tbl = Table(glossary, colWidths=[1.55 * inch, 5.35 * inch])
tbl.setStyle(TableStyle([
    ("FONTNAME", (0, 0), (-1, 0), "Guide-Bold"),
    ("FONTNAME", (0, 1), (0, -1), "Guide-Bold"),
    ("FONTNAME", (1, 1), (1, -1), "Guide"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("LEADING", (0, 0), (-1, -1), 12),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("BACKGROUND", (0, 0), (-1, 0), TEAL),
    ("TEXTCOLOR", (0, 1), (0, -1), TEAL),
    ("TEXTCOLOR", (1, 1), (1, -1), DARK),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("LINEBELOW", (0, 0), (-1, -2), 0.4, LIGHT_RULE),
]))
story.append(tbl)
story.append(PageBreak())

# ── Overview page ────────────────────────────────────────────────────────
story.append(Paragraph("Page 1 — Overview: the health dashboard", H2))
story.append(shot("overview"))
story.append(Paragraph("The Overview page summarises everything in one glance.", CAPTION))
story.extend(bullets([
    "<b>The four big numbers</b> at the top show: how many attempts are stored, what share of the "
    "judged ones succeeded, how long a typical attempt takes, and how often robots bump into things.",
    "<b>The red banner</b> appears automatically when a newer robot brain performs worse than the "
    "previous one — so problems are impossible to miss. Click 'Investigate in compare' to see details.",
    "<b>Rollouts by day</b> is a calendar chart: green = successful attempts, red = failed attempts, "
    "and the teal line tracks the success percentage day by day.",
    "<b>Failures by category</b> counts each kind of mistake. Clicking any row jumps straight to the "
    "matching videos.",
    "<b>Datasets</b> lists every collection of recordings loaded into the platform, including real "
    "public recordings from Stanford's Mobile ALOHA robot and others.",
    "<b>Recent episodes</b> shows the newest attempts. Click any ID (like ep_00053) to watch it.",
]))
story.append(Paragraph(
    "Tip: almost everything on this page is clickable. If a number looks interesting, click it — "
    "you'll land on the exact list of attempts behind that number.", BODY))
story.append(PageBreak())

# ── Episodes page ────────────────────────────────────────────────────────
story.append(Paragraph("Page 2 — Episodes: browse and search every attempt", H2))
story.append(shot("episodes"))
story.append(Paragraph("The Episodes page — a searchable library of every recorded attempt.", CAPTION))
story.extend(bullets([
    "<b>Search box</b> (top right): type anything — a task like 'coffee', or an episode ID — and the "
    "list narrows as you type.",
    "<b>The grey buttons</b> under the heading ('Grasp slipped', 'Collision'…) are one-click shortcuts: "
    "press one to see every attempt that failed in that specific way. Press again to turn it off.",
    "<b>The left sidebar</b> has tick-boxes to narrow the list by dataset, recording system, robot-brain "
    "version, or task group. Tick several — they combine.",
    "<b>All / Success / Failure</b> buttons show everything, only wins, or only failures.",
    "<b>Clear all filters</b> resets everything with one click.",
    "Each row shows a small preview, the task, which robot, which brain version, the outcome, how long "
    "it took, and how complete the record is. <b>Click any row</b> to open the full episode.",
]))
story.append(Spacer(1, 4))
story.append(shot("episodes_filtered"))
story.append(Paragraph(
    "After pressing the 'Collision' button: the list shrinks to only collision failures, "
    "and the count updates (here: 12 of 366).", CAPTION))
story.append(PageBreak())

# ── Episode detail ───────────────────────────────────────────────────────
story.append(Paragraph("Page 3 — Episode detail: watch one attempt up close", H2))
story.append(shot("episode_detail_real"))
story.append(Paragraph(
    "A real episode: Stanford's Mobile ALOHA robot cooking shrimp, streamed from the public dataset.",
    CAPTION))
story.extend(bullets([
    "<b>Video player</b>: press play to watch the robot's own camera footage of this exact attempt.",
    "<b>Grey labels under the video</b> list the robot's cameras for this recording.",
    "<b>Action &amp; state timeline</b>: a wave-style picture of the robot's movements over time "
    "(marked 'synthetic preview' when real sensor traces aren't loaded yet).",
    "<b>Outcome</b> (right column): whether it worked, and importantly <i>how that was decided</i> — "
    "by software, by a person, or 'Unscored' if not judged yet.",
    "<b>Metrics</b>: duration, how often a person stepped in, and any collisions.",
    "<b>Embodiment</b>: which robot body did the work.",
    "<b>Provenance</b>: where this recording came from and how complete it is.",
]))
story.append(Spacer(1, 4))
story.append(shot("episode_detail_failure"))
story.append(Paragraph(
    "A failed attempt: the red 'Failure' badge is automatic, and the timeline highlights the moment "
    "things went wrong in red — 'Anomaly at ~4.7s'.", CAPTION))
story.append(PageBreak())

# ── Compare page ─────────────────────────────────────────────────────────
story.append(Paragraph("Page 4 — Compare: is the new robot brain better?", H2))
story.append(shot("compare"))
story.append(Paragraph(
    "Compare puts two robot-brain versions side by side, like a before-and-after report.", CAPTION))
story.extend(bullets([
    "<b>Baseline and Candidate</b> drop-downs (top): pick the older version and the newer one you "
    "want to judge.",
    "<b>The four tiles</b> show the newer version's numbers, with green ▲ for improvements and red ▼ "
    "for regressions compared to the older version.",
    "<b>Failures by category</b> shows whether each kind of mistake got more or less common.",
    "<b>Regressions by task</b> is the heart of the page: tasks are sorted worst-first, so the biggest "
    "new problem is always the first row. 'View episodes' jumps to the actual videos so you can see "
    "the failures with your own eyes.",
]))
story.append(Paragraph("Everyday touches", H3))
story.extend(bullets([
    "<b>Light / dark mode</b>: the sun/moon button at the bottom of the left sidebar switches the look. "
    "Your choice is remembered.",
    "<b>Shareable links</b>: the web address updates as you filter. Copy it, send it to a colleague, "
    "and they'll see exactly the same filtered view.",
    "<b>Real public data</b>: the platform streams real robot recordings directly from Hugging Face "
    "(a public library of robot data) — including Stanford's Mobile ALOHA cooking robot, an industrial "
    "cable-plugging arm, and a coffee-making robot.",
]))
story.append(Spacer(1, 8))
story.append(Paragraph(
    "That's everything. If you can browse an online video library and read a scoreboard, "
    "you can use Robot Eval.", BODY))

doc = SimpleDocTemplate(str(OUT), pagesize=letter,
                        leftMargin=0.7 * inch, rightMargin=0.7 * inch,
                        topMargin=0.65 * inch, bottomMargin=0.65 * inch,
                        title="Robot Eval — User Guide")
doc.build(story)
print("wrote", OUT)
