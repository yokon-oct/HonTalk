/**
 * 書籍サービス
 *
 * - Google Books API による書籍検索
 * - Supabase books テーブルの CRUD
 * - reading_records の管理
 */

import { supabase } from './supabase';
import type { Database } from '@/types/database.types';
import { htmlToPlainText } from '@/utils/htmlToPlainText';

type BookRow = Database['public']['Tables']['books']['Row'];
type BookInsert = Database['public']['Tables']['books']['Insert'];
type ReadingRecordRow = Database['public']['Tables']['reading_records']['Row'];
type ReadingRecordInsert = Database['public']['Tables']['reading_records']['Insert'];
type ReadingStatus = ReadingRecordRow['status'];

// ==========================================
// Google Books API
// ==========================================

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

export class GoogleBooksRateLimitError extends Error {
  constructor() {
    super('Google Books API の利用上限に達しました');
    this.name = 'GoogleBooksRateLimitError';
  }
}

/** バーコードスキャン値から ISBN を正規化する */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase();
}

/** ISBN-10 / ISBN-13 形式かどうか */
export function isValidIsbn(isbn: string): boolean {
  return /^\d{10}$/.test(isbn) || /^\d{13}$/.test(isbn);
}

/** Google Books API のレスポンス型 */
export interface GoogleBookItem {
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

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBookItem[];
}

/**
 * Google Books API で書籍を検索する
 */
export async function searchGoogleBooks(
  query: string,
  options: {
    startIndex?: number;
    maxResults?: number;
    langRestrict?: string;
    allowDummyOnRateLimit?: boolean;
  } = {},
): Promise<{ items: GoogleBookItem[]; totalItems: number }> {
  const {
    startIndex = 0,
    maxResults = 20,
    langRestrict = 'ja',
    allowDummyOnRateLimit = true,
  } = options;

  if (!query.trim()) {
    return { items: [], totalItems: 0 };
  }

  const params = new URLSearchParams({
    q: query,
    startIndex: String(startIndex),
    maxResults: String(maxResults),
    printType: 'books',
  });

  if (langRestrict) {
    params.append('langRestrict', langRestrict);
  }

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  if (apiKey) {
    params.append('key', apiKey);
  }

  const response = await fetch(`${GOOGLE_BOOKS_API}?${params}`);

  if (!response.ok) {
    if (response.status === 429) {
      if (!allowDummyOnRateLimit) {
        throw new GoogleBooksRateLimitError();
      }
      console.warn('Google Books API Rate Limit Exceeded (429). Using dummy data.');
      return {
        items: [
          {
            id: 'dummy-1',
            volumeInfo: {
              title: `${query}（API制限中につきダミーデータ）`,
              authors: ['テスト 太郎'],
              publisher: '技術出版',
              publishedDate: '2025-01-01',
              description:
                'これはAPI制限時のダミーデータです。APIキーを .env.local に設定すると実際のデータが取得できます。',
              pageCount: 300,
              categories: ['技術書'],
              imageLinks: {
                thumbnail:
                  'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=200&q=80',
              },
            },
          },
          {
            id: 'dummy-2',
            volumeInfo: {
              title: `図解 ${query} 入門（ダミー）`,
              authors: ['サンプル 花子'],
              publishedDate: '2024-05-15',
              imageLinks: {
                thumbnail:
                  'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=200&q=80',
              },
            },
          },
        ],
        totalItems: 2,
      };
    }
    throw new Error(`Google Books API error: ${response.status}`);
  }

  const data: GoogleBooksResponse = await response.json();
  return {
    items: data.items ?? [],
    totalItems: data.totalItems,
  };
}

/**
 * 楽天ブックス API で ISBN 検索する（Edge Function 経由）
 */
async function searchRakutenBookByIsbn(isbn: string): Promise<GoogleBookItem | null> {
  try {
    const { data, error } = await supabase.functions.invoke('search-book-by-isbn', {
      body: { isbn },
    });

    if (error) {
      console.warn('Rakuten Edge Function error:', error.message);
      throw new Error(`楽天検索に失敗しました: ${error.message}`);
    }

    if (data?.error === 'rakuten_ip_not_allowed') {
      throw new Error('楽天APIのIP制限です。プロキシとngrokが起動しているか確認してください。');
    }

    if (data?.error === 'rakuten_not_configured') {
      throw new Error('Supabase に楽天APIの設定がありません。');
    }

    if (data?.error === 'proxy_invalid_response') {
      throw new Error('プロキシから不正な応答が返りました。ngrokとプロキシが起動しているか確認してください。');
    }

    if (data?.error === 'unauthorized') {
      throw new Error('ログインセッションが切れています。再ログインしてください。');
    }

    return (data?.book as GoogleBookItem | null) ?? null;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('楽天検索中に不明なエラーが発生しました');
  }
}

function dbBookToGoogleBookItem(book: BookRow): GoogleBookItem {
  return {
    id: book.google_books_id ?? book.rakuten_books_id ?? book.id,
    volumeInfo: {
      title: book.title,
      authors: [book.author],
      publisher: book.publisher ?? undefined,
      publishedDate: book.published_date ?? undefined,
      description: book.description ?? undefined,
      pageCount: book.page_count ?? undefined,
      categories: book.genre ? [book.genre] : undefined,
      imageLinks: book.cover_image_url ? { thumbnail: book.cover_image_url } : undefined,
      industryIdentifiers: book.isbn ? [{ type: 'ISBN_13', identifier: book.isbn }] : undefined,
    },
  };
}

/**
 * ISBNで書籍を検索する（Google Books → 楽天ブックス の順で試行）
 */
export async function searchBookByIsbn(isbn: string): Promise<GoogleBookItem | null> {
  const cleanIsbn = normalizeIsbn(isbn);
  if (!isValidIsbn(cleanIsbn)) {
    return null;
  }

  const existing = await getBookByIsbn(cleanIsbn);
  if (existing) {
    return dbBookToGoogleBookItem(existing);
  }

  let rateLimitError: GoogleBooksRateLimitError | null = null;

  try {
    const { items } = await searchGoogleBooks(`isbn:${cleanIsbn}`, {
      maxResults: 1,
      langRestrict: '',
      allowDummyOnRateLimit: false,
    });
    if (items.length > 0) {
      return items[0];
    }
  } catch (error) {
    if (error instanceof GoogleBooksRateLimitError) {
      rateLimitError = error;
    } else {
      console.warn('Google Books ISBN search failed:', error);
    }
  }

  const rakutenResult = await searchRakutenBookByIsbn(cleanIsbn);
  if (rakutenResult) {
    return rakutenResult;
  }

  if (rateLimitError) {
    throw rateLimitError;
  }

  return null;
}

/**
 * Google Books API で特定の書籍IDの詳細を取得する
 */
export async function getGoogleBookById(id: string): Promise<GoogleBookItem> {
  let url = `${GOOGLE_BOOKS_API}/${id}`;
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  if (apiKey) {
    url += `?key=${apiKey}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 429) {
      console.warn('Google Books API Rate Limit Exceeded (429). Using dummy data.');
      return {
        id,
        volumeInfo: {
          title: '取得失敗（API制限中）',
          authors: ['テスト 太郎'],
          publisher: '技術出版',
          publishedDate: '2025-01-01',
          description: 'これはAPI制限時のダミーデータです。詳細の取得に失敗しました。APIキーを .env.local に設定すると実際のデータが取得できます。',
          pageCount: 300,
          categories: ['技術書'],
          imageLinks: {
            thumbnail: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=200&q=80',
          },
        },
      };
    }
    throw new Error(`Google Books API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Google Books の書籍データから ISBN を抽出する
 */
function extractIsbn(item: GoogleBookItem): string | null {
  const identifiers = item.volumeInfo.industryIdentifiers;
  if (!identifiers) return null;

  // ISBN_13 を優先
  const isbn13 = identifiers.find((id) => id.type === 'ISBN_13');
  if (isbn13) return isbn13.identifier;

  const isbn10 = identifiers.find((id) => id.type === 'ISBN_10');
  return isbn10?.identifier ?? null;
}

function normalizePublishedDate(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`;
  return null;
}

/**
 * Google Books の書籍データを BookInsert 型に変換する
 */
export function googleBookToInsert(item: GoogleBookItem): BookInsert {
  const info = item.volumeInfo;
  const isRakuten = item.id.startsWith('rakuten:');
  const rakutenIsbn = isRakuten ? item.id.slice('rakuten:'.length) : null;

  return {
    title: info.title,
    author: info.authors?.join(', ') ?? '著者不明',
    publisher: info.publisher ?? null,
    isbn: extractIsbn(item) ?? rakutenIsbn,
    cover_image_url: info.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null,
    genre: info.categories?.[0] ?? null,
    page_count: info.pageCount ?? null,
    published_date: normalizePublishedDate(info.publishedDate),
    description: info.description ? htmlToPlainText(info.description) : null,
    google_books_id: isRakuten ? null : item.id.startsWith('dummy-') ? null : item.id,
    rakuten_books_id: rakutenIsbn,
  };
}

// ==========================================
// Supabase 書籍 CRUD
// ==========================================

/**
 * 書籍を ID で取得する
 */
export async function getBookById(bookId: string): Promise<BookRow | null> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * ISBN で既存の書籍を検索する
 */
export async function getBookByIsbn(isbn: string): Promise<BookRow | null> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('isbn', isbn)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Google Books ID で既存の書籍を検索する（重複防止）
 */
export async function getBookByGoogleBooksId(
  googleBooksId: string,
): Promise<BookRow | null> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('google_books_id', googleBooksId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * 簡易情報から書籍を登録・取得する（レビュー作成時に必要）
 */
export async function ensureBookExists(params: {
  google_books_id: string;
  title: string;
  author: string;
  cover_image_url?: string;
}): Promise<BookRow> {
  const existing = await getBookByGoogleBooksId(params.google_books_id);
  if (existing) return existing;

  const insertData: BookInsert = {
    google_books_id: params.google_books_id,
    title: params.title,
    author: params.author,
    cover_image_url: params.cover_image_url || null,
  };

  const { data, error } = await supabase
    .from('books')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data!;
}

/**
 * 書籍を登録する（既存なら既存のものを返す）
 */
export async function upsertBook(item: GoogleBookItem): Promise<BookRow> {
  const isbn = extractIsbn(item) ?? (item.id.startsWith('rakuten:') ? item.id.slice(7) : null);

  if (isbn) {
    const existingByIsbn = await getBookByIsbn(isbn);
    if (existingByIsbn) return existingByIsbn;
  }

  if (!item.id.startsWith('rakuten:') && !item.id.startsWith('dummy-')) {
    const existing = await getBookByGoogleBooksId(item.id);
    if (existing) return existing;
  }

  const insertData = googleBookToInsert(item);
  const { data, error } = await supabase
    .from('books')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data!;
}

// ==========================================
// 読書記録
// ==========================================

/**
 * ユーザーの読書記録を取得する
 */
export async function getReadingRecords(
  userId: string,
  status?: ReadingStatus,
): Promise<(ReadingRecordRow & { book: BookRow })[]> {
  let query = supabase
    .from('reading_records')
    .select('*, book:books(*)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as (ReadingRecordRow & { book: BookRow })[];
}

/**
 * 特定の書籍のユーザーの読書記録を取得する
 */
export async function getReadingRecord(
  userId: string,
  bookId: string,
): Promise<ReadingRecordRow | null> {
  const { data, error } = await supabase
    .from('reading_records')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * 読書記録を作成・更新する
 */
export async function upsertReadingRecord(
  record: ReadingRecordInsert,
): Promise<ReadingRecordRow> {
  const { data, error } = await supabase
    .from('reading_records')
    .upsert(record, { onConflict: 'user_id,book_id' })
    .select()
    .single();

  if (error) throw error;
  return data!;
}

/**
 * 読書ステータスを更新する
 */
export async function updateReadingStatus(
  userId: string,
  bookId: string,
  status: ReadingStatus,
): Promise<ReadingRecordRow> {
  const updates: Partial<ReadingRecordInsert> = { status };

  // ステータスに応じて日付を自動設定
  if (status === 'reading') {
    updates.start_date = new Date().toISOString().split('T')[0];
  } else if (status === 'finished') {
    updates.end_date = new Date().toISOString().split('T')[0];
  }

  return upsertReadingRecord({
    user_id: userId,
    book_id: bookId,
    ...updates,
  });
}

/**
 * 読書記録を削除する
 */
export async function deleteReadingRecord(
  userId: string,
  bookId: string,
): Promise<void> {
  const { error } = await supabase
    .from('reading_records')
    .delete()
    .eq('user_id', userId)
    .eq('book_id', bookId);

  if (error) throw error;
}

// ==========================================
// 読書統計
// ==========================================

export interface ReadingStats {
  summary: {
    total_finished: number;
    total_reading: number;
    total_want: number;
    year_finished: number;
    year_reading: number;
  };
  monthly: Array<{
    year: number;
    month: number;
    count: number;
  }>;
  by_genre: Array<{
    genre: string;
    count: number;
  }>;
  ratings: Array<{
    rating: number;
    count: number;
  }>;
}

/**
 * 読書統計を取得する（RPCで一括集計）
 */
export async function getReadingStats(userId: string): Promise<ReadingStats> {
  const { data, error } = await supabase.rpc('get_reading_stats', {
    p_user_id: userId,
  });

  if (error) throw error;

  const stats = data as unknown as ReadingStats;
  return {
    summary: stats.summary ?? {
      total_finished: 0,
      total_reading: 0,
      total_want: 0,
      year_finished: 0,
      year_reading: 0,
    },
    monthly: stats.monthly ?? [],
    by_genre: stats.by_genre ?? [],
    ratings: stats.ratings ?? [],
  };
}
