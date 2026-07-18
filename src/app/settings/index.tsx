import React from 'react';
import {
  StyleSheet, View, Text, ScrollView,
  TouchableOpacity, Alert, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

function MenuRow({ item }: { item: MenuItem }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={item.onPress} activeOpacity={0.6}>
      <View style={[styles.menuIconWrapper, item.destructive && styles.menuIconWrapperDestructive]}>
        <Ionicons
          name={item.icon}
          size={18}
          color={item.destructive ? colors.error : colors.primary[500]}
        />
      </View>
      <Text style={[styles.menuLabel, item.destructive && styles.menuLabelDestructive]}>
        {item.label}
      </Text>
      {!item.destructive && (
        <Ionicons name="chevron-forward" size={16} color={colors.neutral[400]} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, deleteAccount } = useAuth();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'アカウントを削除',
      '本当にアカウントを削除しますか？\nすべてのデータが完全に削除され、元に戻すことはできません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAccount();
            if (result.success) {
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  const sections: MenuSection[] = [
    {
      title: 'アカウント',
      items: [
        { icon: 'person-outline', label: 'プロフィールの編集', onPress: () => router.push('/settings/profile-edit') },
        { icon: 'mail-outline', label: 'メールアドレス変更', onPress: () => router.push('/settings/email-edit') },
      ],
    },
    {
      title: 'アプリ設定',
      items: [
        { icon: 'notifications-outline', label: '通知設定', onPress: () => router.push('/settings/notifications') },
        { icon: 'lock-closed-outline', label: 'プライバシー設定', onPress: () => router.push('/settings/privacy') },
      ],
    },
    {
      title: '危険な操作',
      items: [
        { icon: 'log-out-outline', label: 'ログアウト', onPress: handleLogout, destructive: true },
        { icon: 'trash-outline', label: 'アカウントを削除', onPress: handleDeleteAccount, destructive: true },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ユーザー情報カード */}
      <View style={styles.userCard}>
        {profile?.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={28} color={colors.neutral[400]} />
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{profile?.nickname ?? '未設定'}</Text>
          <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push('/settings/profile-edit')}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary[500]} />
        </TouchableOpacity>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, idx) => (
              <View key={item.label}>
                <MenuRow item={item} />
                {idx < section.items.length - 1 && <View style={styles.separator} />}
              </View>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.versionText}>HonTalk Version 1.0.0 (Beta)</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[100] },
  content: { paddingBottom: 48 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: { flex: 1, marginLeft: 14 },
  userName: { fontSize: 17, fontWeight: '700', color: colors.neutral[900], marginBottom: 3 },
  userEmail: { fontSize: 13, color: colors.neutral[500] },
  editButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary[50],
    justifyContent: 'center', alignItems: 'center',
  },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral[500],
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  menuIconWrapper: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: colors.primary[50],
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  menuIconWrapperDestructive: { backgroundColor: '#FEE2E2' },
  menuLabel: { flex: 1, fontSize: 15, color: colors.neutral[800], fontWeight: '500' },
  menuLabelDestructive: { color: colors.error },
  separator: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginLeft: 16 + 34 + 12,
  },
  versionText: { textAlign: 'center', color: colors.neutral[400], fontSize: 12, marginTop: 32 },
});
