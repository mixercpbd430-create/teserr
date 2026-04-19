import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }),
};

// Menu
export const menuApi = {
  getMenu: () => apiClient.get('/menu'),
};

// Product
export const productApi = {
  getAll: (params?: { search?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/product', { params }),
  getById: (id: number) => apiClient.get(`/product/${id}`),
  getList: () => apiClient.get('/product/list'),
  create: (data: any) => apiClient.post('/product', data),
  update: (id: number, data: any) => apiClient.put(`/product/${id}`, data),
  delete: (id: number) => apiClient.delete(`/product/${id}`),
};

// Plan
export const planApi = {
  getAll: (params?: { date?: string; maPlan?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/plan', { params }),
  getSummary: (date: string) => apiClient.get('/plan/summary', { params: { date } }),
  getCodes: (date: string) => apiClient.get('/plan/codes', { params: { date } }),
  create: (data: any) => apiClient.post('/plan', data),
  createBatch: (data: any) => apiClient.post('/plan/batch', data),
  update: (id: number, data: any) => apiClient.put(`/plan/${id}`, data),
  delete: (id: number) => apiClient.delete(`/plan/${id}`),
  deleteByDate: (date: string) => apiClient.delete(`/plan/by-date/${date}`),
};

// Order
export const orderApi = {
  getAll: (params?: { type?: string; date?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/order', { params }),
  getSummary: () => apiClient.get('/order/summary'),
  getTypes: () => apiClient.get('/order/types'),
  create: (data: any) => apiClient.post('/order', data),
  createBatch: (data: any[]) => apiClient.post('/order/batch', data),
  delete: (id: number) => apiClient.delete(`/order/${id}`),
};

// Stock
export const stockApi = {
  getAll: (params?: { search?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/stock', { params }),
  getSummary: () => apiClient.get('/stock/summary'),
};

// Dashboard
export const dashboardApi = {
  get: () => apiClient.get('/dashboard'),
};

// Pellet
export const pelletApi = {
  getAll: (params?: { date?: string; soMay?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/pellet', { params }),
  getSummary: (date: string) => apiClient.get('/pellet/summary', { params: { date } }),
  getMachines: () => apiClient.get('/pellet/machines'),
  create: (data: any) => apiClient.post('/pellet', data),
  createBatch: (data: any[]) => apiClient.post('/pellet/batch', data),
  update: (id: number, data: any) => apiClient.put(`/pellet/${id}`, data),
  delete: (id: number) => apiClient.delete(`/pellet/${id}`),
};

// Packing
export const packingApi = {
  getAll: (params?: { date?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/packing', { params }),
  getSummary: (date: string) => apiClient.get('/packing/summary', { params: { date } }),
  create: (data: any) => apiClient.post('/packing', data),
  update: (id: number, data: any) => apiClient.put(`/packing/${id}`, data),
  delete: (id: number) => apiClient.delete(`/packing/${id}`),
};

// BaoBi
export const baobiApi = {
  getAll: (params?: { page?: number; pageSize?: number; search?: string }) =>
    apiClient.get('/baobi', { params }),
  getDates: (year: number, month: number) =>
    apiClient.get('/baobi/dates', { params: { year, month } }),
  create: (data: any) => apiClient.post('/baobi', data),
  update: (id: number, data: any) => apiClient.put(`/baobi/${id}`, data),
  delete: (id: number) => apiClient.delete(`/baobi/${id}`),
};

// Admin
export const adminApi = {
  getUsers: () => apiClient.get('/admin/users'),
  createUser: (data: any) => apiClient.post('/admin/users', data),
  updateUser: (id: number, data: any) => apiClient.put(`/admin/users/${id}`, data),
  resetPassword: (id: number, newPassword: string) =>
    apiClient.put(`/admin/users/${id}/password`, { newPassword }),
  toggleLock: (id: number) => apiClient.put(`/admin/users/${id}/lock`),
  deleteUser: (id: number) => apiClient.delete(`/admin/users/${id}`),
  getRoles: () => apiClient.get('/admin/roles'),
  createRole: (data: any) => apiClient.post('/admin/roles', data),
  getMainFunctions: () => apiClient.get('/admin/menu/main-functions'),
  createMainFunction: (data: any) => apiClient.post('/admin/menu/main-functions', data),
  getSubFunctions: () => apiClient.get('/admin/menu/sub-functions'),
  createSubFunction: (data: any) => apiClient.post('/admin/menu/sub-functions', data),
  getRoleFunctions: (roleId: number) => apiClient.get(`/admin/menu/role-functions/${roleId}`),
  setRoleFunctions: (data: any) => apiClient.post('/admin/menu/role-functions', data),
};

// Import
export const importApi = {
  importPlan: (data: any) => apiClient.post('/import/plan', data),
  importOrder: (data: any) => apiClient.post('/import/order', data),
  importPellet: (data: any) => apiClient.post('/import/pellet', data),
  importStock: (data: any) => apiClient.post('/import/stock', data),
  importProduct: (data: any[]) => apiClient.post('/import/product', data),
};
