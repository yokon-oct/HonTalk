import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface BookCoverProps {
  url?: string | null;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain' | 'fill';
}

const FALLBACK_COLOR = '#E0E0E0';

export function BookCover({
  url,
  width = 80,
  height = 120,
  style,
  contentFit = 'cover',
}: BookCoverProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={styles.image}
          contentFit={contentFit}
          transition={200}
          cachePolicy="disk"
        />
      ) : (
        <View style={styles.fallbackContainer}>
          <Ionicons name="book-outline" size={width * 0.4} color="#999" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: FALLBACK_COLOR,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});
