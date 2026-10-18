import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useApp, Order } from '../context/AppContext';
import { COLORS, SIZES, FONTS } from '../utils/theme';
import { formatPrice } from '../utils/format';
import { API_URL } from '../utils/api'; // 👈 Imported API_URL to fix relative paths

const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

// 👈 Helper to ensure images always have the full HTTP URL
const getImageUri = (imagePath?: string | null): string | null => {
  if (!imagePath || !imagePath.trim()) return null;
  if (/^(https?:|file:|content:|data:)/i.test(imagePath)) return imagePath;
  return `${SERVER_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

// ─── Status colors ───
const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F5A623',
  APPROVED: '#34C759',
  REJECTED: '#FF3B30',
  pending: '#F5A623',
  approved: '#34C759',
  rejected: '#FF3B30',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const getId = (o: any): string => o?.id || o?._id || '';
const getTotal = (o: any): number => Number(o?.totalAmount ?? o?.total ?? 0);

const buildItemsSummary = (order: any): string => {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (items.length === 0) return 'No items';

  const names = items
    .map((it: any) => it?.name)
    .filter((n: any) => typeof n === 'string' && n.length > 0);

  if (names.length === 0) {
    return `${items.length} item${items.length > 1 ? 's' : ''}`;
  }

  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} +${names.length - 2} more`;
};

const OrdersScreen = ({ navigation }: any) => {
  const { orders, refreshOrders } = useApp();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        await refreshOrders();
        setLoading(false);
      })();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshOrders();
    setRefreshing(false);
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return (
        d.toLocaleDateString() +
        ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return iso || '';
    }
  };

  const itemCount = (order: Order) =>
    order.items?.reduce(
      (sum: number, i: any) => sum + (i.quantity || 0),
      0
    ) || 0;

  const renderItem = ({ item }: { item: any }) => {
    const statusKey = item.status || 'PENDING';
    const normalized = String(statusKey).toLowerCase();
    const color = STATUS_COLORS[normalized] || COLORS.gray;
    const orderId = getId(item);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => setSelected(item)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
            <Ionicons name="fast-food" size={22} color={color} />
          </View>
          <View style={{ flex: 1, marginLeft: SIZES.md }}>
            <Text style={styles.orderId}>
              #{String(orderId).slice(-6).toUpperCase()}
            </Text>
            <Text style={styles.itemsSummary} numberOfLines={1}>
              {buildItemsSummary(item)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.statusText, { color }]}>
              {STATUS_LABELS[normalized] || normalized}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.total}>
            {formatPrice(getTotal(item))} • {itemCount(item)} items
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={COLORS.gray} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>Your orders will appear here</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() =>
              navigation.navigate('CustomerTabs', { screen: 'Home' })
            }
          >
            <Text style={styles.browseBtnText}>Start Ordering</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const selectedNormalized = String(selected?.status || '').toLowerCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={(item) => getId(item)}
        contentContainerStyle={{ padding: SIZES.md }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={<Text style={styles.empty}>No orders found</Text>}
      />

      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selected && (
                <>
                  <Text style={styles.modalId}>#{getId(selected)}</Text>

                  <View style={styles.infoRow}>
                    <Ionicons name="fast-food-outline" size={16} color={COLORS.gray} />
                    <Text style={styles.infoText} numberOfLines={2}>
                      {buildItemsSummary(selected)}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.gray} />
                    <Text style={styles.infoText}>
                      {formatDate(selected.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={16} color={COLORS.gray} />
                    <Text style={styles.infoText}>
                      Status: {STATUS_LABELS[selectedNormalized] || selectedNormalized}
                    </Text>
                  </View>

                  {!!selected.deliveryAddr && (
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={16} color={COLORS.gray} />
                      <Text style={styles.infoText} numberOfLines={2}>
                        {selected.deliveryAddr}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.modalSection}>Items</Text>
                  {selected.items?.map((it: any, idx: number) => {
                    // 👈 Fix the image URI here
                    const imageUri = getImageUri(it.image);

                    return (
                      <View key={idx} style={styles.itemRow}>
                        <View style={styles.itemImageContainer}>
                          {imageUri ? (
                            <Image 
                              source={{ uri: imageUri }} 
                              style={styles.itemImage} 
                            />
                          ) : (
                            <View style={[styles.itemImage, styles.imagePlaceholder]}>
                              <Ionicons name="fast-food-outline" size={20} color={COLORS.gray} />
                            </View>
                          )}
                        </View>

                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {it.quantity}× {it.name || 'Item'}
                          </Text>
                          {it.price && (
                            <Text style={styles.itemUnitPrice}>
                              {formatPrice(it.price)} each
                            </Text>
                          )}
                        </View>
                        
                        <Text style={styles.itemPrice}>
                          {formatPrice(
                            it.lineTotal !== undefined
                              ? Number(it.lineTotal)
                              : Number(it.price || 0) * Number(it.quantity || 1)
                          )}
                        </Text>
                      </View>
                    );
                  })}

                  <View style={styles.totalBlock}>
                    <View style={[styles.totalBlockRow, styles.totalBlockFinal]}>
                      <Text style={styles.totalBlockFinalLabel}>Total</Text>
                      <Text style={styles.totalBlockFinalValue}>
                        {formatPrice(getTotal(selected))}
                      </Text>
                    </View>
                  </View>

                  <View style={{ height: SIZES.xl }} />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...FONTS.body, color: COLORS.gray, marginTop: SIZES.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
  },
  headerTitle: { ...FONTS.h2, color: COLORS.dark },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderId: { ...FONTS.small, color: COLORS.gray },
  itemsSummary: { ...FONTS.h4, color: COLORS.dark },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    ...FONTS.small,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.md,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  date: { ...FONTS.small, color: COLORS.gray },
  total: { ...FONTS.small, color: COLORS.dark, fontWeight: '600' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
    backgroundColor: COLORS.white,
  },
  emptyTitle: { ...FONTS.h3, color: COLORS.dark, marginTop: SIZES.md },
  emptyText: {
    ...FONTS.body,
    color: COLORS.gray,
    marginTop: SIZES.sm,
    marginBottom: SIZES.xl,
  },
  browseBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
  },
  browseBtnText: { ...FONTS.h4, color: COLORS.white },
  empty: {
    ...FONTS.body,
    color: COLORS.gray,
    textAlign: 'center',
    padding: SIZES.xl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SIZES.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  modalTitle: { ...FONTS.h3, color: COLORS.dark },
  modalId: {
    ...FONTS.small,
    color: COLORS.gray,
    fontFamily: 'monospace',
    marginBottom: SIZES.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: { ...FONTS.body, color: COLORS.dark, marginLeft: 8, flex: 1 },
  modalSection: {
    ...FONTS.h4,
    color: COLORS.dark,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemImageContainer: {
    marginRight: SIZES.sm,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: SIZES.radius,
  },
  imagePlaceholder: {
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: { ...FONTS.body, color: COLORS.dark, fontWeight: '600' },
  itemUnitPrice: { ...FONTS.small, color: COLORS.gray, marginTop: 2 },
  itemPrice: { ...FONTS.body, color: COLORS.dark, fontWeight: '600' },
  totalBlock: {
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalBlockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalBlockLabel: { ...FONTS.body, color: COLORS.gray },
  totalBlockValue: { ...FONTS.body, color: COLORS.dark, fontWeight: '600' },
  totalBlockFinal: {
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 2,
    borderTopColor: COLORS.dark,
  },
  totalBlockFinalLabel: { ...FONTS.h4, color: COLORS.dark },
  totalBlockFinalValue: { ...FONTS.h3, color: COLORS.primary },
});

export default OrdersScreen;