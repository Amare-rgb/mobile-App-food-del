import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, SIZES, FONTS } from '../utils/theme';
import { formatPrice } from '../utils/format';   // ✅ ETB formatter

type Food = {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  rating?: number;
  category?: string;
};

const FoodDetailScreen = ({ route, navigation }: any) => {
  const food: Food = route.params.food;
  const foodId: string = food._id || food.id || '';

  const { addToCart, favorites, toggleFavorite, cartCount } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const isFavorite = favorites.some((f: any) => f.foodId === foodId);

  // ✅ FoodDetail lives in the root stack and Cart is a tab inside CustomerTabs,
  // so we must navigate through the parent navigator by name.
  const goToCart = () => {
    navigation.navigate('CustomerTabs', { screen: 'Cart' });
  };

  const handleFavorite = async () => {
    await toggleFavorite({
      foodId,
      name: food.name,
      price: food.price,
      image: food.image,
    });
  };

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      for (let i = 0; i < quantity; i++) {
        await addToCart({
          foodId,
          name: food.name,
          price: food.price,
          image: food.image,
        });
      }

      Alert.alert('Added to Cart ✅', `${quantity} × ${food.name}`, [
        { text: 'Keep Shopping', style: 'cancel' },
        { text: 'Go to Cart', onPress: goToCart },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add to cart');
    } finally {
      setAdding(false);
    }
  };

  const lineTotal = Number(food.price || 0) * quantity;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SIZES.xl }}
      >
        <View>
          <Image source={{ uri: food.image }} style={styles.image} />

          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          {/* Favorite */}
          <TouchableOpacity style={styles.favBtn} onPress={handleFavorite}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? COLORS.danger : COLORS.white}
            />
          </TouchableOpacity>

          {/* Cart */}
          <TouchableOpacity style={styles.cartBtn} onPress={goToCart}>
            <Ionicons name="cart" size={22} color={COLORS.white} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartCount > 99 ? '99+' : cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* ─── Title row with price chip ─── */}
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={2}>
              {food.name}
            </Text>
            <View style={styles.priceChip}>
              <Text style={styles.priceChipText}>
                {formatPrice(food.price)}
              </Text>
            </View>
          </View>

          {/* ─── Rating + category ─── */}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={COLORS.secondary} />
            <Text style={styles.ratingText}>
              {Number(food.rating ?? 4.5).toFixed(1)}
            </Text>
            {!!food.category && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.category}>{food.category}</Text>
              </>
            )}
          </View>

          {/* ─── Description ─── */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {food.description || 'No description available for this item.'}
          </Text>

          {/* ─── Unit price line ─── */}
          <View style={styles.unitPriceRow}>
            <Ionicons name="pricetag-outline" size={16} color={COLORS.gray} />
            <Text style={styles.unitPriceText}>
              Unit price: {formatPrice(food.price)}
            </Text>
          </View>

          {/* ─── Quantity ─── */}
          <View style={styles.quantityRow}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={quantity <= 1 ? COLORS.gray : COLORS.primary}
                />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Ionicons name="add" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ─── Footer: total + add to cart ─── */}
      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.totalLabel}>Total Price</Text>
          <Text style={styles.totalPrice}>{formatPrice(lineTotal)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, adding && { opacity: 0.6 }]}
          onPress={handleAddToCart}
          disabled={adding}
        >
          <Ionicons name="cart" size={20} color={COLORS.white} />
          <Text style={styles.addBtnText}>
            {adding ? 'Adding...' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  image: { width: '100%', height: 280 },
  backBtn: {
    position: 'absolute',
    top: SIZES.md,
    left: SIZES.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favBtn: {
    position: 'absolute',
    top: SIZES.md,
    right: SIZES.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBtn: {
    position: 'absolute',
    bottom: SIZES.md,
    right: SIZES.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.danger,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  content: { padding: SIZES.md },

  // ─── Title + price chip ───
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  name: { ...FONTS.h2, color: COLORS.dark, flex: 1, marginRight: SIZES.sm },
  priceChip: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  priceChipText: {
    ...FONTS.small,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ─── Rating row ───
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  ratingText: { ...FONTS.body, color: COLORS.dark, marginLeft: 4 },
  metaDot: { color: COLORS.gray, marginHorizontal: 8 },
  category: { ...FONTS.body, color: COLORS.gray },

  // ─── Sections ───
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.dark,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
  },
  description: { ...FONTS.body, color: COLORS.gray, lineHeight: 22 },

  // ─── Unit price ───
  unitPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.md,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.sm,
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
  },
  unitPriceText: {
    ...FONTS.small,
    color: COLORS.dark,
    marginLeft: 6,
    fontWeight: '600',
  },

  // ─── Quantity ───
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZES.md,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    padding: 4,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: { ...FONTS.h4, color: COLORS.dark, marginHorizontal: SIZES.md },

  // ─── Footer ───
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  totalLabel: { ...FONTS.small, color: COLORS.gray },
  totalPrice: { ...FONTS.h3, color: COLORS.primary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
  },
  addBtnText: {
    ...FONTS.h4,
    color: COLORS.white,
    marginLeft: SIZES.sm,
  },
});

export default FoodDetailScreen;