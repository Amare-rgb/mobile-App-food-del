// src/services/order.service.ts
import api from '../utils/api';

// ═══════════════════════════════════════════
// DeliveryAddress — flexible shape that
// accepts BOTH styles your app uses:
//   • { street, city, phone }  → CheckoutScreen
//   • { lat, lng, address }    → legacy / courier map
// ═══════════════════════════════════════════
export interface DeliveryAddress {
  street?: string;
  city?: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface CreateOrderPayload {
  items: { foodId: string; quantity: number }[];
  paymentMethod: string;
  deliveryAddress: DeliveryAddress;
  deliveryAddr?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  notes?: string;
}

export const orderService = {
  create: (data: CreateOrderPayload) =>
    api.post('/orders', data).then((r) => r.data),

  getMyOrders: () =>
    api.get('/orders/my').then((r) => r.data),

  getOne: (id: string) =>
    api.get(`/orders/${id}`).then((r) => r.data),
};

export default orderService;