import api from '../utils/api';

export type UserRole = 'CUSTOMER' | 'COURIER' | 'ADMIN';

// ✅ Only 3 statuses
export type OrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const adminService = {
  // ─── Dashboard ───
  getStats: () => api.get('/orders/stats').then((r) => r.data.data),

  // ─── Orders ───
  getAllOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/orders/all', { params }).then((r) => r.data),

  getOrder: (id: string) => api.get(`/orders/${id}`).then((r) => r.data),

  updateOrderStatus: (id: string, status: OrderStatus) =>
    api.put(`/orders/${id}/status`, { status }).then((r) => r.data),

  approveOrder: (id: string) =>
    api.put(`/orders/${id}/status`, { status: 'APPROVED' }).then((r) => r.data),

  rejectOrder: (id: string) =>
    api.put(`/orders/${id}/status`, { status: 'REJECTED' }).then((r) => r.data),

  assignRider: (id: string, riderId: string) =>
    api.put(`/orders/${id}/rider`, { riderId }).then((r) => r.data),

  // ─── Foods ───
  createFood: (data: {
    name: string;
    description: string;
    price: number;
    image: string;
    category: string;
    rating?: number;
    isPopular?: boolean;
    isAvailable?: boolean;
  }) => api.post('/foods', data).then((r) => r.data),

  updateFood: (id: string, data: any) =>
    api.put(`/foods/${id}`, data).then((r) => r.data),

  deleteFood: (id: string) =>
    api.delete(`/foods/${id}`).then((r) => r.data),

  uploadFoodImage: (formData: FormData) =>
    api
      .post('/foods/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  // ─── Users ───
  getAllUsers: (params?: { role?: string; search?: string }) =>
    api.get('/auth/users', { params }).then((r) => r.data),

  updateUserRole: (id: string, role: UserRole) =>
    api.put(`/auth/users/${id}/role`, { role }).then((r) => r.data),

  deleteUser: (id: string) =>
    api.delete(`/auth/users/${id}`).then((r) => r.data),
};

export default adminService;