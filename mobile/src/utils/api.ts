import axios, { AxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

// ═══════════════════════════════════════════════════════════
// 🌐 API URL — Production + Dev
// ═══════════════════════════════════════════════════════════

const PRODUCTION_API_URL = "https://food-del-backend.fly.dev/api";
const API_PORT = 4000;

const getBaseUrl = (): string => {
  const override =
    Constants.expoConfig?.extra?.apiUrl ??
    (Constants as any).manifest?.extra?.apiUrl;
  if (typeof override === "string" && override.length > 0) {
    return override;
  }

  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }

  const hostUri: string | undefined =
    Constants.expoConfig?.hostUri ??
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:${API_PORT}/api`;
    }
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${API_PORT}/api`;
  }

  return `http://localhost:${API_PORT}/api`;
};

export const API_URL = getBaseUrl();

console.log("🌐 [API] Base URL:", API_URL);
console.log("🌐 [API] __DEV__:", __DEV__);

// ═══════════════════════════════════════════════════════════
// Axios instance
// (no default Content-Type here — it is set per request below)
// ═══════════════════════════════════════════════════════════
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

// ─── Request interceptor ───
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        config.headers = config.headers || ({} as any);
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.log("⚠️ [API] Token read error:", e);
    }

    const headers: any = config.headers;
    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;

    if (isFormData) {
      // Remove every possible Content-Type so React Native sets
      // multipart/form-data WITH the correct boundary itself.
      if (typeof headers.delete === "function") {
        headers.delete("Content-Type");
        headers.delete("content-type");
      }
      delete headers["Content-Type"];
      delete headers["content-type"];
      delete headers.common?.["Content-Type"];
      delete headers.post?.["Content-Type"];
      delete headers.put?.["Content-Type"];

      // Don't let Axios try to serialize FormData
      config.transformRequest = [(data) => data];
      // Uploads can be slow
      config.timeout = Math.max(config.timeout ?? 0, 60000);
    } else if (config.data !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    console.log(
      `📤 [API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}` +
        (isFormData ? " (multipart)" : "")
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
      console.log(
        "   URL:",
        (error.config?.baseURL || "") + (error.config?.url || "")
      );
      console.log("   Hint: Fly.io app may be asleep — first request can take ~5s");
    } else {
      console.log("❌ [API] Setup error:", error.message);
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════
// Typed helpers (return res.data)
// ═══════════════════════════════════════════════════════════
export const apiClient = {
  get: async <T = any>(
    url: string,
    params?: object,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const res = await api.get<T>(url, { ...config, params });
    return res.data;
  },
  post: async <T = any>(
    url: string,
    body?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const res = await api.post<T>(url, body, config);
    return res.data;
  },
  put: async <T = any>(
    url: string,
    body?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const res = await api.put<T>(url, body, config);
    return res.data;
  },
  patch: async <T = any>(
    url: string,
    body?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const res = await api.patch<T>(url, body, config);
    return res.data;
  },
  delete: async <T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const res = await api.delete<T>(url, config);
    return res.data;
  },
};

// ═══════════════════════════════════════════════════════════
// Endpoints
// ═══════════════════════════════════════════════════════════
export const ENDPOINTS = {
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  ME: "/auth/me",
  AVATAR: "/auth/avatar",
  FCM_TOKEN: "/auth/fcm-token",
  FOODS: "/foods",
  CATEGORIES: "/categories",
  MY_ORDERS: "/orders/my",
  ALL_ORDERS: "/orders/all",
  ORDER_STATS: "/orders/stats",
  CREATE_ORDER: "/orders",
  CHAPA_INIT: "/payments/chapa/initialize",
  CHAPA_VERIFY: (txRef: string) => `/payments/chapa/verify/${txRef}`,
};

export default api;