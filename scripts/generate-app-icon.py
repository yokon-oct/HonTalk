#!/usr/bin/env python3
"""
アプリアイコン (icon.png) を生成する。

iOS / Android のホーム画面表示向けに、ロゴ周りの余白を確保する。
"""

from __future__ import annotations

import os
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(BASE_DIR, "assets", "images")
MASTER_PATH = os.path.join(IMG_DIR, "icon-master.png")
OUT_PATH = os.path.join(IMG_DIR, "icon.png")

SIZE = 1024
# ロゴの表示サイズ比率（小さいほど余白が増える）
CONTENT_SCALE = 0.86
BG_COLOR = (250, 248, 245, 255)  # #FAF8F5


def generate_icon(src_path: str, out_path: str) -> None:
    src = Image.open(src_path).convert("RGBA")
    content_size = int(SIZE * CONTENT_SCALE)
    scaled = src.resize((content_size, content_size), Image.LANCZOS)

    canvas = Image.new("RGBA", (SIZE, SIZE), BG_COLOR)
    offset = (SIZE - content_size) // 2
    canvas.paste(scaled, (offset, offset), scaled)
    canvas.save(out_path, "PNG")


def main() -> None:
    src_path = MASTER_PATH if os.path.exists(MASTER_PATH) else OUT_PATH
    print(f"読み込み: {src_path}")
    generate_icon(src_path, OUT_PATH)
    margin = (SIZE - int(SIZE * CONTENT_SCALE)) // 2
    print(f"保存: {OUT_PATH} ({SIZE}x{SIZE}, 余白 {margin}px, scale={CONTENT_SCALE})")


if __name__ == "__main__":
    main()
