#!/usr/bin/env python3
"""
icon.png から Android プッシュ通知用アイコン (notification-icon.png) を生成する。

Android の通知アイコン要件:
  - 96x96 px
  - 白 (#FFFFFF) のシルエット
  - 透明背景
"""

from __future__ import annotations

import os
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_PATH = os.path.join(BASE_DIR, "assets", "images", "icon.png")
OUT_PATH = os.path.join(BASE_DIR, "assets", "images", "notification-icon.png")

SOURCE_SIZE = 1024
OUTPUT_SIZE = 96


def is_background(r: int, g: int, b: int, a: int) -> bool:
    if a < 16:
        return True
    # テラコッタ / 旧オレンジ背景。白いロゴ本体は残す。
    return r > 180 and 50 < g < 170 and b < 100


def make_notification_icon(src: Image.Image, source_size: int, output_size: int) -> Image.Image:
    src = src.convert("RGBA").resize((source_size, source_size), Image.LANCZOS)
    pixels = src.load()

    silhouette = Image.new("RGBA", (source_size, source_size), (0, 0, 0, 0))
    out = silhouette.load()

    for y in range(source_size):
        for x in range(source_size):
            r, g, b, a = pixels[x, y]
            if not is_background(r, g, b, a):
                out[x, y] = (255, 255, 255, 255)

    resized = silhouette.resize((output_size, output_size), Image.LANCZOS)
    # 縮小後のアンチエイリアス端を二値化（Android 通知アイコン向け）
    px = resized.load()
    for y in range(output_size):
        for x in range(output_size):
            if px[x, y][3] >= 128:
                px[x, y] = (255, 255, 255, 255)
            else:
                px[x, y] = (255, 255, 255, 0)

    return resized


def main() -> None:
    print(f"読み込み: {SRC_PATH}")
    src = Image.open(SRC_PATH)
    icon = make_notification_icon(src, SOURCE_SIZE, OUTPUT_SIZE)
    icon.save(OUT_PATH, "PNG")
    print(f"保存: {OUT_PATH} ({OUTPUT_SIZE}x{OUTPUT_SIZE})")


if __name__ == "__main__":
    main()
