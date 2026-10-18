import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { useApp } from '../context/AppContext';
import { COLORS, SIZES, FONTS } from '../utils/theme';

import type { AdminDrawerParamList } from './AdminDrawerNavigator';

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: keyof AdminDrawerParamList;
  color: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', icon: 'grid-outline', screen: 'AdminDashboard', color: '#4A90E2' },
  { label: 'Orders', icon: 'receipt-outline', screen: 'AdminOrders', color: '#4A90E2' },
  { label: 'Foods', icon: 'fast-food-outline', screen: 'AdminFoods', color: '#F5A623' },
  { label: 'Users', icon: 'people-outline', screen: 'AdminUsers', color: '#9B51E0' },
  { label: 'Settings', icon: 'settings-outline', screen: 'AdminSettings', color: '#27AE60' },
];

const AdminDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { user, logout } = useApp();
  const currentRoute: string = props.state.routeNames[props.state.index];

  const avatarUrl = (user as any)?.avatar as string | undefined;

  const handleLogout = (): void => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{user?.name || 'Admin'}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark" size={12} color="#fff" />
          <Text style={styles.roleText}>ADMIN</Text>
        </View>
      </View>

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0 }}
      >
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => {
            const isActive = currentRoute === item.screen;
            return (
              <TouchableOpacity
                key={item.screen}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => props.navigation.navigate(item.screen)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.menuIconWrap,
                    {
                      backgroundColor: isActive
                        ? item.color
                        : item.color + '20',
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={isActive ? '#fff' : item.color}
                  />
                </View>
                <Text
                  style={[
                    styles.menuLabel,
                    isActive && styles.menuLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
                {isActive && (
                  <View
                    style={[
                      styles.activeDot,
                      { backgroundColor: item.color },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    padding: SIZES.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: SIZES.sm,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: COLORS.white },
  name: { ...FONTS.h4, color: COLORS.white },
  email: {
    ...FONTS.small,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: SIZES.sm,
  },
  roleText: { color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 4 },
  menuList: { padding: SIZES.md },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.sm,
    borderRadius: SIZES.radius,
    marginBottom: 4,
  },
  menuItemActive: { backgroundColor: COLORS.lightGray },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.sm,
  },
  menuLabel: { ...FONTS.body, color: COLORS.dark, flex: 1 },
  menuLabelActive: { fontWeight: '700' },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  footer: { padding: SIZES.md },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginBottom: SIZES.sm,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.sm,
    borderRadius: SIZES.radius,
    backgroundColor: '#FFEBEE',
  },
  logoutText: {
    ...FONTS.body,
    color: COLORS.danger,
    fontWeight: '600',
    marginLeft: SIZES.sm,
  },
  version: {
    ...FONTS.small,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: SIZES.sm,
  },
});

export default AdminDrawerContent;