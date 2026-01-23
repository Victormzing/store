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
  // Coupons
  getCoupons: () => api.get('/admin/coupons'),
  createCoupon: (data) => api.post('/admin/coupons', data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  // Reviews
  getReviews: (params) => api.get('/admin/reviews', { params }),
  approveReview: (id, approved) => api.patch(`/admin/reviews/${id}/approve?approved=${approved}`),
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`),
  // Suppliers
  getSuppliers: () => api.get('/admin/suppliers'),
  createSupplier: (data) => api.post('/admin/suppliers', data),
  updateSupplier: (id, data) => api.put(`/admin/suppliers/${id}`, data),
  deleteSupplier: (id) => api.delete(`/admin/suppliers/${id}`),
  // Shipping
  getShippingZones: () => api.get('/shipping-zones'),
  createShippingZone: (data) => api.post('/admin/shipping-zones', data),
  // Tax
  getTaxConfig: () => api.get('/tax-config'),
  updateTaxConfig: (data) => api.patch('/admin/tax-config', data),
  // Activity Logs
  getActivityLogs: (params) => api.get('/admin/activity-logs', { params }),
  // Order Tracking
  addTrackingEvent: (orderId, data) => api.post(`/admin/orders/${orderId}/tracking`, null, { params: data }),
  // Inventory History
  getInventoryHistory: (productId) => api.get(`/admin/inventory/${productId}/history`),
};

// Coupon APIs
export const couponAPI = {
  validate: (code, orderTotal) => api.post('/coupons/validate', { code, order_total: orderTotal }),
};

// Review APIs
export const reviewAPI = {
  create: (data) => api.post('/reviews', data),
  getByProduct: (productId, params) => api.get(`/products/${productId}/reviews`, { params }),
};

// Wishlist APIs
export const wishlistAPI = {
  getAll: () => api.get('/wishlist'),
  add: (productId) => api.post(`/wishlist/${productId}`),
  remove: (productId) => api.delete(`/wishlist/${productId}`),
};

// Order Tracking APIs
export const trackingAPI = {
  getOrderTracking: (orderId) => api.get(`/orders/${orderId}/tracking`),
  getInvoice: (orderId) => api.get(`/orders/${orderId}/invoice`),
};

// Recently Viewed APIs
export const recentlyViewedAPI = {
  record: (productId) => api.post(`/products/${productId}/view`),
  getAll: (limit = 10) => api.get('/recently-viewed', { params: { limit } }),
};

// Related Products
export const relatedAPI = {
  getByProduct: (productId, limit = 4) => api.get(`/products/${productId}/related`, { params: { limit } }),
};

// Shipping Calculation
export const shippingAPI = {
  calculate: (city, itemCount, orderTotal) => api.post('/calculate-shipping', null, { 
    params: { city, item_count: itemCount, order_total: orderTotal } 
  }),
};

// Password Reset
export const passwordAPI = {
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, new_password: newPassword }),
};

// Seed data
export const seedData = () => api.post('/seed');

export default api;
