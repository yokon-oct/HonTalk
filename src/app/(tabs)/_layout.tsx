import React, { useState, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import {
  StyleSheet,
  Platform,
  View,
  Image,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

// ヘッダー左: ロゴアイコン
function HeaderLogo() {
  return (
    <View style={styles.logoContainer}>
      <Image
        source={require('../../../assets/images/hontalk-logo.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />
    </View>
  );
}

// ハンバーガーメニュー
function HamburgerMenu({ topOffset }: { topOffset: number }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  const openMenu = () => {
    setVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  const handleShelf = () => {
    closeMenu();
    if (user?.id) router.push(`/shelf/${user.id}`);
  };

  const handleScanner = () => {
    closeMenu();
    router.push('/scanner');
  };

  const handleLogout = () => {
    closeMenu();
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <>
      <TouchableOpacity style={styles.hamburgerButton} onPress={openMenu} activeOpacity={0.7}>
        <Ionicons name="menu" size={26} color={colors.neutral[700]} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="none" onRequestClose={closeMenu}>
        <Pressable style={styles.overlay} onPress={closeMenu}>
          <Animated.View
            style={[
              styles.menuContainer,
              { top: topOffset + 8, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* 本棚 */}
            <TouchableOpacity style={styles.menuItem} onPress={handleShelf} activeOpacity={0.7}>
              <View style={styles.menuIconWrapper}>
                <Ionicons name="library-outline" size={20} color={colors.primary[500]} />
              </View>
              <Text style={styles.menuItemText}>本棚</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.neutral[300]} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* バーコードスキャン */}
            <TouchableOpacity style={styles.menuItem} onPress={handleScanner} activeOpacity={0.7}>
              <View style={styles.menuIconWrapper}>
                <Ionicons name="barcode-outline" size={20} color={colors.primary[500]} />
              </View>
              <Text style={styles.menuItemText}>バーコードスキャン</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.neutral[300]} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* ログアウト */}
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.7}>
              <View style={[styles.menuIconWrapper, styles.menuIconWrapperDanger]}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              </View>
              <Text style={styles.menuItemTextDanger}>ログアウト</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

// カスタムヘッダー
// ボーダーラインをJSXの最後にレンダリングすることで
// z-orderでロゴ・ハンバーガーメニューより前面に描画され途切れを防ぐ
function CustomHeader({ options }: { options: any }) {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 52;

  const renderTitle = () => {
    if (typeof options.headerTitle === 'function') {
      return options.headerTitle({});
    }
    if (typeof options.headerTitle === 'string') {
      return <Text style={styles.headerTitle}>{options.headerTitle}</Text>;
    }
    if (options.title) {
      return <Text style={styles.headerTitle}>{options.title}</Text>;
    }
    return null;
  };

  return (
    <View style={[styles.customHeader, { paddingTop: insets.top }]}>
      {/* 左: ロゴ */}
      <View style={styles.headerSection}>
        <HeaderLogo />
      </View>

      {/* 中央: タイトル */}
      <View style={styles.headerCenter}>
        {renderTitle()}
      </View>

      {/* 右: ハンバーガーメニュー */}
      <View style={[styles.headerSection, styles.headerRight]}>
        <HamburgerMenu topOffset={headerHeight} />
      </View>

      {/* ボーダーライン — 必ずJSX末尾に置くことでz-orderが最前面になる */}
      <View style={styles.headerBorder} />
    </View>
  );
}

export default function TabLayout() {
  const { data: unreadCount } = useUnreadNotificationCount();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: colors.neutral[50],
          borderTopWidth: 1,
          borderTopColor: colors.neutral[200],
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        header: ({ options }) => <CustomHeader options={options} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'HonTalk',
          headerTitle: () => <Text style={styles.appTitle}>HonTalk</Text>,
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shelf"
        options={{
          title: '本棚',
          tabBarLabel: '本棚',
          headerTitle: '本棚',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '書籍検索',
          tabBarLabel: '検索',
          headerTitle: '本を探す',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '通知',
          tabBarLabel: '通知',
          headerTitle: '通知',
          tabBarBadge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'マイページ',
          tabBarLabel: 'マイページ',
          headerTitle: 'マイプロフィール',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // カスタムヘッダー
  customHeader: {
    backgroundColor: colors.neutral[50],
    flexDirection: 'row',
    alignItems: 'center',
    height: 'auto' as any,
    paddingBottom: 0,
  },
  headerSection: {
    width: 80,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  // ボーダーライン: JSX末尾で最前面レンダリング
  headerBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.neutral[200],
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary[500],
    letterSpacing: 0.5,
  },

  // ロゴ
  logoContainer: {
    marginLeft: 16,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },

  // ハンバーガーボタン
  hamburgerButton: {
    marginRight: 16,
    padding: 4,
  },

  // ドロップダウンメニュー
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuContainer: {
    position: 'absolute',
    right: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 6,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconWrapperDanger: {
    backgroundColor: '#FEF2F2',
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[800],
  },
  menuItemTextDanger: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#EF4444',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginHorizontal: 12,
  },
});
