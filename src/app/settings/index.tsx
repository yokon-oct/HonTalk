import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/hooks/useAuth';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'ログアウト', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          } 
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* メニューセクション 1 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アカウント設定</Text>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/settings/profile-edit')}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="person-outline" size={20} color={colors.neutral[600]} />
            <Text style={styles.menuText}>プロフィールの編集</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/settings/email-edit')}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="mail-outline" size={20} color={colors.neutral[600]} />
            <Text style={styles.menuText}>メールアドレス変更</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
        </TouchableOpacity>
      </View>

      {/* メニューセクション 2 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アプリ設定</Text>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/settings/notifications')}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="notifications-outline" size={20} color={colors.neutral[600]} />
            <Text style={styles.menuText}>通知設定</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/settings/privacy')}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.neutral[600]} />
            <Text style={styles.menuText}>プライバシーとセキュリティ</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
        </TouchableOpacity>
      </View>

      {/* ログアウトボタン */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>ログアウト</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>HonTalk Version 1.0.0 (Beta)</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[100],
  },
  section: {
    marginTop: 24,
    backgroundColor: colors.neutral[0],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral[200],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.neutral[500],
    paddingLeft: 16,
    paddingVertical: 8,
    backgroundColor: colors.neutral[100],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    color: colors.neutral[800],
  },
  logoutButton: {
    marginTop: 32,
    backgroundColor: colors.neutral[0],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral[200],
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
  versionText: {
    textAlign: 'center',
    color: colors.neutral[400],
    fontSize: 12,
    marginTop: 24,
    marginBottom: 40,
  },
});
