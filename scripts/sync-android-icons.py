#!/usr/bin/env python3
"""
icon.png から Android 用アイコン (foreground / monochrome) を同期する。
"""

from __future__ import annotations

import os
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(BASE_DIR, "assets", "images")
SRC_PATH = os.path.join(IMG_DIR, "icon.png")

FOREGROUND_SIZE = 512


def is_background(r: int, g: int, b: int, a: int) -> bool:
    if a < 16:
        return True
    # テラコッタ / 旧オレンジ背景。白いロゴ本体は残す。
    return r > 180 and 50 < g < 170 and b < 100


def sync_foreground(src: Image.Image) -> None:
    out_path = os.path.join(IMG_DIR, "android-icon-foreground.png")
    src.resize((FOREGROUND_SIZE, FOREGROUND_SIZE), Image.BOX).save(out_path, "PNG")
    print(f"保存: {out_path}")


def sync_monochrome(src: Image.Image) -> None:
    out_path = os.path.join(IMG_DIR, "android-icon-monochrome.png")
    size = FOREGROUND_SIZE
    img = src.convert("RGBA").resize((size, size), Image.BOX)
    pixels = img.load()

    mono = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out = mono.load()
    for y in range(size):
        for x in range(size):
            r, g, b, a = pixels[x, y]
            if not is_background(r, g, b, a):
                out[x, y] = (255, 255, 255, 255)

    mono.save(out_path, "PNG")
    print(f"保存: {out_path}")


def sync_splash_icon(src: Image.Image) -> None:
    out_path = os.path.join(IMG_DIR, "splash-icon.png")
    src.resize((512, 512), Image.BOX).save(out_path, "PNG")
    print(f"保存: {out_path}")


def sync_favicon(src: Image.Image) -> None:
    out_path = os.path.join(IMG_DIR, "favicon.png")
    src.resize((48, 48), Image.BOX).save(out_path, "PNG")
    print(f"保存: {out_path}")


def main() -> None:
    src = Image.open(SRC_PATH)
    sync_foreground(src)
    sync_monochrome(src)
    sync_splash_icon(src)
    sync_favicon(src)


if __name__ == "__main__":
    main()
