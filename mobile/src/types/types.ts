// ═══════════════════════════════════════════════════════════
// App-wide Type Definitions
// Location: src/utils/types.ts
// ═══════════════════════════════════════════════════════════

// ─── Roles ───
export type Role = 'customer' | 'courier' | 'admin';

// ─── User ───
export interface User {
  id: string;
  _id: string; // legacy compatibility
  name: string;
  email: string;
  role: Role;
  phone?: string;
  fcmToken?: string;
  createdAt?: string;
}

// ─── Category ───
export interface Category {
  id: string;
  name: string;
  icon: string;
}

// ─── Restaurant ───
export interface Restaurant {
  id: string;
  _id?: string;
  name: string;
  image: string;
  lat?: number;
  lng?: number;
  rating?: number;
  deliveryTime?: string;
  deliveryFee?: number;
  distance?: string;
  category?: string;
  isOpen?: boolean;
}

// ─── Food / MenuItem ───
export interface Food {
  id: string;
  _id?: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  rating?: number;
  category?: string;
  isPopular?: boolean;
}

// ─── Cart Item ───
export interface CartItem extends Food {
  quantity: number;
  restaurantName?: string;
}

// ─── Order ───
export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'PENDING'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Order {
  id: string;
  _id?: string;
  customerId?: string;
  courierId?: string;
  restaurantId?: string;
  restaurantName?: string;
  restaurant?: {
    id: string;
    name: string;
    image?: string;
  };
  courier?: {
    id: string;
    name: string;
    phone?: string;
  };
  user?: {
    name: string;
  };
  items: any[] | number;
  total?: number;
  totalAmount?: number;
  status: OrderStatus;
  deliveryAddr?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  createdAt: string;
  date?: string;
}