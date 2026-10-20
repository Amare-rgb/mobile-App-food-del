import api from "../utils/api";

// ═══════════════════════════════════════════
// AUTH SERVICE
// ═══════════════════════════════════════════
export const authService = {
  // ─── Auth ───
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => api.post("/auth/register", data).then((r: any) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data).then((r: any) => r.data),

  me: () => api.get("/auth/me").then((r: any) => r.data),

  // ─── Profile settings ───
  // ✅ Field renamed: avatar → avatarUrl
  updateProfile: (data: {
    name?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string; // full Cloudinary HTTPS URL
  }) => api.put("/auth/profile", data).then((r: any) => r.data),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) => api.put("/auth/password", data).then((r: any) => r.data),

  // ✅ NO Content-Type header — axios adds the boundary automatically
  uploadAvatar: (formData: FormData) =>
    api
      .post("/auth/avatar", formData, {
        transformRequest: (d) => d, // keep FormData as-is
        // ❌ do NOT set 'Content-Type' — it breaks the multipart boundary
      })
      .then((r: any) => r.data),

  // ✅ FCM token — backend route exists, was missing here
  saveFcmToken: (token: string) =>
    api
      .post("/auth/fcm-token", { token })
      .then((r: any) => r.data),
};

export default authService;