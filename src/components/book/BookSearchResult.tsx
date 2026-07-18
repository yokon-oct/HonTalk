import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BookCover } from './BookCover';
import type { GoogleBookItem } from '@/services/bookService';
import { ThemedText } from '../themed-text';

interface BookSearchResultProps {
  item: GoogleBookItem;
  onPress?: (item: GoogleBookItem) => void;
}

export function BookSearchResult({ item, onPress }: BookSearchResultProps) {
  const { volumeInfo } = item;
  
  // HTTPのURLが含まれている可能性があるのでHTTPSに変換
  const coverUrl = volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://') || null;
  const author = volumeInfo.authors?.join(', ') || '著者不明';
  const publishedDate = volumeInfo.publishedDate ? volumeInfo.publishedDate.substring(0, 4) : '';

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress?.(item)}
      activeOpacity={0.7}
    >
      <BookCover url={coverUrl} width={64} height={96} />
      
      <View style={styles.content}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {volumeInfo.title}
        </ThemedText>
        <ThemedText style={styles.author} numberOfLines={1}>
          {author}
        </ThemedText>
        
        <View style={styles.metaRow}>
          {!!volumeInfo.publisher && (
            <Text style={styles.metaText} numberOfLines={1}>
              {volumeInfo.publisher}
            </Text>
          )}
          {!!volumeInfo.publisher && !!publishedDate && (
            <Text style={styles.metaDot}>・</Text>
          )}
          {!!publishedDate && (
            <Text style={styles.metaText}>{publishedDate}年</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 22,
  },
  author: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#999999',
  },
  metaDot: {
    fontSize: 12,
    color: '#999999',
    marginHorizontal: 4,
  },
});
