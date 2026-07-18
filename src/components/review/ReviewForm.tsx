import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ReviewFormData {
  content: string;
  rating: number;
  hasSpoiler: boolean;
  isPublic: boolean;
}

interface ReviewFormProps {
  initialData?: Partial<ReviewFormData>;
  onSubmit: (data: ReviewFormData) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  isFreePost?: boolean;
}

export function ReviewForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  submitLabel = '投稿する',
  isFreePost = false,
}: ReviewFormProps) {
  const [content, setContent] = useState(initialData?.content ?? '');
  const [rating, setRating] = useState(initialData?.rating ?? 0);
  const [hasSpoiler, setHasSpoiler] = useState(initialData?.hasSpoiler ?? false);
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? true);

  const handleSubmit = () => {
    if (content.trim().length === 0) return;
    onSubmit({ content, rating: isFreePost ? 0 : rating, hasSpoiler, isPublic });
  };

  const isValid = content.trim().length > 0 && (isFreePost || rating > 0);

  return (
    <View style={styles.container}>
      {/* 評価（星）- フリーポスト時は非表示 */}
      {!isFreePost && (
        <View style={styles.section}>
          <Text style={styles.label}>評価</Text>
          <View style={styles.ratingRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setRating(i + 1)}
                activeOpacity={0.7}
                style={styles.starButton}
              >
                <Ionicons
                  name={i < rating ? 'star' : 'star-outline'}
                  size={32}
                  color="#F59E0B"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* レビュー/投稿 本文 */}
      <View style={styles.section}>
        <Text style={styles.label}>{isFreePost ? '投稿内容' : 'レビュー（感想）'}</Text>
        <TextInput
          style={styles.textInput}
          multiline
          placeholder={isFreePost ? "いまどうしてる？" : "この本の感想を教えてください"}
          value={content}
          onChangeText={setContent}
          maxLength={5000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{content.length} / 5000</Text>
      </View>

      {/* トグル設定 */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>ネタバレを含む</Text>
            <Text style={styles.switchDescription}>
              内容の核心に触れる場合はオンにしてください
            </Text>
          </View>
          <Switch value={hasSpoiler} onValueChange={setHasSpoiler} />
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>公開する</Text>
            <Text style={styles.switchDescription}>
              オフにすると自分だけが見られるメモになります
            </Text>
          </View>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>
      </View>

      {/* 送信ボタン */}
      <TouchableOpacity
        style={[styles.submitButton, (!isValid || isSubmitting) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || isSubmitting}
      >
        <Text style={styles.submitButtonText}>
          {isSubmitting ? '送信中...' : submitLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    paddingRight: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
    color: '#111827',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  switchDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#000000',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
