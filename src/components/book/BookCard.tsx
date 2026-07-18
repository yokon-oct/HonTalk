import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BookCover } from './BookCover';
import type { Database } from '@/types/database.types';
import { ThemedText } from '../themed-text';
import { Ionicons } from '@expo/vector-icons';

type BookRow = Database['public']['Tables']['books']['Row'];

interface BookCardProps {
  book: BookRow;
  onPress?: (book: BookRow) => void;
}

export function BookCard({ book, onPress }: BookCardProps) {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress?.(book)}
      activeOpacity={0.7}
    >
      <BookCover url={book.cover_image_url} width={80} height={120} />
      
      <View style={styles.content}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {book.title}
        </ThemedText>
        <ThemedText style={styles.author} numberOfLines={1}>
          {book.author}
        </ThemedText>
        
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color="#F59E0B" />
          <Text style={styles.ratingText}>
            {book.average_rating ? Number(book.average_rating).toFixed(1) : '-'}
          </Text>
          <Text style={styles.ratingCount}>
            ({book.rating_count}件のレビュー)
          </Text>
        </View>

        {!!book.genre && (
          <View style={styles.genreBadge}>
            <Text style={styles.genreText}>{book.genre}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  content: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
    paddingVertical: 2,
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
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: '#999999',
    marginLeft: 6,
  },
  genreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  genreText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
});
