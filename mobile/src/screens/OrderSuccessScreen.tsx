import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../utils/theme';
import { formatPrice } from '../utils/format';

const OrderSuccessScreen = ({ route, navigation }: any) => {
  // Accept both total and the new details from Chapa
  const { orderId, total, txRef, method, paidAt } = route.params || {};

  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  const shortId = orderId ? String(orderId).slice(-6).toUpperCase() : null;
  const isChapa = method?.toLowerCase() === 'chapa' || !!txRef;
  const methodLabel = isChapa ? 'Chapa (Online)' : 'Cash on Delivery';

  // ✅ Reset stack so back doesn't return to payment/checkout
  const goToTab = (screen: 'Home' | 'Orders') => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'CustomerTabs', params: { screen } }],
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Animated.View
          style={[styles.iconCircle, { transform: [{ scale }], opacity }]}
        >
          <Ionicons name="checkmark" size={60} color={COLORS.white} />
        </Animated.View>

        <Text style={styles.title}>Payment Successful</Text>
        <Text style={styles.subtitle}>
          Your order has been confirmed and is being prepared. You'll get it soon!
        </Text>

        {/* ─── Transaction Summary Card ─── */}
        <View style={styles.infoCard}>
          {shortId && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order ID</Text>
              <Text style={styles.infoValue}>#{shortId}</Text>
            </View>
          )}

          {isChapa && txRef && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Transaction Ref</Text>
                <Text style={[styles.infoValue, styles.mono]} numberOfLines={1} ellipsizeMode="middle">
                  {txRef}
                </Text>
              </View>
            </>
          )}

          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method</Text>
            <Text style={styles.infoValue}>{methodLabel}</Text>
          </View>

          {typeof total === 'number' && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Amount</Text>
                <Text style={styles.infoTotal}>{formatPrice(total)}</Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => goToTab('Orders')}
          activeOpacity={0.8}
        >
          <Ionicons name="receipt-outline" size={20} color={COLORS.white} />
          <Text style={styles.primaryBtnText}>Track Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => goToTab('Home')}
          activeOpacity={0.8}
        >
          <Ionicons name="home-outline" size={20} color={COLORS.dark} />
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
  },

  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#22C55E', // Use exact green for success
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.xl,
    shadowColor: '#22C55E',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  title: { ...FONTS.h1, marginBottom: SIZES.sm, color: COLORS.dark },
  subtitle: {
    ...FONTS.body,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SIZES.xl,
    paddingHorizontal: SIZES.sm,
  },

  infoCard: {
    width: '100%',
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: { ...FONTS.body, color: COLORS.gray },
  infoValue: {
    ...FONTS.body,
    color: COLORS.dark,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  infoTotal: { ...FONTS.h3, color: COLORS.primary },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },

  primaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.xxl,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.md,
    width: '100%',
  },
  primaryBtnText: {
    ...FONTS.h4,
    color: COLORS.white,
    marginLeft: SIZES.sm,
  },
  secondaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.xxl,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: {
    ...FONTS.h4,
    color: COLORS.dark,
    marginLeft: SIZES.sm,
  },
});

export default OrderSuccessScreen;