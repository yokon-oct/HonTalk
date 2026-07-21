#!/usr/bin/env python3
"""
icon.png のロゴ部分（白いシルエット）を抽出し、
#C0522A の単色背景＋角丸マスクで新しいロゴを生成するスクリプト。
"""

from PIL import Image, ImageDraw
import os

# パス設定
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_PATH = os.path.join(BASE_DIR, "assets", "images", "icon.png")
OUT_PATH = os.path.join(BASE_DIR, "assets", "images", "hontalk-logo-rounded.png")

# 設定
SIZE = 1024          # 出力サイズ (px)
BG_COLOR = (192, 82, 42, 255)   # #C0522A
RADIUS_RATIO = 0.22  # 角丸半径（サイズに対する比率）

def make_rounded_mask(size, radius):
    """角丸の白マスクを生成"""
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask

def extract_white_logo(img: Image.Image, size: int) -> Image.Image:
    """
    元画像から白いロゴ部分だけを RGBA で抽出する。
    背景（グラデーション）は除去し、白いシルエットだけ残す。
    """
    img = img.convert("RGBA").resize((size, size), Image.LANCZOS)
    pixels = img.load()

    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    res_px = result.load()

    for y in range(size):
        for x in range(size):
            r, g, b, a = pixels[x, y]
            # 白に近いピクセルだけ残す
            brightness = (r + g + b) / 3
            whiteness = min(r, g, b)
            if whiteness > 160 and brightness > 180:
                # アルファを明るさに応じて調整
                alpha = int(min(255, (whiteness - 160) * (255 / 95)))
                res_px[x, y] = (255, 255, 255, alpha)

    return result

def main():
    print(f"読み込み中: {SRC_PATH}")
    src = Image.open(SRC_PATH)

    radius = int(SIZE * RADIUS_RATIO)

    # 1. 背景レイヤー（#C0522A の単色）
    background = Image.new("RGBA", (SIZE, SIZE), BG_COLOR)

    # 2. 元画像から白いロゴを抽出
    logo_layer = extract_white_logo(src, SIZE)

    # 3. 背景にロゴを合成
    combined = Image.alpha_composite(background, logo_layer)

    # 4. 角丸マスクを適用
    mask = make_rounded_mask(SIZE, radius)
    combined.putalpha(mask)

    # 5. 保存
    combined.save(OUT_PATH, "PNG")
    print(f"保存完了: {OUT_PATH}")
    print(f"  サイズ: {SIZE}x{SIZE}px")
    print(f"  背景色: #C0522A")
    print(f"  角丸半径: {radius}px ({int(RADIUS_RATIO*100)}%)")

if __name__ == "__main__":
    main()
