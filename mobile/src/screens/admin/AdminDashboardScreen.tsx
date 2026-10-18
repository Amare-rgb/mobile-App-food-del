import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { adminService } from '../../services/admin.service';
import { useApp } from '../../context/AppContext';
import { COLORS, SIZES, FONTS } from '../../utils/theme';
import { formatPrice } from '../../utils/format';

// ✅ ONE shared param list (no local copy)
import type { AdminDrawerParamList } from '../../navigation/AdminDrawerNavigator';

const { width } = Dimensions.get('window');

// ✅ Not tied to a single route, so it never conflicts with the screen's name
type Nav = DrawerNavigationProp<AdminDrawerParamList>;

interface Stats {
  totalOrders?: number;
  pending?: number;
  approved?: number;
  rejected?: number;
  revenue?: number;
}

interface RecentOrder {
  id?: string;
  _id?: string;
  totalAmount?: number;
  total?: number;
  status?: string;
  user?: { name?: string };
  customer?: { name?: string };
}

interface StatCard {
  label: string;
  value: string | number;
  color: string;
}

const statusColors: Record<string, string> = {
  PENDING: '#F5A623',
  APPROVED: '#34C759',
  REJECTED: '#FF3B30',
};

const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      const [s, o] = await Promise.all([
        adminService.getStats(),
        adminService.getAllOrders({ page: 1 }),
      ]);
      setStats(s as Stats);
      const list = Array.isArray(o) ? o : o?.data ?? o?.orders ?? [];
      setRecentOrders((list as RecentOrder[]).slice(0, 5));
    } catch (err: any) {
      console.log('Dashboard error:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = (): void => {
    setRefreshing(true);
    load();
  };

  const handleLogout = (): void => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleDecision = async (
    id: string,
    action: 'approve' | 'reject'
  ): Promise<void> => {
    try {
      setBusyId(id);
      if (action === 'approve') await adminService.approveOrder(id);
      else await adminService.rejectOrder(id);
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not update order');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (id: string): void => {
    Alert.alert(
      'Delete Order',
      'Are you sure you want to permanently delete this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusyId(id);
              await api.delete(`/orders/${id}`);
              Alert.alert('Deleted', 'Order was successfully deleted.');
              await load();
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.message || 'Could not delete order'
              );
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  const statCards: StatCard[] = [
    { label: 'Total Orders', value: stats?.totalOrders ?? 0, color: '#4A90E2' },
    { label: 'Pending', value: stats?.pending ?? 0, color: '#F5A623' },
    { label: 'Approved', value: stats?.approved ?? 0, color: '#34C759' },
    { label: 'Rejected', value: stats?.rejected ?? 0, color: '#FF3B30' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.hamburger} onPress={() => navigation.openDrawer()}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>Admin Dashboard</Text>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutTextSmall}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SIZES.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.subtitle}>{user?.name || 'Admin'}</Text>
        </View>

        <View style={styles.statsGrid}>
          {statCards.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statColorDot, { backgroundColor: s.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleInline}>Recent Orders</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminOrders')}>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <Text style={styles.empty}>No orders yet</Text>
        ) : (
          recentOrders.map((o) => {
            const orderId = String(o.id || o._id || '');
            const orderTotal = o.totalAmount ?? o.total ?? 0;
            const statusKey = (o.status || 'PENDING').toUpperCase();
            const statusColor = statusColors[statusKey] || COLORS.gray;
            const isPending = statusKey === 'PENDING';
            const busy = busyId === orderId;

            return (
              <View key={orderId} style={styles.orderCard}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => navigation.navigate('AdminOrders')}
                >
                  <Text style={styles.orderId}>#{orderId.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.orderUser}>
                    {o.user?.name || o.customer?.name || 'Unknown'}
                  </Text>
                </TouchableOpacity>

                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.orderTotal}>{formatPrice(orderTotal)}</Text>

                    <TouchableOpacity
                      style={styles.deleteIconBtn}
                      onPress={() => handleDelete(orderId)}
                      disabled={busy}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={COLORS.danger} />
                      ) : (
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {statusKey.toLowerCase()}
                    </Text>
                  </View>

                  {isPending && (
                    <View style={styles.decisionRow}>
                      <TouchableOpacity
                        style={[styles.decisionBtn, styles.approveBtn]}
                        disabled={busy}
                        onPress={() => handleDecision(orderId, 'approve')}
                      >
                        {busy ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.decisionText}>Approve</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.decisionBtn, styles.rejectBtn]}
                        disabled={busy}
                        onPress={() => handleDecision(orderId, 'reject')}
                      >
                        <Text style={styles.decisionText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const CARD_WIDTH = (width - SIZES.md * 2 - SIZES.sm) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...FONTS.body, color: COLORS.gray, marginTop: SIZES.sm },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  hamburger: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', gap: 4 },
  hamburgerLine: { width: 22, height: 2, backgroundColor: COLORS.dark, borderRadius: 2 },
  topBarTitle: { ...FONTS.h4, color: COLORS.dark },
  logoutBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutTextSmall: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },

  header: {
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.sm,
    backgroundColor: COLORS.white,
  },
  greeting: { ...FONTS.h3, color: COLORS.dark },
  subtitle: { ...FONTS.small, color: COLORS.gray, marginTop: 2 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIZES.sm,
    paddingTop: SIZES.sm,
  },
  statCard: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.sm,
    marginHorizontal: SIZES.xs / 2,
    marginBottom: SIZES.xs,
  },
  statColorDot: { width: 12, height: 12, borderRadius: 6, marginRight: SIZES.sm },
  statValue: { ...FONTS.h4, color: COLORS.dark },
  statLabel: { ...FONTS.small, color: COLORS.gray, fontSize: 11 },

  sectionTitleInline: { ...FONTS.h4, color: COLORS.dark },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  seeAll: { color: COLORS.primary, fontWeight: '600', fontSize: 12 },

  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.xs,
  },
  orderId: { ...FONTS.small, color: COLORS.gray, fontFamily: 'monospace', fontSize: 11 },
  orderUser: { ...FONTS.body, color: COLORS.dark, fontSize: 13 },
  orderTotal: { ...FONTS.h4, color: COLORS.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  deleteIconBtn: {
    padding: 4,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
  },

  decisionRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  decisionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 62,
    alignItems: 'center',
  },
  approveBtn: { backgroundColor: '#34C759' },
  rejectBtn: { backgroundColor: '#FF3B30' },
  decisionText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  empty: { ...FONTS.body, color: COLORS.gray, textAlign: 'center', padding: SIZES.lg },
});

export default AdminDashboardScreen;