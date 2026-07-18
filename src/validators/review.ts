/**
 * レビュー・書籍バリデーションスキーマ (Zod)
 */

import { z } from 'zod';

/** レビュー作成・編集フォーム */
export const reviewSchema = z.object({
  content: z
    .string()
    .min(1, '感想を入力してください')
    .max(5000, '感想は5,000文字以内で入力してください'),
  isPublic: z.boolean().default(true),
  hasSpoiler: z.boolean().default(false),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

/** コメントフォーム */
export const commentSchema = z.object({
  content: z
    .string()
    .min(1, 'コメントを入力してください')
    .max(500, 'コメントは500文字以内で入力してください'),
});

export type CommentFormData = z.infer<typeof commentSchema>;

/** 書籍手動登録フォーム */
export const bookManualSchema = z.object({
  title: z.string().min(1, 'タイトルを入力してください'),
  author: z.string().min(1, '著者名を入力してください'),
  publisher: z.string().optional(),
  isbn: z.string().optional(),
  genre: z.string().optional(),
  pageCount: z.number().positive('正の数を入力してください').optional(),
  publishedDate: z.string().optional(),
  description: z.string().max(2000, '説明は2,000文字以内で入力してください').optional(),
});

export type BookManualFormData = z.infer<typeof bookManualSchema>;
