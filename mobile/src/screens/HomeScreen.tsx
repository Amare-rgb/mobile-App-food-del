import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  FlatList, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { apiClient, ENDPOINTS, API_URL } from '../utils/api';
import { COLORS, SIZES, FONTS } from '../utils/theme';
import { formatPrice } from '../utils/format';

const SERVER_URL = API_URL.replace(/\/api\/?$/, '');
const getAvatarUri = (avatar?: string | null): string | null => {
  if (!avatar || !avatar.trim()) return null;
  if (/^(https?:|file:|content:|data:)/i.test(avatar)) return avatar;
  return `${SERVER_URL}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
};

const toList = (res: any, key?: string): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (key && Array.isArray(res?.[key])) return res[key];
  if (key && Array.isArray(res?.data?.[key])) return res.data[key];
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

const norm = (s?: string) => (s || '').trim().toLowerCase();

const HomeScreen = ({ navigation }: any) => {
  const { user, refreshUser, cart } = useApp(); 

  const [categories, setCategories] = useState<any[]>([]);
  const [foods, setFoods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); 
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const avatarUri = getAvatarUri(user?.avatar);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar]);

  const fetchData = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);

      const [catResult, foodResult] = await Promise.allSettled([
        apiClient.get<any>(ENDPOINTS.CATEGORIES),
        apiClient.get<any>(ENDPOINTS.FOODS),
      ]);

      if (catResult.status === 'fulfilled') {
        const list = toList(catResult.value, 'categories');
        setCategories(list);
        setCategoryError(null);
      } else {
        console.error('❌ Categories fetch error:', (catResult.reason as any)?.message);
        setCategoryError('Could not load categories');
      }

      if (foodResult.status === 'fulfilled') {
        const list = toList(foodResult.value, 'foods');
        setFoods(list);
      } else {
        console.error('❌ Foods fetch error:', (foodResult.reason as any)?.message);
        Alert.alert(
          'Connection Error',
          'Could not load foods. Please check your connection and try again.'
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(foods.length === 0);
      refreshUser?.();
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData(false);
    refreshUser?.();
  };

  const selectedCategoryName =
    selectedCategory === 'all'
      ? 'All'
      : categories.find((c) => c.id === selectedCategory)?.name || '';

  const filteredFoods =
    selectedCategory === 'all'
      ? foods
      : foods.filter((f) => {
          if (f.categoryId) return f.categoryId === selectedCategory;
          if (f.category) return norm(f.category) === norm(selectedCategoryName);
          return false;
        });

  const categoryChips = [{ id: 'all', name: 'All', icon: null }, ...categories];

  const renderCategory = ({ item }: { item: any }) => {
    const key = item.id === 'all' ? 'all' : item.id;
    const isSelected = key === selectedCategory;
    return (
      <TouchableOpacity
        style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
        onPress={() => setSelectedCategory(key)}
        activeOpacity={0.8}
      >
        <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFood = (item: any) => {
    const hasImage = typeof item.image === 'string' && item.image.trim().length > 0;

    return (
      <TouchableOpacity
        style={styles.foodCard}
        onPress={() => navigation.navigate('FoodDetail', { food: item })}
        activeOpacity={0.9}
      >
        {hasImage ? (
          <Image source={{ uri: item.image }} style={styles.foodImage} />
        ) : (
          <View style={[styles.foodImage, styles.foodImagePlaceholder]}>
            <Ionicons name="fast-food-outline" size={32} color={COLORS.gray} />
          </View>
        )}

        {item.isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>Popular</Text>
          </View>
        )}
        <View style={styles.foodInfo}>
          <Text style={styles.foodName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.foodBottom}>
            <Text style={styles.foodPrice}>{formatPrice(item.price)}</Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={COLORS.secondary} />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading delicious food...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hello, {user?.name || 'User'}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={COLORS.primary} />
              <Text style={styles.location}>Addis Ababa, Ethiopia</Text>
            </View>
          </View>

          <View style={styles.headerIcons}>
            {/* 🛒 CART BUTTON */}
            <TouchableOpacity
              style={styles.cartBtn}
              onPress={() => {
                try {
                  navigation.navigate('Cart'); // Direct to tab
                } catch (e) {
                  console.log("Cart not found, are you an Admin?");
                }
              }} 
            >
              <Ionicons name="cart-outline" size={24} color={COLORS.dark} />
              {cart?.length > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cart.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* 👤 PROFILE BUTTON */}
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => {
                try {
                  navigation.navigate('Profile'); // Direct to tab
                } catch (e) {
                  console.log("Profile not found, are you an Admin?");
                }
              }}
            >
              {avatarUri && !avatarFailed ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.profileImage}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <Ionicons name="person" size={22} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 🔍 SEARCH BAR */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => {
            try {
              navigation.navigate('Search'); // Direct to tab
            } catch (e) {
              console.log("Search not found, are you an Admin?");
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={20} color={COLORS.gray} />
          <Text style={styles.searchPlaceholder}>Search for food...</Text>
        </TouchableOpacity>

        {/* BANNER */}
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>30% OFF</Text>
            <Text style={styles.bannerSubtitle}>On your first order</Text>
            <TouchableOpacity
              style={styles.bannerBtn}
              onPress={() => {
                try {
                  navigation.navigate('Search');
                } catch (e) {
                  console.log("Search not found");
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.bannerBtnText}>Order Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CATEGORIES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
        </View>

        {categoryError ? (
          <TouchableOpacity onPress={() => fetchData(false)} style={styles.errorBox}>
            <Ionicons name="refresh" size={16} color={COLORS.primary} />
            <Text style={styles.errorText}>{categoryError} — tap to retry</Text>
          </TouchableOpacity>
        ) : (
          <FlatList
            data={categoryChips}
            renderItem={renderCategory}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        )}

        {/* FOODS GRID */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? 'Popular Foods' : selectedCategoryName}
          </Text>
        </View>
        <View style={styles.foodsGrid}>
          {filteredFoods.length > 0 ? (
            filteredFoods.map((item) => (
              <View key={item.id} style={styles.foodGridItem}>
                {renderFood(item)}
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { width: '100%', textAlign: 'center' }]}>
              No foods available in this category
            </Text>
          )}
        </View>

        <View style={{ height: SIZES.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...FONTS.body, color: COLORS.gray, marginTop: SIZES.md },
  emptyText: { ...FONTS.small, color: COLORS.gray, padding: SIZES.md },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.md,
  },
  greeting: { ...FONTS.h3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  location: { ...FONTS.small, marginLeft: 4, color: COLORS.gray },
  
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: { width: 44, height: 44, borderRadius: 22 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    marginHorizontal: SIZES.md,
    marginTop: SIZES.md,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md,
    height: 50,
  },
  searchPlaceholder: { ...FONTS.body, color: COLORS.gray, marginLeft: SIZES.sm },

  banner: {
    margin: SIZES.md,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.white },
  bannerSubtitle: { ...FONTS.body, color: COLORS.white, opacity: 0.9, marginTop: 4 },
  bannerBtn: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    alignSelf: 'flex-start',
    marginTop: SIZES.sm,
  },
  bannerBtnText: { ...FONTS.small, color: COLORS.primary, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  sectionTitle: { ...FONTS.h3 },

  categoriesList: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    marginRight: SIZES.sm,
    minWidth: 90,
  },
  categoryCardSelected: { backgroundColor: COLORS.primary },
  categoryText: { ...FONTS.small, color: COLORS.dark, fontWeight: '600' },
  categoryTextSelected: { color: COLORS.white, fontWeight: '600' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.md,
    padding: SIZES.sm,
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
  },
  errorText: { ...FONTS.small, color: COLORS.primary, marginLeft: 6, fontWeight: '600' },

  foodsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SIZES.sm },
  foodGridItem: { width: '50%', padding: SIZES.sm },
  foodCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  foodImage: { width: '100%', height: 120 },
  foodImagePlaceholder: {
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularText: { fontSize: 10, color: COLORS.white, fontWeight: '600' },
  foodInfo: { padding: SIZES.sm },
  foodName: { ...FONTS.body, fontWeight: '600', marginBottom: 4 },
  foodBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  foodPrice: { ...FONTS.body, color: COLORS.primary, fontWeight: '700' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { ...FONTS.small, marginLeft: 2, color: COLORS.gray },
});

export default HomeScreen;