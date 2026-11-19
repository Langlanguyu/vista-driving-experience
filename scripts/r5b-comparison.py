"""Compose matched Chrome captures; crops use identical source rectangles in each mode."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
evidence = Path("docs/verification/round5b")
try:
    font = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 22)
except OSError:
    font = ImageFont.load_default()
modes = ["normal", "current", "pannini", "structure"]
sheet = Image.new("RGB", (1280, 856), "#172121")
labels = ImageDraw.Draw(sheet)
for i, mode in enumerate(modes):
    source = Image.open(evidence / f"projection-{mode}.png")
    x, y = i % 2 * 640, i // 2 * 428
    sheet.paste(source.resize((640, 400)), (x, y))
    name = "STRUCTURE-AWARE" if mode == "structure" else mode.upper()
    labels.text((x+10, y+399), name, font=font, fill="#f4f4df")
sheet.save(evidence / "projection-comparison.jpg", quality=91)
details = Image.new("RGB", (1080, 750), "#172121")
labels = ImageDraw.Draw(details)
for i, mode in enumerate(modes[1:]):
    source = Image.open(evidence / f"projection-{mode}.png")
    y = i * 250
    details.paste(source.crop((0, 100, 720, 310)), (0, y+35))
    details.paste(source.crop((0, 431, 180, 536)).resize((360, 210)), (720, y+35))
    labels.text((12, y+4), mode.upper()+"   /   BRIDGE", font=font, fill="#f4f4df")
    labels.text((734, y+4), "CROSS TRAFFIC   /   2x", font=font, fill="#f4f4df")
details.save(evidence / "geometry-detail.jpg", quality=94)
