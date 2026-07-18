/**
 * 認証バリデーションスキーマ (Zod)
 */

import { z } from 'zod';

/** ログインフォーム */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(1, 'パスワードを入力してください')
    .min(8, 'パスワードは8文字以上で入力してください'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/** 新規登録フォーム */
export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'メールアドレスを入力してください')
      .email('有効なメールアドレスを入力してください'),
    password: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d)/,
        'パスワードは英字と数字を含めてください',
      ),
    confirmPassword: z.string().min(1, 'パスワード（確認）を入力してください'),
    nickname: z
      .string()
      .min(1, 'ニックネームを入力してください')
      .min(2, 'ニックネームは2文字以上で入力してください')
      .max(20, 'ニックネームは20文字以内で入力してください')
      .regex(
        /^[a-zA-Z0-9ぁ-んァ-ヶー一-龠々_]+$/,
        'ニックネームに使えない文字が含まれています',
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/** プロフィール編集フォーム */
export const profileSchema = z.object({
  nickname: z
    .string()
    .min(2, 'ニックネームは2文字以上で入力してください')
    .max(20, 'ニックネームは20文字以内で入力してください'),
  bio: z.string().max(200, '自己紹介は200文字以内で入力してください'),
  favoriteGenres: z.array(z.string()).max(5, 'ジャンルは5つまで選択できます'),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
