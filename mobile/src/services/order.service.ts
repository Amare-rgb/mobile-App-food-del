// src/services/order.service.ts
import api from "../utils/api";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

// ✅ Matches Prisma OrderStatus enum (lowercase)
export type OrderStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "preparing"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cash" | "chapa";
export type PaymentStatus = "pending" | "paid" | "failed";

// ═══════════════════════════════════════════
// DeliveryAddress — accepts BOTH styles
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
  paymentMethod?: PaymentMethod;
  deliveryAddress?: DeliveryAddress;
  deliveryAddr?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  notes?: string;
}

// ═══════════════════════════════════════════
// Customer order service
// ═══════════════════════════════════════════
export const orderService = {
  // ── Create ──
  create: (data: CreateOrderPayload) =>
    api.post("/orders", data).then((r) => r.data),

  // ── List mine (customer's own or courier's own) ──
  getMyOrders: (params?: { status?: OrderStatus; page?: number; limit?: number }) =>
    api.get("/orders/my", { params }).then((r) => r.data),

  // ── Get one ──
  getOne: (id: string) =>
    api.get(`/orders/${id}`).then((r) => r.data),

  // ═══════════════════════════════════════
  // 🛵 Courier methods
  // ═══════════════════════════════════════

  // List approved + unassigned orders (couriers see this to accept)
  listPending: () =>
    api.get("/orders/pending/list").then((r) => r.data),

  // Couriers accept an order
  accept: (id: string) =>
    api.post(`/orders/${id}/accept`).then((r) => r.data),

  // Couriers advance status: preparing → picked_up → on_the_way → delivered
  // Admins can use this too (any status)
  updateStatus: (id: string, status: OrderStatus) =>
    api.patch(`/orders/${id}/status`, { status }).then((r) => r.data),

  // ═══════════════════════════════════════
  // Convenience wrappers (courier flow)
  // ═══════════════════════════════════════
  markPickedUp: (id: string) =>
    orderService.updateStatus(id, "picked_up"),

  markOnTheWay: (id: string) =>
    orderService.updateStatus(id, "on_the_way"),

  markDelivered: (id: string) =>
    orderService.updateStatus(id, "delivered"),

  // ═══════════════════════════════════════
  // Admin methods (some overlap with adminService)
  // ═══════════════════════════════════════
  listAll: (params?: { status?: OrderStatus; page?: number; limit?: number }) =>
    api.get("/orders/all", { params }).then((r) => r.data),

  getStats: () =>
    api.get("/orders/stats").then((r) => r.data.data),

  deleteOrder: (id: string) =>
    api.delete(`/orders/${id}`).then((r) => r.data),
};

export default orderService;