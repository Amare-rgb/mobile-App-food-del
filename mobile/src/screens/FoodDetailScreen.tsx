import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, SIZES, FONTS } from '../utils/theme';
import { formatPrice } from '../utils/format';

type Food = {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
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

  const goToCart = () => {
    navigation.navigate('CustomerTabs', { screen: 'Cart' });
  };

  const handleFavorite = async () => {
    await toggleFavorite({
      foodId,
      name: food.name,
      price: food.price,
      imageUrl: food.imageUrl,
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
          imageUrl: food.imageUrl,
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
      {/* ✅ Note: The ScrollView no longer has flex: 1, so the content will center itself vertically */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View>
          {food.imageUrl ? (
            <Image source={{ uri: food.imageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="fast-food-outline" size={64} color={COLORS.gray} />
            </View>
          )}

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.favBtn} onPress={handleFavorite}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? COLORS.danger : COLORS.white}
            />
          </TouchableOpacity>

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

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {food.description || 'No description available for this item.'}
          </Text>

          <View style={styles.unitPriceRow}>
            <Ionicons name="pricetag-outline" size={16} color={COLORS.gray} />
            <Text style={styles.unitPriceText}>
              Unit price: {formatPrice(food.price)}
            </Text>
          </View>

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

        {/* ─── Footer moved INSIDE the scroll view ─── */}
        <View style={styles.footer}>
          <View style={styles.totalWrap}>
            <Text style={styles.totalLabel}>Total Price</Text>
            <Text style={styles.totalPrice}>{formatPrice(lineTotal)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, adding && { opacity: 0.6 }]}
            onPress={handleAddToCart}
            disabled={adding}
          >
            <Ionicons name="cart" size={18} color={COLORS.white} />
            <Text style={styles.addBtnText}>
              {adding ? 'Adding...' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center', // ✅ This pushes the whole block (image + content + footer) to the center
    paddingBottom: SIZES.xl,
  },
  image: { width: '100%', height: 280 },
  imagePlaceholder: {
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
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

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  ratingText: { ...FONTS.body, color: COLORS.dark, marginLeft: 4 },
  metaDot: { color: COLORS.gray, marginHorizontal: 8 },
  category: { ...FONTS.body, color: COLORS.gray },

  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.dark,
    marginTop: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  description: { ...FONTS.body, color: COLORS.gray, lineHeight: 22 },

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

  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZES.md,
    marginBottom: SIZES.md, 
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

  // ✅ MODIFIED FOOTER (now inside the scroll view)
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SIZES.lg, // Added margin instead of padding to look like a card
    paddingHorizontal: SIZES.md, 
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius, // Added border radius so it looks like a floating card
    backgroundColor: COLORS.lightGray, // Changed to light gray to stand out from white background
  },
  totalWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  totalLabel: {
    ...FONTS.small,
    color: COLORS.gray,
    marginBottom: 4,
  },
  totalPrice: {
    ...FONTS.h3,
    color: COLORS.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm + 4,
    borderRadius: SIZES.radius,
    minWidth: 140, 
    maxWidth: 160, 
  },
  addBtnText: {
    ...FONTS.h4,
    color: COLORS.white,
    marginLeft: SIZES.sm,
  },
});

export default FoodDetailScreen;