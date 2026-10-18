import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, SIZES, FONTS } from '../utils/theme';
import { formatPrice } from '../utils/format';

// ═══════════════════════════════════════════
// Payment methods for Ethiopia 🇪🇹
// ═══════════════════════════════════════════
type PaymentMethod = 'chapa' | 'cash';

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  hint: string;
  icon: string;
}[] = [
  {
    id: 'chapa',
    label: 'Pay Online',
    hint: 'Telebirr, CBE Birr & more via Chapa',
    icon: 'card',
  },
  {
    id: 'cash',
    label: 'Cash on Delivery',
    hint: 'Pay when your order arrives',
    icon: 'cash',
  },
];

// Match CartScreen — keep these identical
const DELIVERY_FEE = 150;     // ETB
const VAT_ENABLED = false;
const VAT_RATE = 0.15;

/**
 * Normalize Ethiopian phone numbers to 09xxxxxxxx / 07xxxxxxxx.
 * Returns null if it can't be normalized.
 */
const normalizeEthPhone = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('251') && digits.length === 12) {
    return '0' + digits.slice(3);
  }
  if (digits.length === 9 && digits.startsWith('9')) {
    return '0' + digits;
  }
  if (digits.length === 10 && (digits.startsWith('09') || digits.startsWith('07'))) {
    return digits;
  }
  return null;
};

const CheckoutScreen = ({ route, navigation }: any) => {
  const { delivery = DELIVERY_FEE } = route.params || {};

  const { placeOrder, cart, cartTotal } = useApp();

  const [payment, setPayment] = useState<PaymentMethod>('cash');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Addis Ababa');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // ─── Totals (single source of truth) ───
  const computedDelivery = cart.length > 0 ? delivery : 0;
  const computedVat = VAT_ENABLED ? cartTotal * VAT_RATE : 0;
  const computedTotal = cartTotal + computedDelivery + computedVat;

  const handlePlaceOrder = async () => {
    // ─── Validate ───
    if (cart.length === 0) {
      return Alert.alert('Cart Empty', 'Your cart is empty.');
    }
    if (!street.trim() || !city.trim()) {
      return Alert.alert('Missing Address', 'Please enter your delivery address.');
    }

    const normalizedPhone = normalizeEthPhone(phone);
    if (!normalizedPhone) {
      return Alert.alert(
        'Invalid Phone',
        'Please enter a valid Ethiopian phone number (e.g. 0912 345 678 or +251 912 345 678).'
      );
    }

    setLoading(true);
    try {
      const created = await placeOrder({
        paymentMethod: payment,
        deliveryAddress: {
          street: street.trim(),
          city: city.trim(),
          phone: normalizedPhone, // ✅ normalized, Chapa-ready
        },
        notes: notes.trim() || undefined,
      });

      // Loosely read the order id/total (Order type is not fully typed)
      const order: any = created;
      const orderId: string =
        order?.id || order?._id || order?.data?.id || '';
      const orderTotal: number =
        order?.totalAmount ??
        order?.total ??
        order?.data?.totalAmount ??
        computedTotal;

      if (!orderId) {
        throw new Error('Order was created but no order id was returned.');
      }

      if (payment === 'chapa') {
        // 💳 Online payment → open Chapa checkout
        navigation.replace('ChapaPayment', { orderId, total: orderTotal });
      } else {
        // 💵 Cash on delivery → straight to success
        navigation.replace('OrderSuccess', { orderId, total: orderTotal });
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to place order. Please try again.';
      Alert.alert('Order Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: SIZES.md }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Order Summary ─── */}
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            {cart.map((item) => (
              <View key={item.foodId} style={styles.summaryRow}>
                <Text style={styles.summaryQty}>{item.quantity}×</Text>
                <Text style={styles.summaryName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.summaryPrice}>
                  {formatPrice(item.price * item.quantity)}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatPrice(cartTotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.summaryValue}>
                {formatPrice(computedDelivery)}
              </Text>
            </View>
            {VAT_ENABLED && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>VAT (15%)</Text>
                <Text style={styles.summaryValue}>
                  {formatPrice(computedVat)}
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatPrice(computedTotal)}
              </Text>
            </View>
          </View>

          {/* ─── Delivery Address ─── */}
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.card}>
            <Ionicons name="location" size={22} color={COLORS.primary} />
            <View style={{ flex: 1, marginLeft: SIZES.md }}>
              <Text style={styles.cardTitle}>Home</Text>
              <Text style={styles.cardText}>
                {street ? `${street}, ${city}` : `Enter your address in ${city}`}
              </Text>
            </View>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Street address (e.g. Bole Road, Kazanchis)"
            value={street}
            onChangeText={setStreet}
            placeholderTextColor={COLORS.gray}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="City / Sub-city"
            value={city}
            onChangeText={setCity}
            placeholderTextColor={COLORS.gray}
            editable={!loading}
          />

          {/* ─── Phone ─── */}
          <Text style={styles.sectionTitle}>Phone Number</Text>
          <View style={styles.card}>
            <Ionicons name="call" size={22} color={COLORS.primary} />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: 'transparent' }]}
              placeholder="+251 912 345 678"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.gray}
              editable={!loading}
            />
          </View>

          {/* ─── Notes ─── */}
          <Text style={styles.sectionTitle}>Order Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Ring the bell, leave at door, etc."
            value={notes}
            onChangeText={setNotes}
            placeholderTextColor={COLORS.gray}
            multiline
            editable={!loading}
          />

          {/* ─── Payment Method ─── */}
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {PAYMENT_METHODS.map((method) => {
            const selected = payment === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                style={[styles.paymentOption, selected && styles.paymentSelected]}
                onPress={() => setPayment(method.id)}
                disabled={loading}
              >
                <Ionicons
                  name={method.icon as any}
                  size={22}
                  color={selected ? COLORS.primary : COLORS.gray}
                />
                <View style={styles.paymentTextWrap}>
                  <Text
                    style={[
                      styles.paymentText,
                      selected && styles.paymentTextSelected,
                    ]}
                  >
                    {method.label}
                  </Text>
                  <Text style={styles.paymentHint}>{method.hint}</Text>
                </View>
                {selected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={COLORS.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}

          <View style={{ height: SIZES.xl }} />
        </ScrollView>

        {/* ─── Footer ─── */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalPrice}>
              {formatPrice(computedTotal)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.placeBtn, loading && { opacity: 0.6 }]}
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name={payment === 'chapa' ? 'lock-closed' : 'checkmark-circle'}
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.placeBtnText}>
                  {payment === 'chapa' ? 'Pay Now' : 'Place Order'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
  },
  headerTitle: { ...FONTS.h3, color: COLORS.dark },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.dark,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
  },
  summaryCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryQty: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '700',
    width: 36,
  },
  summaryName: { ...FONTS.body, color: COLORS.dark, flex: 1 },
  summaryPrice: { ...FONTS.body, color: COLORS.dark, fontWeight: '600' },
  summaryLabel: { ...FONTS.body, color: COLORS.gray },
  summaryValue: { ...FONTS.body, color: COLORS.dark, fontWeight: '600' },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.sm,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.sm,
    marginTop: SIZES.sm,
  },
  totalLabel: { ...FONTS.h4, color: COLORS.dark },
  totalValue: { ...FONTS.h3, color: COLORS.primary },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
  },
  cardTitle: { ...FONTS.h4, color: COLORS.dark },
  cardText: { ...FONTS.small, color: COLORS.gray, marginTop: 2 },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md,
    height: 48,
    marginBottom: SIZES.sm,
    ...FONTS.body,
    color: COLORS.dark,
  },
  notesInput: {
    height: 80,
    paddingTop: SIZES.sm,
    textAlignVertical: 'top',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
  },
  paymentSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5F1',
  },
  paymentTextWrap: { flex: 1, marginLeft: SIZES.md },
  paymentText: {
    ...FONTS.body,
    color: COLORS.gray,
  },
  paymentTextSelected: { color: COLORS.dark, fontWeight: '600' },
  paymentHint: { ...FONTS.small, color: COLORS.gray, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  totalPrice: { ...FONTS.h3, color: COLORS.primary },
  placeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    minWidth: 160,
  },
  placeBtnText: {
    ...FONTS.h4,
    color: COLORS.white,
    marginLeft: SIZES.sm,
  },
});

export default CheckoutScreen;