import api from '../utils/api'; // ✅ Added the missing import

export const authService = {
  // ─── Auth ───
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => api.post('/auth/register', data).then((r: any) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then((r: any) => r.data),

  me: () => api.get('/auth/me').then((r: any) => r.data),

  // ─── Profile settings ───
  updateProfile: (data: {
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
  }) => api.put('/auth/profile', data).then((r: any) => r.data),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) => api.put('/auth/password', data).then((r: any) => r.data),

  uploadAvatar: (formData: FormData) =>
    api
      .post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r: any) => r.data),
};

export default authService;