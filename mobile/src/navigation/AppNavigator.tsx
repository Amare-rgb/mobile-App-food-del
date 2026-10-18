import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

import { useApp } from '../context/AppContext';
import { COLORS, FONTS, SIZES } from '../utils/theme';

// ─── Auth screens ───
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';

// ─── Customer screens ───
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import FoodDetailScreen from '../screens/FoodDetailScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import ChapaPaymentScreen from '../screens/ChapaPaymentScreen';
import OrderSuccessScreen from '../screens/OrderSuccessScreen';
import OrdersScreen from '../screens/OrdersScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

// ─── Admin Drawer ───
import AdminDrawerNavigator from './AdminDrawerNavigator';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  CustomerTabs: undefined;
  AdminDrawer: undefined;
  FoodDetail: { food?: any; foodId?: string };
  Checkout:
    | { total?: number; delivery?: number; vat?: number; itemCount?: number }
    | undefined;
  ChapaPayment: { orderId: string; total: number };
  OrderSuccess: { orderId?: string; total?: number } | undefined;
  Favorites: undefined;
  CartModal: undefined;
  EditProfile: undefined;
};

export type CustomerTabParamList = {
  Home: undefined;
  Search: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<CustomerTabParamList>();

// ═══════════════════════════════════════════
// CUSTOMER BOTTOM TABS
// ═══════════════════════════════════════════
const CustomerTabs: React.FC = () => {
  const { cartCount } = useApp();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Search') iconName = 'search';
          else if (route.name === 'Cart') iconName = 'cart';
          else if (route.name === 'Orders') iconName = 'receipt';
          else if (route.name === 'Profile') iconName = 'person';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarBadge:
          route.name === 'Cart' && cartCount > 0 ? cartCount : undefined,
        tabBarBadgeStyle: { backgroundColor: COLORS.primary },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// ═══════════════════════════════════════════
// LOADING SCREEN
// ═══════════════════════════════════════════
const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// ═══════════════════════════════════════════
// ROOT NAVIGATOR
// ═══════════════════════════════════════════
const AppNavigator: React.FC = () => {
  const { user, loading } = useApp();

  if (loading) return <LoadingScreen />;

  const role = user?.role?.toLowerCase();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <React.Fragment>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </React.Fragment>
        ) : role === 'admin' ? (
          <React.Fragment>
            <Stack.Screen name="AdminDrawer" component={AdminDrawerNavigator} />
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
            <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="ChapaPayment" component={ChapaPaymentScreen} />
            <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen
              name="CartModal"
              component={CartScreen}
              options={{ presentation: 'modal' }}
            />
          </React.Fragment>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    ...FONTS.body,
    color: COLORS.gray,
    marginTop: SIZES.md,
  },
});

export default AppNavigator;