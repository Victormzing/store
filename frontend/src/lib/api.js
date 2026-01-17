import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
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

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Product APIs
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  getCategories: () => api.get('/categories'),
  getSEO: (id) => api.get(`/seo/product/${id}`),
};

// Cart APIs
export const cartAPI = {
  get: () => api.get('/cart'),
  add: (productId, quantity = 1) => api.post('/cart/add', { product_id: productId, quantity }),
  update: (productId, quantity) => api.put(`/cart/${productId}`, { quantity }),
  remove: (productId) => api.delete(`/cart/${productId}`),
};

// Address APIs
export const addressAPI = {
  getAll: () => api.get('/addresses'),
  create: (data) => api.post('/addresses', data),
};

// Order APIs
export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getAll: () => api.get('/orders'),
  getOne: (id) => api.get(`/orders/${id}`),
};

// Payment APIs
export const paymentAPI = {
  initiate: (orderId, phoneNumber) => api.post('/payments/mpesa/initiate', { order_id: orderId, phone_number: phoneNumber }),
  getStatus: (paymentId) => api.get(`/payments/${paymentId}/status`),
};

// Blog APIs
export const blogAPI = {
  getAll: (params) => api.get('/blog', { params }),
  getOne: (slug) => api.get(`/blog/${slug}`),
};

// Upload APIs
export const uploadAPI = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadMultiple: (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Admin APIs
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getOrders: (params) => api.get('/admin/orders', { params }),
  updateOrderStatus: (orderId, status) => api.patch(`/admin/orders/${orderId}/status`, { status }),
  getProducts: (params) => api.get('/admin/products', { params }),
  createProduct: (data) => api.post('/admin/products', data),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  getInventory: () => api.get('/admin/inventory'),
  adjustInventory: (data) => api.post('/admin/inventory/adjust', data),
  getPayments: (params) => api.get('/admin/payments', { params }),
  getLowStock: () => api.get('/admin/low-stock'),
  // Categories
  getCategories: () => api.get('/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  // Blog
  getBlogPosts: () => api.get('/admin/blog'),
  createBlogPost: (data) => api.post('/admin/blog', data),
  updateBlogPost: (id, data) => api.put(`/admin/blog/${id}`, data),
  deleteBlogPost: (id) => api.delete(`/admin/blog/${id}`),
};

// Seed data
export const seedData = () => api.post('/seed');

export default api;
