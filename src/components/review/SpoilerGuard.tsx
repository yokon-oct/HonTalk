import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface SpoilerGuardProps {
  hasSpoiler: boolean;
  children: React.ReactNode;
}

export function SpoilerGuard({ hasSpoiler, children }: SpoilerGuardProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  if (!hasSpoiler || isRevealed) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.warningText}>
        このレビューにはネタバレが含まれています
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setIsRevealed(true)}
      >
        <Text style={styles.buttonText}>内容を表示する</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 8,
  },
  warningText: {
    color: '#92400E',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
