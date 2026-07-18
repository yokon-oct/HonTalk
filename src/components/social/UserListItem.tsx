import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { FollowButton } from './FollowButton';
import type { FollowUser } from '@/services/followService';

interface UserListItemProps {
  user: FollowUser;
  onPress?: (userId: string) => void;
}

export function UserListItem({ user, onPress }: UserListItemProps) {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress?.(user.id)}
      activeOpacity={0.7}
    >
      <View style={styles.userInfo}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color="#999" />
          </View>
        )}
        <View style={styles.details}>
          <Text style={styles.nickname}>{user.nickname}</Text>
          {!!user.bio && (
            <Text style={styles.bio} numberOfLines={1}>
              {user.bio}
            </Text>
          )}
        </View>
      </View>

      <FollowButton targetUserId={user.id} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    marginLeft: 12,
    flex: 1,
  },
  nickname: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  bio: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
});
