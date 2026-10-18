import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp, CartItem } from '../context/AppContext';
import { COLORS, SIZES, FONTS } from '../utils/theme';
import { formatPrice } from '../utils/format'; // ✅ ETB formatter

const FavoritesScreen = ({ navigation }: any) => {
  const { favorites, toggleFavorite, addToCart } = useApp();

  const handleRemove = (item: CartItem) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${item.name}" from favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => toggleFavorite(item),
        },
      ]
    );
  };

  const handleAddToCart = async (item: CartItem) => {
    try {
      await addToCart({
        foodId: item.foodId,
        name: item.name,
        price: item.price,
        image: item.image,
      });
      Alert.alert('Added ✅', `${item.name} added to cart`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add to cart');
    }
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardMain}
        onPress={() => navigation.navigate('FoodDetail', { food: item })}
      >
        <Image source={{ uri: item.image }} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          {/* ✅ Changed to ETB */}
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => handleAddToCart(item)}
        >
          <Ionicons name="cart" size={18} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => handleRemove(item)}
        >
          <Ionicons name="heart" size={22} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={{ width: 24 }} />
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color={COLORS.gray} />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>
            Tap the heart on any dish to save it
          </Text>
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
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item) => item.foodId}
          contentContainerStyle={{ padding: SIZES.md }}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerTitle: { ...FONTS.h3, color: COLORS.dark },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.sm,
    marginBottom: SIZES.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: { width: 70, height: 70, borderRadius: SIZES.radius },
  info: { flex: 1, marginLeft: SIZES.md },
  name: { ...FONTS.h4, color: COLORS.dark, marginBottom: 4 },
  price: { ...FONTS.body, color: COLORS.primary, fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.sm,
  },
  heartBtn: { padding: SIZES.sm },
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
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },
  browseBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
  },
  browseBtnText: { ...FONTS.h4, color: COLORS.white },
});

export default FavoritesScreen;