import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FOODS } from '../data/mockData';
import { COLORS, SIZES, FONTS } from '../utils/theme';
import { Food } from '../types/types';

const SearchScreen = ({ navigation }: any) => {
  const [query, setQuery] = useState('');
  const results = query
    ? FOODS.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={COLORS.gray} />
        <TextInput
          style={styles.input}
          placeholder="Search food, restaurants..."
          value={query}
          onChangeText={setQuery}
          autoFocus
          placeholderTextColor={COLORS.gray}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SIZES.md }}
        renderItem={({ item }: { item: Food }) => (
          <TouchableOpacity
            style={styles.resultCard}
            onPress={() => navigation.navigate('FoodDetail', { food: item })}
          >
            <Image source={{ uri: item.image }} style={styles.resultImage} />
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultDesc} numberOfLines={1}>{item.description}</Text>
              <Text style={styles.resultPrice}>${item.price.toFixed(2)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query ? (
            <Text style={styles.emptyText}>No results for "{query}"</Text>
          ) : (
            <Text style={styles.emptyText}>Search for your favorite food 🍔</Text>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.md,
  },
  headerTitle: { ...FONTS.h3, color: COLORS.dark },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    marginHorizontal: SIZES.md, borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md, height: 50,
  },
  input: { flex: 1, marginLeft: SIZES.sm, ...FONTS.body, color: COLORS.dark },
  resultCard: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderRadius: SIZES.radius, marginBottom: SIZES.md,
    padding: SIZES.sm, elevation: 2,
  },
  resultImage: { width: 80, height: 80, borderRadius: SIZES.radius },
  resultInfo: { flex: 1, marginLeft: SIZES.md, justifyContent: 'center' },
  resultName: { ...FONTS.h4, color: COLORS.dark, marginBottom: 2 },
  resultDesc: { ...FONTS.small, color: COLORS.gray, marginBottom: 4 },
  resultPrice: { ...FONTS.body, color: COLORS.primary, fontWeight: '700' },
  emptyText: { ...FONTS.body, textAlign: 'center', color: COLORS.gray, marginTop: SIZES.xl },
});

export default SearchScreen;