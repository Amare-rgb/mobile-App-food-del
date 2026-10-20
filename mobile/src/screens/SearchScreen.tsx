import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient, ENDPOINTS } from '../utils/api';
import { COLORS, SIZES, FONTS } from '../utils/theme';
import { formatPrice } from '../utils/format';

type Food = {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  categoryId?: string;
  rating?: number;
};

const getId = (f: any): string => f?.id || f?._id || '';

const SearchScreen = ({ navigation }: any) => {
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load all foods once (search runs locally, fast) ───
  const loadFoods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<any>(ENDPOINTS.FOODS);
      // apiClient already unwraps r.data, so `res` may be an array
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.foods)
        ? res.foods
        : [];
      setFoods(list);
    } catch (e: any) {
      console.error('Search load error:', e?.message);
      setError('Could not load foods. Pull to retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFoods();
  }, [loadFoods]);

  // ─── Debounced client-side search ───
  const filtered = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return foods.filter((f) => {
      const name = (f.name || '').toLowerCase();
      const desc = (f.description || '').toLowerCase();
      const cat = (f.category || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }, [foods, query]);

  const handleChange = (t: string) => {
    setQuery(t);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Reserved for future server-side search; currently debounce is a no-op
    debounceRef.current = setTimeout(() => {}, 300);
  };

  // ✅ Search tab — goBack isn't meaningful here; instead go to Home
  const goHome = () => {
    navigation.navigate('CustomerTabs', { screen: 'Home' });
  };

  const renderItem = ({ item }: { item: Food }) => {
    const imageUri = item.imageUrl || '';
    const hasImage = imageUri.trim().length > 0;

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => navigation.navigate('FoodDetail', { food: item })}
        activeOpacity={0.8}
      >
        {hasImage ? (
          <Image source={{ uri: imageUri }} style={styles.resultImage} />
        ) : (
          <View style={[styles.resultImage, styles.placeholder]}>
            <Ionicons
              name="fast-food-outline"
              size={28}
              color={COLORS.gray}
            />
          </View>
        )}
        <View style={styles.resultInfo}>
          <Text style={styles.resultName} numberOfLines={1}>
            {item.name}
          </Text>
          {!!item.description && (
            <Text style={styles.resultDesc} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <Text style={styles.resultPrice}>{formatPrice(item.price)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goHome}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={COLORS.gray} />
        <TextInput
          style={styles.input}
          placeholder="Search food, categories..."
          value={query}
          onChangeText={handleChange}
          autoFocus
          autoCapitalize="none"
          placeholderTextColor={COLORS.gray}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      ) : error ? (
        <TouchableOpacity style={styles.center} onPress={loadFoods}>
          <Ionicons name="refresh" size={40} color={COLORS.primary} />
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => getId(item)}
          contentContainerStyle={{ padding: SIZES.md }}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {query
                ? `No results for "${query}"`
                : 'Search for your favorite food 🍔'}
            </Text>
          }
        />
      )}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    marginHorizontal: SIZES.md,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md,
    height: 50,
  },
  input: { flex: 1, marginLeft: SIZES.sm, ...FONTS.body, color: COLORS.dark },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.md,
    padding: SIZES.sm,
    elevation: 2,
  },
  resultImage: { width: 80, height: 80, borderRadius: SIZES.radius },
  placeholder: {
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: { flex: 1, marginLeft: SIZES.md, justifyContent: 'center' },
  resultName: { ...FONTS.h4, color: COLORS.dark, marginBottom: 2 },
  resultDesc: { ...FONTS.small, color: COLORS.gray, marginBottom: 4 },
  resultPrice: { ...FONTS.body, color: COLORS.primary, fontWeight: '700' },
  emptyText: {
    ...FONTS.body,
    textAlign: 'center',
    color: COLORS.gray,
    marginTop: SIZES.xl,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...FONTS.body, color: COLORS.gray, marginTop: SIZES.sm },
  errorText: {
    ...FONTS.body,
    color: COLORS.primary,
    marginTop: SIZES.sm,
    textAlign: 'center',
    paddingHorizontal: SIZES.lg,
  },
});

export default SearchScreen;