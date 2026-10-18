import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ═══════════════════════════════════════════════════════════
// 🌐 DYNAMIC API URL — Automatically detects your PC IP from Expo
// ═══════════════════════════════════════════════════════════
const API_PORT = 4000;

const getBaseUrl = (): string => {
  // hostUri በመጠቀም የኮምፒዩተሩን IP እና ፖርት በራሱ ይፈልጋል (TypeScript compliant)
  const hostUri: string | undefined =
    Constants.expoConfig?.hostUri ??
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:${API_PORT}/api`;
  }

  // ሎካል ሆስት ወይም ኤሙሌተር ከሆነ የሚጠቀመው
  return `http://10.0.2.2:${API_PORT}/api`;
};

export const API_URL = getBaseUrl();

console.log('🌐 [API] Base URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach JWT automatically
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.log('⚠️ [API] Token read error:', e);
    }
    console.log(
      `📤 [API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
    );
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle responses
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
        await AsyncStorage.multiRemove(['token', 'user']);
      }
    } else if (error.request) {
      console.log('❌ [API] Network Error — no response from server');
      console.log('   URL:', error.config?.baseURL + error.config?.url);
    } else {
      console.log('❌ [API] Setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════
// 📦 NAMED EXPORT #1: apiClient (typed request helpers)
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
// 📦 NAMED EXPORT #2: ENDPOINTS
// ═══════════════════════════════════════════════════════════
export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  ME: '/auth/me',

  // Menu
  FOODS: '/foods',
  CATEGORIES: '/categories',

  // Orders
  MY_ORDERS: '/orders/my',
  ALL_ORDERS: '/orders/all',
  ORDER_STATS: '/orders/stats',
  CREATE_ORDER: '/orders',
};

export default api;