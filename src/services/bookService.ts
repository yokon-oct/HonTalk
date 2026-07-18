/**
 * 書籍サービス
 *
 * - Google Books API による書籍検索
 * - Supabase books テーブルの CRUD
 * - reading_records の管理
 */

import { supabase } from './supabase';
import type { Database } from '@/types/database.types';

type BookRow = Database['public']['Tables']['books']['Row'];
type BookInsert = Database['public']['Tables']['books']['Insert'];
type ReadingRecordRow = Database['public']['Tables']['reading_records']['Row'];
type ReadingRecordInsert = Database['public']['Tables']['reading_records']['Insert'];
type ReadingStatus = ReadingRecordRow['status'];

// ==========================================
// Google Books API
// ==========================================

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

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
  options: { startIndex?: number; maxResults?: number } = {},
): Promise<{ items: GoogleBookItem[]; totalItems: number }> {
  const { startIndex = 0, maxResults = 20 } = options;

  if (!query.trim()) {
    return { items: [], totalItems: 0 };
  }

  const params = new URLSearchParams({
    q: query,
    startIndex: String(startIndex),
    maxResults: String(maxResults),
    langRestrict: 'ja',
    printType: 'books',
  });

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  if (apiKey) {
    params.append('key', apiKey);
  }

  const response = await fetch(`${GOOGLE_BOOKS_API}?${params}`);

  if (!response.ok) {
    // 429 (Too Many Requests) エラーの場合は、開発用のダミーデータを返してUIの確認を継続できるようにする
    if (response.status === 429) {
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
              description: 'これはAPI制限時のダミーデータです。APIキーを .env.local に設定すると実際のデータが取得できます。',
              pageCount: 300,
              categories: ['技術書'],
              imageLinks: {
                thumbnail: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=200&q=80',
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
                thumbnail: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=200&q=80',
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
 * ISBNで書籍を検索する
 */
export async function searchBookByIsbn(isbn: string): Promise<GoogleBookItem | null> {
  const cleanIsbn = isbn.replace(/-/g, '');
  const { items } = await searchGoogleBooks(`isbn:${cleanIsbn}`, { maxResults: 1 });
  return items.length > 0 ? items[0] : null;
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

/**
 * Google Books の書籍データを BookInsert 型に変換する
 */
export function googleBookToInsert(item: GoogleBookItem): BookInsert {
  const info = item.volumeInfo;
  return {
    title: info.title,
    author: info.authors?.join(', ') ?? '著者不明',
    publisher: info.publisher ?? null,
    isbn: extractIsbn(item),
    cover_image_url: info.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null,
    genre: info.categories?.[0] ?? null,
    page_count: info.pageCount ?? null,
    published_date: info.publishedDate ?? null,
    description: info.description ?? null,
    google_books_id: item.id,
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
  // まず既存チェック
  const existing = await getBookByGoogleBooksId(item.id);
  if (existing) return existing;

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
