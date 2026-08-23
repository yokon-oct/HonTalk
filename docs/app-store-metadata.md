# App Store 公開チェックリスト

HonTalk を TestFlight / App Store に公開するための手順とメタデータ下書きです。

---

## Step 1: 法的情報ページを公開する（GitHub Pages）

`docs/` フォルダに利用規約・プライバシーポリシー・サポートページを配置済みです。

### GitHub Pages の有効化

1. [GitHub リポジトリ](https://github.com/yokon-oct/HonTalk) を開く
2. **Settings** → **Pages**
3. **Source**: `Deploy from a branch`
4. **Branch**: `main` / **Folder**: `/docs`
5. **Save** をクリック

数分後、以下の URL で公開されます:

| ページ | URL |
|--------|-----|
| トップ | https://yokon-oct.github.io/HonTalk/ |
| プライバシーポリシー | https://yokon-oct.github.io/HonTalk/privacy-policy.html |
| 利用規約 | https://yokon-oct.github.io/HonTalk/terms-of-service.html |
| サポート | https://yokon-oct.github.io/HonTalk/support.html |

> **注意**: `main` ブランチに `docs/` がマージされている必要があります。
> サポートメール `hontalk.support@gmail.com` は実際に受信できるアドレスに変更してください。

---

## Step 2: コードを main にマージ

```bash
# PR を作成して main にマージ
gh pr create --base main --head cursor/google-apple-sign-in \
  --title "feat: Phase 2 完成 — OAuth, ミュート, 公開準備" \
  --body "Google/Apple ログイン、ミュート、ISBN スキャン、法的情報ページを含む"
```

---

## Step 3: 本番ビルド & TestFlight 提出

```bash
npx eas build --profile production --platform ios
npx eas submit --platform ios
```

---

## Step 4: App Store Connect メタデータ

### 基本情報

| 項目 | 値 |
|------|-----|
| アプリ名 | HonTalk |
| サブタイトル | 読書記録と本好きSNS |
| Bundle ID | com.hontalk.app |
| プライマリ言語 | 日本語 |
| カテゴリ（Primary） | ブック |
| カテゴリ（Secondary） | ソーシャルネットワーキング |
| 年齢制限 | 12+（ユーザ生成コンテンツ、ソーシャル機能あり） |

### 説明文（下書き）

```
HonTalk（本トーク）は、読書記録とSNSを融合したアプリです。

■ 主な機能
・読みたい / 読書中 / 読了 のステータス管理
・★5段階評価とレビュー投稿
・フォロー・タイムライン・いいね・コメント
・カスタム本棚と読書統計
・人気書籍・話題レビューのランキング
・ISBN バーコードスキャンで書籍登録
・プッシュ通知（いいね・コメント・フォロー等）

■ こんな方におすすめ
・読んだ本を記録したい方
・本の感想を共有したい方
・読書好きとつながりたい方

HonTalk で、あなたの読書ライフをもっと豊かに。
```

### キーワード（100文字以内）

```
読書,本,レビュー,読書記録,本棚,SNS,ブックログ,読書メーター,感想,ランキング
```

### URL

| 項目 | URL |
|------|-----|
| プライバシーポリシー URL | https://yokon-oct.github.io/HonTalk/privacy-policy.html |
| サポート URL | https://yokon-oct.github.io/HonTalk/support.html |
| マーケティング URL | https://yokon-oct.github.io/HonTalk/ |

### 審査用メモ（App Review Information）

```
テスト用アカウント:
メール: [審査用メールアドレスを作成してください]
パスワード: [8文字以上]

ログイン方法: メール+パスワード、Google、Apple Sign In に対応しています。
主要機能はログイン後、タイムライン・書籍検索・レビュー投稿・本棚・ランキングから確認できます。
プッシュ通知は実機でのみ動作します。
```

### プライバシー質問（App Privacy）— 収集データ

| データ種別 | 収集 | 用途 | 第三者共有 |
|-----------|------|------|-----------|
| メールアドレス | はい | アカウント管理 | なし |
| ユーザー ID | はい | アカウント管理 | なし |
| 名前（ニックネーム） | はい | プロフィール表示 | なし |
| 写真（プロフィール画像） | はい | プロフィール表示 | なし |
| その他ユーザーコンテンツ | はい | レビュー・コメント等 | なし |
| デバイス ID（Push Token） | はい | プッシュ通知 | なし |

---

## Step 5: スクリーンショット

必要サイズ（iPhone）:

- 6.7インチ (1290 x 2796) — iPhone 15 Pro Max 等
- 6.1インチ (1179 x 2556) — iPhone 15 Pro 等

推奨画面:

1. タイムライン（ホーム）
2. 書籍詳細 + レビュー
3. 本棚
4. 読書統計
5. ランキング

---

## 残タスク

- [ ] サポートメールアドレスを実際に作成・設定
- [ ] GitHub Pages を有効化
- [ ] main ブランチへマージ
- [ ] 審査用テストアカウントを作成
- [ ] スクリーンショットを撮影
- [ ] production ビルド → TestFlight 提出
- [ ] App Store Connect メタデータ入力
- [ ] TestFlight で最終確認 → 審査提出
