import axios from 'axios';
import config from '../config/config.js';

/** Turn API-relative image paths into absolute URLs (same idea as the mobile app). */
export const resolveMediaUrl = (path) => {
  if (!path || typeof path !== 'string') return '';
  const p = path.trim();
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  const base = (config.apiBaseUrl || '').replace(/\/$/, '');
  if (!base) return p.startsWith('/') ? p : `/${p}`;
  return `${base}${p.startsWith('/') ? p : `/${p}`}`;
};

const api = axios.create({
  baseURL: `${config.apiBaseUrl}/api`,
  timeout: 30000,
});

// Token helpers
const getToken = () => localStorage.getItem('accessToken') || '';
const getRefreshToken = () => localStorage.getItem('refreshToken') || '';

const saveTokens = ({ access_token, refresh_token }) => {
  if (access_token) localStorage.setItem('accessToken', access_token);
  if (refresh_token) localStorage.setItem('refreshToken', refresh_token);
};

export const clearAuth = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// Attach token to every request
api.interceptors.request.use((req) => {
  const token = getToken();
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// Token refresh on 401
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = api
          .post('/auth/refresh', { refresh_token: getRefreshToken() })
          .then((r) => {
            saveTokens(r.data);
            refreshing = null;
          })
          .catch(() => {
            refreshing = null;
            clearAuth();
            window.location.href = '/login';
          });
      }
      await refreshing;
      original.headers.Authorization = `Bearer ${getToken()}`;
      return api(original);
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

const normalizePhone = (phone) => {
  phone = phone.trim().replace(/\D/g, '');
  if (phone.startsWith('0')) return '+966' + phone.slice(1);
  if (phone.startsWith('5')) return '+966' + phone;
  if (phone.startsWith('966')) return '+' + phone;
  return phone;
};

export const loginUser = async (phone) => {
  const res = await api.post('/auth/login', { phone: normalizePhone(phone) });
  return res.data;
};

export const verifyOTP = async (phone, otp) => {
  const res = await api.post('/auth/verify-otp', {
    phone: normalizePhone(phone),
    otp,
  });
  if (res.data.access_token) saveTokens(res.data);
  return res.data;
};

export const registerUser = async ({ name, phone }) => {
  const res = await api.post('/auth/register', {
    name,
    phone: normalizePhone(phone),
  });
  return res.data;
};

export const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const updateMe = async (data) => {
  const res = await api.put('/auth/me', data);
  return res.data;
};

// ─── Products ────────────────────────────────────────────────────────────────

export const normalizeProduct = (p) => (p ? { ...p, _id: p._id || p.id } : p);

export const fetchProducts = async (params = {}) => {
  const res = await api.get('/products/', {
    params: { ...params, _ts: Date.now() },
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
  const data = res.data;
  if (Array.isArray(data)) return data.map(normalizeProduct);
  if (data?.items) return { ...data, items: data.items.map(normalizeProduct) };
  return data;
};

export const fetchProductById = async (id) => {
  const res = await api.get(`/products/${id}`);
  return normalizeProduct(res.data);
};

// ─── Orders ──────────────────────────────────────────────────────────────────

export const fetchMyOrders = async () => {
  const res = await api.get('/orders/my-orders');
  return res.data;
};

export const fetchOrderById = async (id) => {
  const res = await api.get(`/orders/${id}`);
  return res.data;
};

/** Syncs auction win to order-service cart (auction_won order) — required before checkout. */
export const addAuctionWonToCart = async (body) => {
  const res = await api.post('/orders/auction-won', body);
  return res.data;
};

export const createOrder = async (payload) => {
  const res = await api.post('/orders/', payload);
  return res.data;
};

/** Body must be a JSON array (same as mobile `validateCartStock`). */
export const validateCart = async (items) => {
  const res = await api.post('/orders/validate-cart', items);
  return res.data;
};

/** multipart/form-data — matches mobile `createOrderWithTransferProof`. */
export const createOrderWithTransferProof = async ({ items, transferProofFile, shippingAddress, shortAddress }) => {
  const form = new FormData();
  form.append('items', JSON.stringify(items));
  if (shippingAddress) form.append('shipping_address', shippingAddress);
  if (shortAddress) form.append('short_address', shortAddress);
  form.append('transfer_proof', transferProofFile, transferProofFile.name);
  const token = localStorage.getItem('accessToken') || '';
  const res = await fetch(`${config.apiBaseUrl}/api/orders/with-transfer-proof`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
};

// ─── Auctions ────────────────────────────────────────────────────────────────

export const fetchAuctions = async () => {
  const res = await api.get('/auctions/');
  return res.data;
};

export const fetchAuctionById = async (id) => {
  const res = await api.get(`/auctions/${id}`);
  return res.data;
};

export const placeBid = async (auctionId, amount) => {
  const res = await api.post(
    `/auctions/${auctionId}/bids?bid_amount=${amount}`
  );
  return res.data;
};

export const fetchMyBids = async () => {
  const res = await api.get('/auctions/my-bids');
  return res.data;
};

export const fetchMyAuctionWins = async () => {
  const res = await api.get('/auctions/my-wins');
  return res.data;
};

// ─── Price Alerts ─────────────────────────────────────────────────────────────

export const fetchAlerts = async () => {
  const res = await api.get('/target-price-alerts/');
  return res.data;
};

export const createAlert = async (productId, targetPrice) => {
  const res = await api.post('/target-price-alerts/', {
    product_id: productId,
    target_price: targetPrice,
  });
  return res.data;
};

export const deleteAlert = async (alertId) => {
  const res = await api.delete(`/target-price-alerts/${alertId}`);
  return res.data;
};

// ─── Locations (backend paginates at 50 per page) ─────────────────────────────

const LOCATION_PAGE_SIZE = 50;

const normalizeLocationList = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
};

async function fetchAllLocationPages(requestPage) {
  const all = [];
  let page = 1;
  for (;;) {
    const chunk = normalizeLocationList(await requestPage(page));
    all.push(...chunk);
    if (chunk.length < LOCATION_PAGE_SIZE) break;
    page += 1;
  }
  return all;
}

export const fetchRegions = async () => {
  return fetchAllLocationPages((page) =>
    api.get('/shipments/regions', { params: { country_id: 1, page } }).then((r) => r.data)
  );
};

export const fetchCities = async (regionId) => {
  return fetchAllLocationPages((page) =>
    api.get('/shipments/cities', { params: { region_id: regionId, page } }).then((r) => r.data)
  );
};

export const fetchDistricts = async (cityId) => {
  return fetchAllLocationPages((page) =>
    api.get('/shipments/districts', { params: { cities_id: cityId, page } }).then((r) => r.data)
  );
};

// ─── Tap Payment ─────────────────────────────────────────────────────────────

export const prepareTapCheckout = async (payload) => {
  const res = await api.post('/orders/tap/prepare-checkout', payload);
  return res.data;
};

export const chargeWithToken = async (payload) => {
  const res = await api.post('/payments/tap/charge-with-token', payload);
  return res.data;
};

export const getTapCharge = async (chargeId) => {
  const res = await api.get(`/payments/tap/charges/${chargeId}`);
  return res.data;
};

export const completeAfter3DS = async (payload) => {
  const res = await api.post('/payments/tap/complete-after-3ds', payload);
  return res.data;
};

// ─── Tamara Payment ───────────────────────────────────────────────────────────

export const createTamaraOrder = async (payload) => {
  const res = await api.post('/orders/tamara/create', payload);
  return res.data;
};

export const confirmTamaraPayment = async (payload) => {
  const res = await api.post('/payments/tamara/confirm', payload);
  return res.data;
};

// ─── App Config ───────────────────────────────────────────────────────────────

export const fetchAppConfig = async () => {
  const res = await api.get('/config');
  return res.data;
};

// ─── Account ──────────────────────────────────────────────────────────────────

export const deleteAccount = async () => {
  const res = await api.delete('/auth/me');
  return res.data;
};

// ─── Shipment Tracking ───────────────────────────────────────────────────────

export const fetchShipmentByOrder = async (orderId) => {
  const res = await api.get(`/orders/${orderId}/shipment/`);
  return res.data;
};

export const trackShipment = async (orderId) => {
  const res = await api.get(`/orders/${orderId}/shipment/track/`);
  return res.data;
};

export default api;
