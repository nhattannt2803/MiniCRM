import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const bizId = localStorage.getItem('activeBizId');
  if (bizId) {
    config.headers['X-Biz-Id'] = bizId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      const errCode = error.response.data?.error?.code;
      if (errCode !== 'SMAX_TOKEN_EXPIRED' && errCode !== 'SMAX_TOKEN_MISSING') {
        localStorage.removeItem('token');
        localStorage.removeItem('activeBizId');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data?.error || { message: error.message });
  }
);

export default api;
