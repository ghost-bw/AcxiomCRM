import axios from 'axios';

const axiosClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach bearer token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('acxiom_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh and unauthorized
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Handle token refresh if 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/')) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('acxiom_refresh_token');
        const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
        if (res.data?.data?.accessToken) {
          localStorage.setItem('acxiom_access_token', res.data.data.accessToken);
          localStorage.setItem('acxiom_refresh_token', res.data.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
          return axiosClient(originalRequest);
        }
      } catch (refreshErr) {
        localStorage.removeItem('acxiom_access_token');
        localStorage.removeItem('acxiom_refresh_token');
        localStorage.removeItem('acxiom_user');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    const customError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred.',
      errors: error.response?.data?.errors || [],
      status: error.response?.status || 500,
    };
    return Promise.reject(customError);
  }
);

export default axiosClient;
