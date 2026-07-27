/**
 * カスタム本棚サービス
 *
 * - shelves（本棚）の CRUD・並び替え
 * - shelf_books（本棚と書籍の中間テーブル）の管理
 */

import { supabase } from './supabase';
import type { Database } from '@/types/database.types';

type ShelfRow = Database['public']['Tables']['shelves']['Row'];
type ShelfBookRow = Database['public']['Tables']['shelf_books']['Row'];
type BookRow = Database['public']['Tables']['books']['Row'];

export type Shelf = ShelfRow;

/** 本棚一覧のプレビュー用データ（冊数・表紙サムネイル付き） */
export interface ShelfWithPreview extends ShelfRow {
  bookCount: number;
  previewCovers: string[];
}

// ==========================================
// 本棚 CRUD
// ==========================================

/**
 * ユーザーの本棚一覧を並び順で取得する
 */
export async function getShelvesByUser(userId: string): Promise<ShelfRow[]> {
  const { data, error } = await supabase
    .from('shelves')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * ユーザーの本棚一覧を、冊数・プレビュー表紙付きで取得する
 */
export async function getShelvesWithPreview(userId: string): Promise<ShelfWithPreview[]> {
  const shelves = await getShelvesByUser(userId);
  if (shelves.length === 0) return [];

  const shelfIds = shelves.map((s) => s.id);

  const { data: shelfBooks, error } = await supabase
    .from('shelf_books')
    .select('shelf_id, added_at, book:books(cover_image_url)')
    .in('shelf_id', shelfIds)
    .order('added_at', { ascending: false });

  if (error) throw error;

  const grouped = new Map<string, string[]>();
  const counts = new Map<string, number>();

  for (const row of (shelfBooks ?? []) as unknown as Array<{
    shelf_id: string;
    book: { cover_image_url: string | null } | null;
  }>) {
    counts.set(row.shelf_id, (counts.get(row.shelf_id) ?? 0) + 1);
    const covers = grouped.get(row.shelf_id) ?? [];
    if (covers.length < 4 && row.book?.cover_image_url) {
      covers.push(row.book.cover_image_url);
    }
    grouped.set(row.shelf_id, covers);
  }

  return shelves.map((shelf) => ({
    ...shelf,
    bookCount: counts.get(shelf.id) ?? 0,
    previewCovers: grouped.get(shelf.id) ?? [],
  }));
}

/**
 * 本棚を ID で取得する
 */
export async function getShelfById(shelfId: string): Promise<ShelfRow | null> {
  const { data, error } = await supabase
    .from('shelves')
    .select('*')
    .eq('id', shelfId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * 本棚内の書籍一覧を取得する
 */
export async function getShelfBooks(
  shelfId: string,
): Promise<(ShelfBookRow & { book: BookRow })[]> {
  const { data, error } = await supabase
    .from('shelf_books')
    .select('*, book:books(*)')
    .eq('shelf_id', shelfId)
    .order('added_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as (ShelfBookRow & { book: BookRow })[];
}

/**
 * 本棚を作成する（sort_order は末尾に自動採番）
 */
export async function createShelf(userId: string, name: string): Promise<ShelfRow> {
  const existing = await getShelvesByUser(userId);
  const nextSortOrder =
    existing.length > 0 ? Math.max(...existing.map((s) => s.sort_order)) + 1 : 0;

  const { data, error } = await supabase
    .from('shelves')
    .insert({ user_id: userId, name, sort_order: nextSortOrder })
    .select()
    .single();

  if (error) throw error;
  return data!;
}

/**
 * 本棚名を変更する
 */
export async function renameShelf(shelfId: string, name: string): Promise<ShelfRow> {
  const { data, error } = await supabase
    .from('shelves')
    .update({ name })
    .eq('id', shelfId)
    .select()
    .single();

  if (error) throw error;
  return data!;
}

/**
 * 本棚を削除する（shelf_books は CASCADE で自動削除される）
 */
export async function deleteShelf(shelfId: string): Promise<void> {
  const { error } = await supabase.from('shelves').delete().eq('id', shelfId);
  if (error) throw error;
}

/**
 * 本棚の並び順をまとめて更新する
 */
export async function reorderShelves(
  updates: { id: string; sort_order: number }[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from('shelves').update({ sort_order }).eq('id', id).then(({ error }) => {
        if (error) throw error;
      }),
    ),
  );
}

// ==========================================
// 本棚と書籍の紐付け
// ==========================================

/**
 * 指定した書籍が含まれる本棚ID一覧を取得する（自分の本棚のみ）
 */
export async function getShelvesContainingBook(
  userId: string,
  bookId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('shelf_books')
    .select('shelf_id, shelf:shelves!inner(user_id)')
    .eq('book_id', bookId)
    .eq('shelf.user_id', userId);

  if (error) throw error;
  return ((data ?? []) as unknown as { shelf_id: string }[]).map((row) => row.shelf_id);
}

/**
 * 本棚に書籍を追加する（既に追加済みの場合は何もしない）
 */
export async function addBookToShelf(shelfId: string, bookId: string): Promise<void> {
  const { error } = await supabase
    .from('shelf_books')
    .upsert({ shelf_id: shelfId, book_id: bookId }, { onConflict: 'shelf_id,book_id', ignoreDuplicates: true });

  if (error) throw error;
}

/**
 * 本棚から書籍を削除する
 */
export async function removeBookFromShelf(shelfId: string, bookId: string): Promise<void> {
  const { error } = await supabase
    .from('shelf_books')
    .delete()
    .eq('shelf_id', shelfId)
    .eq('book_id', bookId);

  if (error) throw error;
}

/**
 * 指定した書籍の本棚所属を、希望する本棚ID一覧に一致させる（差分で追加・削除）
 */
export async function setBookShelves(
  userId: string,
  bookId: string,
  desiredShelfIds: string[],
): Promise<void> {
  const currentShelfIds = await getShelvesContainingBook(userId, bookId);

  const toAdd = desiredShelfIds.filter((id) => !currentShelfIds.includes(id));
  const toRemove = currentShelfIds.filter((id) => !desiredShelfIds.includes(id));

  await Promise.all([
    ...toAdd.map((shelfId) => addBookToShelf(shelfId, bookId)),
    ...toRemove.map((shelfId) => removeBookFromShelf(shelfId, bookId)),
  ]);
}
