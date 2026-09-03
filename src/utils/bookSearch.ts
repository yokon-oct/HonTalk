/**
 * 書籍検索のクエリ正規化・関連度スコア・結果マージ
 */

export interface RankableBookItem {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

/** バーコードスキャン値や入力値から ISBN を正規化する */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase();
}

/** ISBN-10 / ISBN-13 形式かどうか */
export function isValidIsbn(isbn: string): boolean {
  return /^\d{10}$/.test(isbn) || /^\d{13}$/.test(isbn);
}

/** 全角・空白・記号ゆれを吸収した検索クエリにする */
export function normalizeSearchQuery(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/[\u00A0\u3000]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** タイトル・著者の比較用に、空白と装飾記号を落とした文字列にする */
export function normalizeForMatch(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u00A0\u3000\s]/g, '')
    .replace(/[「」『』【】\[\]()（）〔〕<>〈〉《》・,，、.。:：;；!！?？"'“”‘’]/g, '');
}

/** クエリ全体が ISBN ならその値を返す */
export function extractIsbnFromQuery(query: string): string | null {
  const compact = normalizeIsbn(query);
  if (!isValidIsbn(compact)) return null;

  const leftover = query.replace(/[0-9Xx\-\s]/gi, '');
  if (leftover.length > 0) return null;
  return compact;
}

export function extractIsbnFromItem(item: RankableBookItem): string | null {
  const identifiers = item.volumeInfo.industryIdentifiers;
  if (!identifiers) {
    if (item.id.startsWith('rakuten:')) {
      const fromId = normalizeIsbn(item.id.slice('rakuten:'.length));
      return isValidIsbn(fromId) ? fromId : null;
    }
    return null;
  }

  const isbn13 = identifiers.find((id) => id.type === 'ISBN_13');
  if (isbn13 && isValidIsbn(normalizeIsbn(isbn13.identifier))) {
    return normalizeIsbn(isbn13.identifier);
  }

  const isbn10 = identifiers.find((id) => id.type === 'ISBN_10');
  if (isbn10 && isValidIsbn(normalizeIsbn(isbn10.identifier))) {
    return normalizeIsbn(isbn10.identifier);
  }

  return null;
}

/**
 * Google Books 向けクエリを組み立てる。
 * 説明文ヒットよりタイトル・著者ヒットを優先させる。
 */
export function buildGoogleBooksQuery(normalizedQuery: string): string {
  const isbn = extractIsbnFromQuery(normalizedQuery);
  if (isbn) return `isbn:${isbn}`;

  const sanitized = normalizedQuery.replace(/["]/g, '').replace(/:/g, ' ').replace(/\s+/g, ' ').trim();
  if (!sanitized) return normalizedQuery;

  const quoted = `"${sanitized}"`;
  return `intitle:${quoted} OR inauthor:${quoted}`;
}

function matchScore(haystack: string, needle: string): number {
  const h = normalizeForMatch(haystack);
  const n = normalizeForMatch(needle);
  if (!h || !n) return 0;
  if (h === n) return 100;
  if (h.startsWith(n)) return 80;
  if (n.startsWith(h) && h.length >= 2) return 70;
  if (h.includes(n)) return 60;

  const tokens = needle
    .split(/\s+/)
    .map((token) => normalizeForMatch(token))
    .filter((token) => token.length >= 2);
  if (tokens.length > 1 && tokens.every((token) => h.includes(token))) return 50;

  return 0;
}

export function scoreSearchItem(item: RankableBookItem, query: string): number {
  const titleScore = matchScore(item.volumeInfo.title ?? '', query);
  const authorScore = Math.max(
    0,
    ...(item.volumeInfo.authors ?? []).map((author) => matchScore(author, query)),
  );
  const publisherScore = matchScore(item.volumeInfo.publisher ?? '', query);

  let score = titleScore * 3 + authorScore * 2 + publisherScore;

  const isbn = extractIsbnFromItem(item);
  const queryIsbn = extractIsbnFromQuery(query);
  if (isbn && queryIsbn && isbn === queryIsbn) {
    score += 400;
  }

  if (item.volumeInfo.imageLinks?.thumbnail || item.volumeInfo.imageLinks?.smallThumbnail) {
    score += 5;
  }

  return score;
}

function itemDedupeKey(item: RankableBookItem): string {
  const isbn = extractIsbnFromItem(item);
  if (isbn) return `isbn:${isbn}`;

  const title = normalizeForMatch(item.volumeInfo.title ?? '');
  const author = normalizeForMatch(item.volumeInfo.authors?.[0] ?? '');
  return `ta:${title}:${author}`;
}

function isGoogleVolumeId(id: string): boolean {
  if (id.startsWith('rakuten:') || id.startsWith('dummy-')) return false;
  return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function mergeDuplicateItems<T extends RankableBookItem>(a: T, b: T, query: string): T {
  const preferA = scoreSearchItem(a, query) >= scoreSearchItem(b, query);
  const primary = preferA ? a : b;
  const secondary = preferA ? b : a;

  const googleId = isGoogleVolumeId(a.id)
    ? a.id
    : isGoogleVolumeId(b.id)
      ? b.id
      : isGoogleVolumeId(primary.id)
        ? primary.id
        : !a.id.startsWith('rakuten:')
          ? a.id
          : !b.id.startsWith('rakuten:')
            ? b.id
            : primary.id;
  const rakutenCover =
    a.id.startsWith('rakuten:') ? a.volumeInfo.imageLinks : b.id.startsWith('rakuten:') ? b.volumeInfo.imageLinks : undefined;
  const cover =
    rakutenCover?.thumbnail || rakutenCover?.smallThumbnail
      ? rakutenCover
      : primary.volumeInfo.imageLinks ?? secondary.volumeInfo.imageLinks;

  return {
    ...primary,
    id: googleId,
    volumeInfo: {
      ...primary.volumeInfo,
      title: primary.volumeInfo.title || secondary.volumeInfo.title,
      authors:
        primary.volumeInfo.authors && primary.volumeInfo.authors.length > 0
          ? primary.volumeInfo.authors
          : secondary.volumeInfo.authors,
      publisher: primary.volumeInfo.publisher || secondary.volumeInfo.publisher,
      publishedDate: primary.volumeInfo.publishedDate || secondary.volumeInfo.publishedDate,
      description: primary.volumeInfo.description || secondary.volumeInfo.description,
      industryIdentifiers:
        primary.volumeInfo.industryIdentifiers ?? secondary.volumeInfo.industryIdentifiers,
      pageCount: primary.volumeInfo.pageCount ?? secondary.volumeInfo.pageCount,
      categories: primary.volumeInfo.categories ?? secondary.volumeInfo.categories,
      imageLinks: cover,
    },
  };
}

/**
 * 複数ソースの検索結果を ISBN / タイトル+著者で重複排除し、関連度順に並べる
 */
export function mergeAndRankSearchResults<T extends RankableBookItem>(
  query: string,
  groups: T[][],
): T[] {
  const merged = new Map<string, T>();

  for (const group of groups) {
    for (const item of group) {
      if (!item.volumeInfo?.title?.trim()) continue;
      const key = itemDedupeKey(item);
      const existing = merged.get(key);
      merged.set(key, existing ? mergeDuplicateItems(existing, item, query) : item);
    }
  }

  return [...merged.values()].sort((a, b) => {
    const scoreDiff = scoreSearchItem(b, query) - scoreSearchItem(a, query);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.volumeInfo.title ?? '').localeCompare(b.volumeInfo.title ?? '', 'ja');
  });
}
