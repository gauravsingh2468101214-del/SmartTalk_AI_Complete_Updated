from PIL import Image, ImageDraw
from pathlib import Path
import math

folder = Path("knowledge_base/images")
files = sorted(folder.glob("page_29_img_*"))

if not files:
    print("Page 29 ki images nahi mili.")
else:
    cell_w, cell_h = 240, 200
    columns = 3
    rows = math.ceil(len(files) / columns)

    sheet = Image.new("RGB", (columns * cell_w, rows * cell_h), "white")
    draw = ImageDraw.Draw(sheet)

    for i, file in enumerate(files):
        img = Image.open(file).convert("RGB")
        img.thumbnail((220, 155))

        x = (i % columns) * cell_w
        y = (i // columns) * cell_h

        sheet.paste(img, (x + 10, y + 35))
        draw.text((x + 10, y + 10), file.name, fill="black")

    output = folder / "page_29_contact_sheet.jpg"
    sheet.save(output)
    print("Contact sheet created:", output)
