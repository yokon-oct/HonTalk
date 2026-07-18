/**
 * TanStack Query クライアント設定
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 1分間キャッシュ
      staleTime: 1000 * 60,
      // 5分間のガベージコレクション
      gcTime: 1000 * 60 * 5,
      // ウィンドウフォーカス時の再取得（モバイルでは不要なことが多い）
      refetchOnWindowFocus: false,
      // リトライ設定
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: 1,
    },
  },
});
