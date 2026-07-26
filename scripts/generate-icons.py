"""生成 Yoai PWA icon — 暖色背景 + emoji
使用: python3 scripts/generate-icons.py
"""
from PIL import Image, ImageDraw, ImageFont
import os

# Yoai 配色 — cocoa-500: #8a6b4d
BG_COLOR = (138, 107, 77)  # rgb
TEXT_COLOR = (253, 250, 246)  # cream-50

# 嘗試找一個 emoji 字體(macOS 自帶)
FONT_CANDIDATES = [
    "/System/Library/Fonts/Apple Color Emoji.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial.ttf",
]

def find_font():
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return path
    return None

def generate_icon(size, output_path):
    img = Image.new("RGB", (size, size), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 圓角 (簡單用 mask)
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    radius = int(size * 0.22)
    mask_draw.rounded_rectangle([(0, 0), (size, size)], radius=radius, fill=255)
    img.putalpha(mask)

    # 文字
    font_path = find_font()
    if font_path:
        # 對於 emoji 字體,emoji 字號用 size 的 50%
        try:
            font = ImageFont.truetype(font_path, int(size * 0.5))
        except Exception:
            font = ImageFont.load_default()
    else:
        font = ImageFont.load_default()

    text = "🌿"
    # 計算居中位置
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) // 2 - bbox[0]
    y = (size - text_h) // 2 - bbox[1]
    draw.text((x, y), text, fill=TEXT_COLOR, font=font)

    img.save(output_path, "PNG")
    print(f"✓ {output_path} ({size}x{size})")

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
    os.makedirs(out_dir, exist_ok=True)
    generate_icon(192, os.path.join(out_dir, "icon-192.png"))
    generate_icon(512, os.path.join(out_dir, "icon-512.png"))
    # 也生一個 favicon
    generate_icon(64, os.path.join(out_dir, "favicon-64.png"))
    # 蘋果 touch icon
    generate_icon(180, os.path.join(out_dir, "apple-touch-icon.png"))
    print("Done!")
