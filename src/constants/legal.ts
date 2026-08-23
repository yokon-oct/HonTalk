/**
 * 利用規約・プライバシーポリシー等の公開 URL
 *
 * GitHub Pages（docs/ フォルダ）でホストする想定。
 * リポジトリ名や Pages の設定を変更した場合は BASE_URL を更新すること。
 */

export const LEGAL_BASE_URL = 'https://yokon-oct.github.io/HonTalk';

export const LEGAL_URLS = {
  termsOfService: `${LEGAL_BASE_URL}/terms-of-service.html`,
  privacyPolicy: `${LEGAL_BASE_URL}/privacy-policy.html`,
  support: `${LEGAL_BASE_URL}/support.html`,
} as const;

/** App Store Connect 等に記載するサポート連絡先 */
export const SUPPORT_EMAIL = 'yoko19hiro68@gmail.com';

export const LEGAL_LAST_UPDATED = '2026年8月23日';
