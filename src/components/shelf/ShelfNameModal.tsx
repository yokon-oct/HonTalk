import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '@/theme/colors';

interface ShelfNameModalProps {
  visible: boolean;
  initialName?: string;
  title: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
  submitting?: boolean;
}

/**
 * 本棚名の入力モーダル（新規作成・名前変更で共用）
 */
export function ShelfNameModal({
  visible,
  initialName = '',
  title,
  onSubmit,
  onClose,
  submitting = false,
}: ShelfNameModalProps) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlayPressable} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="本棚の名前（例: 積読、お気に入り）"
            placeholderTextColor={colors.neutral[400]}
            maxLength={30}
            autoFocus
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, !name.trim() && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!name.trim() || submitting}
            >
              <Text style={styles.submitText}>{submitting ? '保存中...' : '保存'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  overlayPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '85%',
    backgroundColor: colors.neutral[0],
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.neutral[900],
    backgroundColor: colors.neutral[50],
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  submitButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.primary[500],
  },
  submitButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  submitText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
