/**
 * UI状態の Zustand ストア
 *
 * モーダル、トースト、ローディングオーバーレイなどの
 * UIのグローバル状態を管理する。
 */

import { create } from 'zustand';
import { Alert } from 'react-native';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface UIState {
  /** トースト一覧 */
  toasts: Toast[];
  /** グローバルローディングオーバーレイ */
  isGlobalLoading: boolean;

  // アクション
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  setGlobalLoading: (loading: boolean) => void;
}

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  isGlobalLoading: false,

  showToast: (toast) => {
    // Toast UIが未実装のため、エラー等はAlertで代替表示する
    Alert.alert(
      toast.type === 'error' ? 'エラー' : 'お知らせ',
      toast.message
    );
    
    const id = `toast-${++toastId}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    const duration = toast.duration ?? 3000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),
}));
