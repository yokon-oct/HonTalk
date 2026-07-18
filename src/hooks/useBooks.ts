import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as bookService from '@/services/bookService';
import { useAuthStore } from '@/stores/authStore';
import type { Database } from '@/types/database.types';

type ReadingStatus = Database['public']['Tables']['reading_records']['Row']['status'];

export const bookKeys = {
  all: ['books'] as const,
  search: (query: string, startIndex: number) => [...bookKeys.all, 'search', query, startIndex] as const,
  detail: (id: string) => [...bookKeys.all, 'detail', id] as const,
  readingRecords: (userId: string) => [...bookKeys.all, 'readingRecords', userId] as const,
  readingRecordDetail: (userId: string, bookId: string) => [...bookKeys.all, 'readingRecords', userId, bookId] as const,
};

/**
 * Google Books APIで書籍を検索する
 */
export function useSearchBooks(query: string, startIndex = 0, enabled = true) {
  return useQuery({
    queryKey: bookKeys.search(query, startIndex),
    queryFn: () => bookService.searchGoogleBooks(query, { startIndex }),
    enabled: enabled && query.trim().length > 0,
  });
}

/**
 * Google Books API で特定の書籍詳細を取得する
 */
export function useGoogleBookDetail(bookId: string, enabled = true) {
  return useQuery({
    queryKey: [...bookKeys.all, 'google_detail', bookId],
    queryFn: () => bookService.getGoogleBookById(bookId),
    enabled: enabled && !!bookId,
  });
}

/**
 * 書籍詳細と読書記録を一度に取得する（UUID/GoogleBooksID両対応）
 */
export function useBookPageData(id: string) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...bookKeys.all, 'page_data', id, currentUserId],
    queryFn: async () => {
      let googleBooksId = id;
      let dbBookId: string | null = null;
      let readingRecord = null;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuid = uuidRegex.test(id);

      if (isUuid) {
        const dbBook = await bookService.getBookById(id);
        if (!dbBook) throw new Error('書籍が見つかりません');
        dbBookId = dbBook.id;
        
        if (dbBook.google_books_id) {
          googleBooksId = dbBook.google_books_id;
        } else {
          // google_books_idがない場合はAPIを叩けないためダミーのGoogleBookItemを返す
          const dummyBook: bookService.GoogleBookItem = {
            id: dbBook.id,
            volumeInfo: {
              title: dbBook.title,
              authors: [dbBook.author],
              publisher: dbBook.publisher || '',
              publishedDate: dbBook.published_date || '',
              description: dbBook.description || '',
              pageCount: dbBook.page_count || 0,
              categories: dbBook.genre ? [dbBook.genre] : [],
              imageLinks: dbBook.cover_image_url ? { thumbnail: dbBook.cover_image_url } : undefined,
            }
          };
          if (currentUserId) {
            readingRecord = await bookService.getReadingRecord(currentUserId, dbBookId);
          }
          return { book: dummyBook, readingRecord };
        }
      } else {
        googleBooksId = id;
        const dbBook = await bookService.getBookByGoogleBooksId(id);
        if (dbBook) {
          dbBookId = dbBook.id;
        }
      }

      // Google APIから詳細取得
      const bookDetail = await bookService.getGoogleBookById(googleBooksId);

      // 読書記録の取得
      if (currentUserId && dbBookId) {
        readingRecord = await bookService.getReadingRecord(currentUserId, dbBookId);
      }

      return {
        book: bookDetail,
        readingRecord,
      };
    },
    enabled: !!id,
  });
}

/**
 * 書籍詳細を取得する
 */
export function useBookDetail(bookId: string, enabled = true) {
  return useQuery({
    queryKey: bookKeys.detail(bookId),
    queryFn: () => bookService.getBookById(bookId),
    enabled: enabled && !!bookId,
  });
}

/**
 * ユーザーの読書記録一覧を取得する
 */
export function useReadingRecords(userId?: string, status?: ReadingStatus) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const targetUserId = userId ?? currentUserId;

  return useQuery({
    queryKey: [...bookKeys.readingRecords(targetUserId || ''), status],
    queryFn: () => bookService.getReadingRecords(targetUserId!, status),
    enabled: !!targetUserId,
  });
}

/**
 * 特定の書籍の読書記録を取得する
 */
export function useReadingRecord(bookId: string) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: bookKeys.readingRecordDetail(currentUserId || '', bookId),
    queryFn: () => bookService.getReadingRecord(currentUserId!, bookId),
    enabled: !!currentUserId && !!bookId,
  });
}

/**
 * 読書記録を追加・更新する（書籍が未登録の場合は登録も行う）
 */
export function useUpsertReadingRecord() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: async ({
      book,
      status,
      rating,
    }: {
      book: bookService.GoogleBookItem;
      status: ReadingStatus;
      rating?: number;
    }) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      
      // 1. 書籍をDBに登録（既存なら取得）
      const dbBook = await bookService.upsertBook(book);
      
      // 2. 読書記録を登録・更新
      return bookService.upsertReadingRecord({
        user_id: currentUserId,
        book_id: dbBook.id,
        status,
        rating,
      });
    },
    onSuccess: (_, variables) => {
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: bookKeys.readingRecords(currentUserId) });
        queryClient.invalidateQueries({ queryKey: bookKeys.all });
      }
    },
  });
}

/**
 * 読書ステータスのみを更新する
 */
export function useUpdateReadingStatus() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: ({ bookId, status }: { bookId: string; status: ReadingStatus }) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      return bookService.updateReadingStatus(currentUserId, bookId, status);
    },
    onSuccess: (_, variables) => {
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: bookKeys.readingRecords(currentUserId) });
        queryClient.invalidateQueries({ queryKey: bookKeys.readingRecordDetail(currentUserId, variables.bookId) });
      }
    },
  });
}

/**
 * 読書記録を削除する
 */
export function useDeleteReadingRecord() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: ({ bookId }: { bookId: string }) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      return bookService.deleteReadingRecord(currentUserId, bookId);
    },
    onSuccess: (_, variables) => {
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: bookKeys.readingRecords(currentUserId) });
        queryClient.invalidateQueries({ queryKey: bookKeys.readingRecordDetail(currentUserId, variables.bookId) });
        queryClient.invalidateQueries({ queryKey: bookKeys.all });
      }
    },
  });
}
