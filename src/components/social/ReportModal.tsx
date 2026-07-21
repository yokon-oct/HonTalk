import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { useSubmitReport } from '@/hooks/useReport';
import type { ReportTargetType, ReportCategory } from '@/hooks/useReport';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  /** 表示用のターゲット名（例：「このレビュー」「このコメント」「このユーザー」）*/
  targetLabel?: string;
}

interface CategoryOption {
  value: ReportCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    value: 'spam',
    label: 'スパム',
    icon: 'warning-outline',
    description: '繰り返しの投稿や不正な宣伝',
  },
  {
    value: 'inappropriate',
    label: '不適切なコンテンツ',
    icon: 'ban-outline',
    description: '不適切な表現や有害なコンテンツ',
  },
  {
    value: 'harassment',
    label: 'ハラスメント',
    icon: 'alert-circle-outline',
    description: '嫌がらせや脅迫行為',
  },
  {
    value: 'other',
    label: 'その他',
    icon: 'ellipsis-horizontal-circle-outline',
    description: '上記に当てはまらない場合',
  },
];

export function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  targetLabel = 'このコンテンツ',
}: ReportModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { mutate: submitReport, isPending } = useSubmitReport();

  const handleClose = () => {
    setSelectedCategory(null);
    setDescription('');
    setIsSubmitted(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedCategory) return;

    submitReport(
      {
        targetType,
        targetId,
        category: selectedCategory,
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setIsSubmitted(true);
        },
        onError: (error) => {
          if (error.message === 'already_reported') {
            Alert.alert(
              '通報済み',
              'すでにこのコンテンツを通報済みです。確認中ですのでしばらくお待ちください。',
              [{ text: 'OK', onPress: handleClose }]
            );
          } else {
            Alert.alert('エラー', '通報の送信に失敗しました。時間をおいて再試行してください。');
          }
        },
      }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          {/* ハンドルバー */}
          <View style={styles.handle} />

          {isSubmitted ? (
            /* 送信完了画面 */
            <View style={styles.thankYouContainer}>
              <View style={styles.thankYouIcon}>
                <Ionicons name="checkmark-circle" size={56} color={colors.secondary[500]} />
              </View>
              <Text style={styles.thankYouTitle}>通報を受け付けました</Text>
              <Text style={styles.thankYouText}>
                ご報告ありがとうございます。{'\n'}
                内容を確認し、適切に対応いたします。
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ヘッダー */}
              <View style={styles.header}>
                <Text style={styles.title}>{targetLabel}を通報する</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={24} color={colors.neutral[500]} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* カテゴリ選択 */}
                <Text style={styles.sectionLabel}>通報の種類を選択してください</Text>
                <View style={styles.categoryList}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.value;
                    return (
                      <TouchableOpacity
                        key={cat.value}
                        style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
                        onPress={() => setSelectedCategory(cat.value)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.categoryIcon, isSelected && styles.categoryIconSelected]}>
                          <Ionicons
                            name={cat.icon}
                            size={20}
                            color={isSelected ? colors.primary[500] : colors.neutral[400]}
                          />
                        </View>
                        <View style={styles.categoryText}>
                          <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                            {cat.label}
                          </Text>
                          <Text style={styles.categoryDescription}>{cat.description}</Text>
                        </View>
                        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 詳細説明（任意） */}
                <Text style={styles.sectionLabel}>詳細（任意）</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="具体的な内容を入力してください（任意）"
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  value={description}
                  onChangeText={setDescription}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{description.length}/500</Text>

                {/* 送信ボタン */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!selectedCategory || isPending) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!selectedCategory || isPending}
                >
                  {isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>通報する</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                  通報内容は運営チームが確認します。虚偽の通報を繰り返した場合はアカウント停止の対象となる場合があります。
                </Text>
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[200],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  categoryList: {
    gap: 8,
    marginBottom: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    gap: 12,
  },
  categoryItemSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[400],
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconSelected: {
    backgroundColor: colors.primary[100],
  },
  categoryText: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 2,
  },
  categoryLabelSelected: {
    color: colors.primary[700],
  },
  categoryDescription: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary[500],
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
  },
  descriptionInput: {
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.neutral[800],
    backgroundColor: colors.neutral[50],
    minHeight: 80,
    marginBottom: 4,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: colors.neutral[400],
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: colors.error,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 11,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  // 送信完了
  thankYouContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  thankYouIcon: {
    marginBottom: 16,
  },
  thankYouTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 12,
  },
  thankYouText: {
    fontSize: 14,
    color: colors.neutral[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  closeButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
