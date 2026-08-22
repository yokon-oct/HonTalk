const NAMED_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

function decodeHtmlEntities(text: string): string {
  let result = text;

  for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
    result = result.replaceAll(entity, char);
  }

  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCodePoint(Number(code)),
  );
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCodePoint(parseInt(code, 16)),
  );

  return result;
}

/**
 * HTML 形式のテキストをプレーンテキストに変換する。
 * Google Books API などが返す `<br>` や `<p>` タグを改行に変換する。
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';

  const text = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|tr|blockquote)\s*>/gi, '\n')
    .replace(/<\s*(p|div|li|h[1-6]|blockquote)\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '');

  return decodeHtmlEntities(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
