#!/usr/bin/env bash
# iOS 実機ビルドのセットアップ（初回のみ対話操作が必要）
#
# 前提: Apple Developer Program（年 $99）に登録済みであること
#
# 使い方:
#   chmod +x scripts/setup-ios-build.sh
#   ./scripts/setup-ios-build.sh

set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== HonTalk iOS ビルドセットアップ ==="
echo ""
echo "Expo アカウント: yokon"
echo "Bundle ID: com.hontalk.app"
echo ""

echo "[1/3] Apple Developer 認証情報を設定します..."
echo "      → Apple ID でログインし、Distribution Certificate と"
echo "        Provisioning Profile を EAS に登録してください。"
echo ""
npx eas credentials:configure-build -p ios -e development

echo ""
echo "[2/3] 実機を登録します（internal 配布に必要）..."
echo "      → 表示される URL を iPhone の Safari で開くか、"
echo "        UDID を入力してください。"
echo ""
npx eas device:create

echo ""
echo "[3/3] development ビルドを開始します..."
npx eas build --profile development --platform ios

echo ""
echo "=== 完了 ==="
echo "ビルド完了後、Expo の QR コードまたはリンクから iPhone にインストールできます。"
echo "インストール後: 設定 > 通知設定 > テスト通知を送信"
