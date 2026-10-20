import api from "../utils/api";

export type UserRole = "customer" | "courier" | "admin";
export type UserRoleUpper = "CUSTOMER" | "COURIER" | "ADMIN";

// ✅ Matches Prisma OrderStatus enum exactly (lowercase)
export type OrderStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "preparing"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";

// ═══════════════════════════════════════════
// ADMIN SERVICE
// ═══════════════════════════════════════════
export const adminService = {
  // ─── Dashboard ───
  getStats: () => api.get("/orders/stats").then((r) => r.data.data),

  // ─── Orders ───
  getAllOrders: (params?: { status?: OrderStatus; page?: number; limit?: number }) =>
    api.get("/orders/all", { params }).then((r) => r.data),

  getOrder: (id: string) => api.get(`/orders/${id}`).then((r) => r.data),

  // ✅ Accepts any of the 8 statuses — backend converts case-insensitively
  updateOrderStatus: (id: string, status: OrderStatus) =>
    api.patch(`/orders/${id}/status`, { status }).then((r) => r.data),

  // ─── Convenience wrappers (all lowercase) ───
  approveOrder: (id: string) =>
    adminService.updateOrderStatus(id, "approved"),

  rejectOrder: (id: string) =>
    adminService.updateOrderStatus(id, "rejected"),

  // ⚠️ No assignRider endpoint exists on the backend.
  //    Couriers self-accept via POST /orders/:id/accept.
  //    If you want admin-assign later, add the route first, then uncomment:
  //
  // assignRider: (id: string, riderId: string) =>
  //   api.put(`/orders/${id}/rider`, { riderId }).then((r) => r.data),

  // ─── Foods ───
  // ✅ Use FormData for image uploads (Cloudinary)
  createFood: (data: {
    name: string;
    description?: string;
    price: number;
    categoryId: string;
    rating?: number;
    isPopular?: boolean;
    isAvailable?: boolean;
    image?: { uri: string; name: string; type: string }; // React Native file
  }) => {
    const form = new FormData();
    form.append("name", data.name);
    if (data.description) form.append("description", data.description);
    form.append("price", String(data.price));
    form.append("categoryId", data.categoryId);
    if (data.rating !== undefined) form.append("rating", String(data.rating));
    if (data.isPopular !== undefined) form.append("isPopular", String(data.isPopular));
    if (data.isAvailable !== undefined) form.append("isAvailable", String(data.isAvailable));

    if (data.image) {
      form.append("image", {
        uri: data.image.uri,
        name: data.image.name,
        type: data.image.type,
      } as any);
    }

    return api
      .post("/foods", form, {
        // ❌ DO NOT set Content-Type — let axios add the multipart boundary
        transformRequest: (d) => d, // keep FormData as-is
      })
      .then((r) => r.data);
  },

  updateFood: (id: string, data: any) =>
    api.put(`/foods/${id}`, data).then((r) => r.data),

  deleteFood: (id: string) =>
    api.delete(`/foods/${id}`).then((r) => r.data),

  // ✅ Standalone image upload — no manual Content-Type
  uploadFoodImage: (formData: FormData) =>
    api
      .post("/foods/upload", formData, {
        transformRequest: (d) => d,
        // ❌ no headers override — axios sets multipart boundary itself
      })
      .then((r) => r.data),

  // ─── Users ───
  getAllUsers: (params?: { role?: UserRole; search?: string }) =>
    api.get("/auth/users", { params }).then((r) => r.data),

  updateUserRole: (id: string, role: UserRole) =>
    api.put(`/auth/users/${id}/role`, { role }).then((r) => r.data),

  deleteUser: (id: string) =>
    api.delete(`/auth/users/${id}`).then((r) => r.data),
};

export default adminService;