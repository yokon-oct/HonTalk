/**
 * HonTalk テーマ — エントリポイント
 *
 * すべてのデザイントークンを統合してエクスポートする。
 */

export { colors } from './colors';
export { typography } from './typography';
export { spacing, borderRadius, shadow } from './spacing';

export const theme = {
  colors: require('./colors').colors,
  typography: require('./typography').typography,
  spacing: require('./spacing').spacing,
  borderRadius: require('./spacing').borderRadius,
  shadow: require('./spacing').shadow,
} as const;

export type Theme = typeof theme;
