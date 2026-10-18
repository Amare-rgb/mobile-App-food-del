import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp, CartItem } from '../context/AppContext';
import { COLORS, SIZES, FONTS } from '../utils/theme';
import { formatPrice } from '../utils/format';   // ✅ ETB formatter

const DELIVERY_FEE = 150;   // ETB
const VAT_ENABLED = false;
const VAT_RATE = 0.15;

const CartScreen = ({ navigation }: any) => {
  const { cart, cartTotal, updateQuantity, removeFromCart, clearCart } = useApp();

  const delivery = cart.length > 0 ? DELIVERY_FEE : 0;
  const vat = VAT_ENABLED ? cartTotal * VAT_RATE : 0;
  const total = cartTotal + delivery + vat;

  const handleRemove = (foodId: string, name: string) => {
    Alert.alert('Remove Item', `Remove "${name}" from cart?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeFromCart(foodId),
      },
    ]);
  };

  const handleClear = () => {
    Alert.alert('Clear Cart', 'Remove all items from cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearCart },
    ]);
  };

  const renderItem = ({ item }: { item: CartItem }) => {
    const lineTotal = Number(item.price) * Number(item.quantity);

    return (
      <View style={styles.item}>
        <Image source={{ uri: item.image }} style={styles.itemImage} />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>

          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQuantity(item.foodId, item.quantity - 1)}
            >
              <Ionicons name="remove" size={16} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQuantity(item.foodId, item.quantity + 1)}
            >
              <Ionicons name="add" size={16} color={COLORS.primary} />
            </TouchableOpacity>

            <Text style={styles.lineTotal}>{formatPrice(lineTotal)}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleRemove(item.foodId, item.name)}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Empty Cart ───
  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Cart</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={COLORS.gray} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Add items to get started</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            // ✅ FIXED: Navigate to the Home tab inside CustomerTabs
            onPress={() =>
              navigation.navigate('CustomerTabs', { screen: 'Home' })
            }
          >
            <Text style={styles.browseBtnText}>Browse Foods</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Cart with items ───
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Cart</Text>
          <Text style={styles.headerCount}>
            {cart.length} {cart.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cart}
        renderItem={renderItem}
        keyExtractor={(item) => item.foodId}
        contentContainerStyle={{ padding: SIZES.md }}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatPrice(cartTotal)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={styles.summaryValue}>{formatPrice(delivery)}</Text>
        </View>

        {VAT_ENABLED && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>VAT (15%)</Text>
            <Text style={styles.summaryValue}>{formatPrice(vat)}</Text>
          </View>
        )}

        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPrice(total)}</Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() =>
            navigation.navigate('Checkout', {
              total,
              delivery,
              vat,
              itemCount: cart.length,
            })
          }
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
  },
  headerTitle: { ...FONTS.h2, color: COLORS.dark },
  headerCount: { ...FONTS.small, color: COLORS.gray, marginTop: 2 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  clearText: {
    ...FONTS.small,
    color: COLORS.danger,
    fontWeight: '600',
    marginLeft: 4,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.md,
    padding: SIZES.sm,
    elevation: 2,
    alignItems: 'center',
  },
  itemImage: { width: 80, height: 80, borderRadius: SIZES.radius },
  itemInfo: { flex: 1, marginLeft: SIZES.md },
  itemName: { ...FONTS.h4, color: COLORS.dark, marginBottom: 4 },
  itemPrice: {
    ...FONTS.small,
    color: COLORS.gray,
    marginBottom: 6,
  },
  quantityRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.dark,
    marginHorizontal: SIZES.md,
  },
  lineTotal: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  deleteBtn: { padding: SIZES.sm },
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
  summary: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  summaryLabel: { ...FONTS.body, color: COLORS.gray },
  summaryValue: { ...FONTS.body, fontWeight: '600', color: COLORS.dark },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.md,
    marginTop: SIZES.sm,
  },
  totalLabel: { ...FONTS.h4, color: COLORS.dark },
  totalValue: { ...FONTS.h3, color: COLORS.primary },
  checkoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    marginTop: SIZES.md,
  },
  checkoutBtnText: {
    ...FONTS.h4,
    color: COLORS.white,
    marginRight: SIZES.sm,
  },
});

export default CartScreen;