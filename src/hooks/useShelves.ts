import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as shelfService from '@/services/shelfService';
import * as bookService from '@/services/bookService';
import { useAuthStore } from '@/stores/authStore';
import { bookKeys } from '@/hooks/useBooks';

export const shelfKeys = {
  all: ['shelves'] as const,
  list: (userId: string) => [...shelfKeys.all, 'list', userId] as const,
  detail: (shelfId: string) => [...shelfKeys.all, 'detail', shelfId] as const,
  books: (shelfId: string) => [...shelfKeys.all, 'books', shelfId] as const,
  forBook: (userId: string, bookId: string) => [...shelfKeys.all, 'forBook', userId, bookId] as const,
};

/**
 * ユーザーの本棚一覧を、冊数・プレビュー表紙付きで取得する
 */
export function useShelves(userId?: string) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const targetUserId = userId ?? currentUserId;

  return useQuery({
    queryKey: shelfKeys.list(targetUserId ?? ''),
    queryFn: () => shelfService.getShelvesWithPreview(targetUserId!),
    enabled: !!targetUserId,
  });
}

/**
 * 本棚の詳細情報（名前など）を取得する
 */
export function useShelf(shelfId: string) {
  return useQuery({
    queryKey: shelfKeys.detail(shelfId),
    queryFn: () => shelfService.getShelfById(shelfId),
    enabled: !!shelfId,
  });
}

/**
 * 本棚内の書籍一覧を取得する
 */
export function useShelfBooks(shelfId: string) {
  return useQuery({
    queryKey: shelfKeys.books(shelfId),
    queryFn: () => shelfService.getShelfBooks(shelfId),
    enabled: !!shelfId,
  });
}

/**
 * 指定した書籍が含まれる本棚ID一覧を取得する
 */
export function useShelvesForBook(bookId?: string | null) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: shelfKeys.forBook(currentUserId ?? '', bookId ?? ''),
    queryFn: () => shelfService.getShelvesContainingBook(currentUserId!, bookId!),
    enabled: !!currentUserId && !!bookId,
  });
}

/**
 * 本棚を新規作成する
 */
export function useCreateShelf() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: (name: string) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');
      return shelfService.createShelf(currentUserId, name);
    },
    onSuccess: () => {
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: shelfKeys.list(currentUserId) });
      }
    },
  });
}

/**
 * 本棚名を変更する
 */
export function useRenameShelf() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: ({ shelfId, name }: { shelfId: string; name: string }) =>
      shelfService.renameShelf(shelfId, name),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: shelfKeys.detail(variables.shelfId) });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: shelfKeys.list(currentUserId) });
      }
    },
  });
}

/**
 * 本棚を削除する
 */
export function useDeleteShelf() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: (shelfId: string) => shelfService.deleteShelf(shelfId),
    onSuccess: () => {
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: shelfKeys.list(currentUserId) });
      }
      queryClient.invalidateQueries({ queryKey: shelfKeys.all });
    },
  });
}

/**
 * 本棚の並び順をまとめて更新する
 */
export function useReorderShelves() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: (updates: { id: string; sort_order: number }[]) =>
      shelfService.reorderShelves(updates),
    onSuccess: () => {
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: shelfKeys.list(currentUserId) });
      }
    },
  });
}

/**
 * 書籍の本棚所属を更新する（書籍が未登録の場合は登録も行う）
 */
export function useUpdateBookShelves() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: async ({
      book,
      shelfIds,
    }: {
      book: bookService.GoogleBookItem;
      shelfIds: string[];
    }) => {
      if (!currentUserId) throw new Error('ユーザーが認証されていません');

      const dbBook = await bookService.upsertBook(book);
      await shelfService.setBookShelves(currentUserId, dbBook.id, shelfIds);
      return dbBook;
    },
    onSuccess: (dbBook) => {
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: shelfKeys.list(currentUserId) });
        queryClient.invalidateQueries({ queryKey: shelfKeys.forBook(currentUserId, dbBook.id) });
        // 書籍詳細画面の dbBookId も更新されるよう page_data を再取得する
        queryClient.invalidateQueries({ queryKey: bookKeys.all });
      }
      queryClient.invalidateQueries({ queryKey: shelfKeys.all });
    },
  });
}

/**
 * 本棚から書籍を削除する（本棚詳細画面での個別削除用）
 */
export function useRemoveBookFromShelf() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: ({ shelfId, bookId }: { shelfId: string; bookId: string }) =>
      shelfService.removeBookFromShelf(shelfId, bookId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: shelfKeys.books(variables.shelfId) });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: shelfKeys.list(currentUserId) });
        queryClient.invalidateQueries({ queryKey: shelfKeys.forBook(currentUserId, variables.bookId) });
      }
    },
  });
}
