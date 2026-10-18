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
import { formatPrice } from '../utils/format';   // ✅ ETB formatter

const OrderSuccessScreen = ({ route, navigation }: any) => {
  // Passed from CheckoutScreen: { orderId, total }
  const { orderId, total } = route.params || {};

  // ─── Subtle pop-in animation for the success icon ───
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* ─── Success Icon ─── */}
        <Animated.View
          style={[
            styles.iconCircle,
            { transform: [{ scale }], opacity },
          ]}
        >
          <Ionicons name="checkmark" size={60} color={COLORS.white} />
        </Animated.View>

        {/* ─── Title ─── */}
        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.subtitle}>
          Your order has been received and is being prepared. You'll get it soon!
        </Text>

        {/* ─── Order info card ─── */}
        {(shortId || typeof total === 'number') && (
          <View style={styles.infoCard}>
            {shortId && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Order ID</Text>
                <Text style={styles.infoValue}>#{shortId}</Text>
              </View>
            )}
            {typeof total === 'number' && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Total</Text>
                  <Text style={styles.infoTotal}>{formatPrice(total)}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ─── Actions ─── */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            navigation.navigate('CustomerTabs', { screen: 'Orders' })
          }
          activeOpacity={0.8}
        >
          <Ionicons name="receipt-outline" size={20} color={COLORS.white} />
          <Text style={styles.primaryBtnText}>Track Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() =>
            navigation.navigate('CustomerTabs', { screen: 'Home' })
          }
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

  // ─── Icon ───
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },

  // ─── Text ───
  title: { ...FONTS.h1, marginBottom: SIZES.sm, color: COLORS.dark },
  subtitle: {
    ...FONTS.body,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },

  // ─── Order info card ───
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
    paddingVertical: 6,
  },
  infoLabel: { ...FONTS.body, color: COLORS.gray },
  infoValue: {
    ...FONTS.h4,
    color: COLORS.dark,
    fontFamily: 'monospace',
  },
  infoTotal: { ...FONTS.h3, color: COLORS.primary },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },

  // ─── Buttons ───
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