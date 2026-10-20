import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

// ═══════════════════════════════════════════════════════════
// 🌐 API URL — Production + Dev (Expo Go + Emulator + Device)
// ═══════════════════════════════════════════════════════════

// 🔴 Production backend (Fly.io) — used in release builds
const PRODUCTION_API_URL = "https://food-del-backend.fly.dev/api";

const API_PORT = 4000;

// Set this to true ONLY when you want to force localhost
const FORCE_LOCAL = false;

const getBaseUrl = (): string => {
  // 1) Explicit override via Expo extra (app.config.js → extra.apiUrl)
  const override =
    Constants.expoConfig?.extra?.apiUrl ??
    (Constants as any).manifest?.extra?.apiUrl;
  if (typeof override === "string" && override.length > 0) {
    return override;
  }

  // 2) Production build (EAS / store / TestFlight) → use Fly.io
  //    __DEV__ is false in release builds
  if (!__DEV__ || FORCE_LOCAL === false && !__DEV__) {
    return PRODUCTION_API_URL;
  }

  // 3) Dev: try to auto-detect the PC's IP from Expo
  const hostUri: string | undefined =
    Constants.expoConfig?.hostUri ??
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(":")[0];
    // If Expo is running on your LAN, hit your PC
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:${API_PORT}/api`;
    }
  }

  // 4) Android emulator special case
  if (Platform.OS === "android") {
    return `http://10.0.2.2:${API_PORT}/api`;
  }

  // 5) iOS simulator / web fallback
  return `http://localhost:${API_PORT}/api`;
};

export const API_URL = getBaseUrl();

console.log("🌐 [API] Base URL:", API_URL);
console.log("🌐 [API] __DEV__:", __DEV__);

// ═══════════════════════════════════════════════════════════
// Axios instance
// ═══════════════════════════════════════════════════════════
const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,                 // ↑ was 15s — Fly.io cold starts can exceed it
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─── Request interceptor — attach JWT ───
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.log("⚠️ [API] Token read error:", e);
    }
    console.log(
      `📤 [API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
    );
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ───
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    if (error.response) {
      console.log(
        `❌ [API] Server ${error.response.status}:`,
        error.response.data
      );
      if (error.response.status === 401) {
        await AsyncStorage.multiRemove(["token", "user"]);
      }
    } else if (error.request) {
      console.log("❌ [API] Network Error — no response from server");
      console.log("   URL:", (error.config?.baseURL || "") + (error.config?.url || ""));
      console.log("   Hint: Fly.io app may be asleep — first request can take ~5s");
    } else {
      console.log("❌ [API] Setup error:", error.message);
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════
// Typed helpers
// ═══════════════════════════════════════════════════════════
export const apiClient = {
  get: async <T = any>(url: string, params?: object): Promise<T> => {
    const res = await api.get<T>(url, { params });
    return res.data;
  },
  post: async <T = any>(url: string, body?: object): Promise<T> => {
    const res = await api.post<T>(url, body);
    return res.data;
  },
  put: async <T = any>(url: string, body?: object): Promise<T> => {
    const res = await api.put<T>(url, body);
    return res.data;
  },
  patch: async <T = any>(url: string, body?: object): Promise<T> => {
    const res = await api.patch<T>(url, body);
    return res.data;
  },
  delete: async <T = any>(url: string): Promise<T> => {
    const res = await api.delete<T>(url);
    return res.data;
  },
};

// ═══════════════════════════════════════════════════════════
// Endpoints
// ═══════════════════════════════════════════════════════════
export const ENDPOINTS = {
  // Auth
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  ME: "/auth/me",
  AVATAR: "/auth/avatar",
  FCM_TOKEN: "/auth/fcm-token",

  // Menu
  FOODS: "/foods",
  CATEGORIES: "/categories",

  // Orders
  MY_ORDERS: "/orders/my",
  ALL_ORDERS: "/orders/all",
  ORDER_STATS: "/orders/stats",
  CREATE_ORDER: "/orders",

  // Payments
  CHAPA_INIT: "/payments/chapa/initialize",
  CHAPA_VERIFY: (txRef: string) => `/payments/chapa/verify/${txRef}`,
};

export default api;