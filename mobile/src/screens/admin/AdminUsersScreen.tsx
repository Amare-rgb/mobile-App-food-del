import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { adminService, UserRole } from '../../services/admin.service';   // ✅ Import UserRole
import { COLORS, SIZES, FONTS } from '../../utils/theme';

// ✅ Use the SAME type as the service — no duplicate, no mismatch
type Role = UserRole;   // = 'CUSTOMER' | 'COURIER' | 'ADMIN'

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#9B51E0',
  COURIER: '#4A90E2',
  CUSTOMER: '#34C759',
  // lowercase fallbacks for safety
  admin: '#9B51E0',
  rider: '#4A90E2',
  customer: '#34C759',
};

// ✅ Helper — works for Prisma (`id`) AND Mongoose (`_id`)
const getId = (o: any): string => o?.id || o?._id || '';

// ✅ Normalize any role to UPPERCASE for consistent comparison
const normalizeRole = (role: string): string =>
  String(role || 'CUSTOMER').toUpperCase();

const AdminUsersScreen = ({ navigation }: any) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Role | ''>('');

  const load = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filter) params.role = filter;
      const res = await adminService.getAllUsers(params);
      setUsers(res.data || []);
    } catch (err: any) {
      console.log('Load users error:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [filter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const changeRole = (user: any) => {
    Alert.alert('Change Role', `Select new role for ${user.name}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Customer',
        onPress: () => updateRole(getId(user), 'CUSTOMER'),
      },
      {
        text: 'Courier',
        onPress: () => updateRole(getId(user), 'COURIER'),
      },
      {
        text: 'Admin',
        onPress: () => updateRole(getId(user), 'ADMIN'),
      },
    ]);
  };

  // ✅ role is now UserRole — matches the service signature
  const updateRole = async (id: string, role: UserRole) => {
    try {
      await adminService.updateUserRole(id, role);
      Alert.alert('Updated ✅', `Role changed to ${role}`);
      load();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || err?.message || 'Failed to update'
      );
    }
  };

  const remove = (user: any) => {
    Alert.alert('Delete?', `Delete user "${user.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deleteUser(getId(user));
            Alert.alert('Deleted', 'User removed');
            load();
          } catch (err: any) {
            Alert.alert(
              'Error',
              err?.response?.data?.message || err?.message || 'Delete failed'
            );
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const roleKey = normalizeRole(item.role);
    const color = ROLE_COLORS[roleKey] || COLORS.gray;

    return (
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: color + '20' }]}>
          <Text style={[styles.avatarText, { color }]}>
            {item.name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
          {item.phone ? <Text style={styles.email}>{item.phone}</Text> : null}
          <View style={[styles.roleBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.roleText, { color }]}>
              {roleKey.toLowerCase()}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => changeRole(item)}
          >
            <Ionicons name="shield-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtnDanger}
            onPress={() => remove(item)}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ✅ filterOptions use UPPERCASE values matching UserRole
  const filterOptions: { label: string; value: Role | '' }[] = [
    { label: 'All', value: '' },
    { label: 'Customer', value: 'CUSTOMER' },
    { label: 'Courier', value: 'COURIER' },
    { label: 'Admin', value: 'ADMIN' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.title}>Users</Text>
        <TouchableOpacity onPress={load}>
          <Ionicons name="refresh" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or email..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <View style={styles.filterRow}>
        {filterOptions.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={[styles.chip, filter === opt.value && styles.chipActive]}
            onPress={() => setFilter(opt.value)}
          >
            <Text
              style={[
                styles.chipText,
                filter === opt.value && styles.chipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => getId(item)}
          contentContainerStyle={{ padding: SIZES.md }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
  },
  title: { ...FONTS.h3, color: COLORS.dark },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.md,
    marginTop: SIZES.md,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: SIZES.sm,
    ...FONTS.body,
    color: COLORS.dark,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  chip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    marginRight: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { ...FONTS.small, color: COLORS.gray, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700' },
  info: { flex: 1, marginLeft: SIZES.md },
  name: { ...FONTS.h4, color: COLORS.dark },
  email: { ...FONTS.small, color: COLORS.gray, marginTop: 2 },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  roleText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  actions: { flexDirection: 'row' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.sm,
  },
  iconBtnDanger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    ...FONTS.body,
    color: COLORS.gray,
    textAlign: 'center',
    padding: SIZES.xl,
  },
});

export default AdminUsersScreen;