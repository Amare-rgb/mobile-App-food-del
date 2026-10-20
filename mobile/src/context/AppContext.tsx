import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/auth.service';
import {
  orderService,
  PaymentMethod, // ✅ import the type that fixes the TS error
} from '../services/order.service';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

// ✅ Matches Prisma Role enum — 'courier' not 'rider'
export type Role = 'customer' | 'courier' | 'admin';

export interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatarUrl?: string; // ✅ renamed from `avatar`
}

export interface CartItem {
  foodId: string;
  name: string;
  price: number;
  imageUrl?: string; // ✅ renamed from `image`
  quantity: number;
}

export interface DeliveryAddress {
  street?: string;
  city?: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface Order {
  id: string;
  _id: string;
  total: number;
  totalAmount: number;
  status: string;
  items: any[];
  createdAt: string;
  deliveryAddr?: string;
  deliveryLat?: number;
  deliveryLng?: number;
}

// ═══════════════════════════════════════════
// Context type
// ═══════════════════════════════════════════

interface AppContextType {
  user: User | null;
  token: string | null;
  cart: CartItem[];
  favorites: CartItem[];
  orders: Order[];
  cartTotal: number;
  cartCount: number;
  loading: boolean;
  isAdmin: boolean;

  // Cart
  addToCart: (item: {
    foodId: string;
    name: string;
    price: number;
    imageUrl?: string; // ✅
  }) => Promise<void>;
  removeFromCart: (foodId: string) => Promise<void>;
  updateQuantity: (foodId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleFavorite: (item: {
    foodId: string;
    name: string;
    price: number;
    imageUrl?: string; // ✅
  }) => Promise<void>;

  // Auth
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string
  ) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Orders
  placeOrder: (data: {
    paymentMethod: PaymentMethod; // ✅ narrowed from `string`
    deliveryAddress: DeliveryAddress;
    deliveryLat?: number;
    deliveryLng?: number;
    deliveryAddr?: string;
    notes?: string;
  }) => Promise<Order>;
  refreshOrders: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ═══════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Bootstrap ───
  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bootstrap = async () => {
    try {
      const [storedToken, storedUser, storedCart, storedFav] =
        await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('cart'),
          AsyncStorage.getItem('favorites'),
        ]);

      if (storedCart) setCart(JSON.parse(storedCart));
      if (storedFav) setFavorites(JSON.parse(storedFav));

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        try {
          const res = await authService.me();
          const freshUser: User = res.user;
          setUser(freshUser);
          await AsyncStorage.setItem('user', JSON.stringify(freshUser));
          await refreshOrders();
        } catch (err) {
          await AsyncStorage.multiRemove(['token', 'user']);
          setToken(null);
          setUser(null);
        }
      }
    } catch (e) {
      console.log('Bootstrap error:', e);
    } finally {
      setLoading(false);
    }
  };

  // ─── Cart ───
  const saveCart = async (newCart: CartItem[]) => {
    setCart(newCart);
    await AsyncStorage.setItem('cart', JSON.stringify(newCart));
  };

  const addToCart = async (item: {
    foodId: string;
    name: string;
    price: number;
    imageUrl?: string;
  }) => {
    const existing = cart.find((c) => c.foodId === item.foodId);
    const newCart = existing
      ? cart.map((c) =>
          c.foodId === item.foodId ? { ...c, quantity: c.quantity + 1 } : c
        )
      : [...cart, { ...item, quantity: 1 }];

    await saveCart(newCart);
  };

  const removeFromCart = async (foodId: string) => {
    await saveCart(cart.filter((c) => c.foodId !== foodId));
  };

  const updateQuantity = async (foodId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(foodId);
      return;
    }
    await saveCart(
      cart.map((c) => (c.foodId === foodId ? { ...c, quantity } : c))
    );
  };

  const clearCart = async () => {
    setCart([]);
    await AsyncStorage.removeItem('cart');
  };

  const toggleFavorite = async (item: {
    foodId: string;
    name: string;
    price: number;
    imageUrl?: string;
  }) => {
    const exists = favorites.find((f) => f.foodId === item.foodId);
    const newFav = exists
      ? favorites.filter((f) => f.foodId !== item.foodId)
      : [...favorites, { ...item, quantity: 1 }];

    setFavorites(newFav);
    await AsyncStorage.setItem('favorites', JSON.stringify(newFav));
  };

  // ─── AUTH ───
  const login = async (email: string, password: string): Promise<User> => {
    const res = await authService.login({ email, password });
    const loggedInUser: User = res.user;

    setUser(loggedInUser);
    setToken(res.token);
    await AsyncStorage.setItem('token', res.token);
    await AsyncStorage.setItem('user', JSON.stringify(loggedInUser));

    try {
      await refreshOrders();
    } catch (e) {
      console.log('Orders load failed after login:', e);
    }

    return loggedInUser;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone?: string
  ): Promise<User> => {
    const res = await authService.register({ name, email, password, phone });
    const newUser: User = res.user;

    setUser(newUser);
    setToken(res.token);
    await AsyncStorage.setItem('token', res.token);
    await AsyncStorage.setItem('user', JSON.stringify(newUser));

    return newUser;
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setCart([]);
    setFavorites([]);
    setOrders([]);
    await AsyncStorage.multiRemove(['token', 'user', 'cart', 'favorites']);
  };

  // ─── REFRESH USER ───
  const refreshUser = async () => {
    try {
      const res = await authService.me();
      if (res?.user) {
        setUser(res.user);
        await AsyncStorage.setItem('user', JSON.stringify(res.user));
      }
    } catch (e) {
      console.log('refreshUser error:', e);
    }
  };

  // ─── Orders ───
  const placeOrder = async (data: {
    paymentMethod: PaymentMethod; // ✅ narrowed
    deliveryAddress: DeliveryAddress;
    deliveryLat?: number;
    deliveryLng?: number;
    deliveryAddr?: string;
    notes?: string;
  }): Promise<Order> => {
    if (cart.length === 0) throw new Error('Cart is empty');

    // Build a flat deliveryAddr string for the legacy backend field
    const flatAddr =
      data.deliveryAddr ||
      data.deliveryAddress?.address ||
      [data.deliveryAddress?.street, data.deliveryAddress?.city]
        .filter(Boolean)
        .join(', ');

    // ✅ Accept lat/lng from EITHER top-level OR deliveryAddress
    const lat = data.deliveryLat ?? data.deliveryAddress?.lat ?? 0;
    const lng = data.deliveryLng ?? data.deliveryAddress?.lng ?? 0;

    const payload = {
      items: cart.map((c) => ({ foodId: c.foodId, quantity: c.quantity })),
      paymentMethod: data.paymentMethod, // ✅ PaymentMethod — matches CreateOrderPayload
      deliveryAddress: data.deliveryAddress,
      deliveryAddr: flatAddr,
      deliveryLat: lat,
      deliveryLng: lng,
      notes: data.notes,
    };

    // Backend responds: { success: true, data: {...order} }
    const res = await orderService.create(payload);
    await clearCart();
    await refreshOrders();
    return res.data;
  };

  const refreshOrders = async () => {
    try {
      const res = await orderService.getMyOrders();
      setOrders(res.data || []);
    } catch (e) {
      console.log('Orders fetch error:', e);
    }
  };

  // ─── Derived ───
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const isAdmin = user?.role === 'admin';

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        cart,
        favorites,
        orders,
        cartTotal,
        cartCount,
        loading,
        isAdmin,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleFavorite,
        login,
        register,
        logout,
        refreshUser,
        placeOrder,
        refreshOrders,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};