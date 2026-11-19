import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('acxiom_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('acxiom_access_token');
      if (token) {
        try {
          const res = await axiosClient.get('/auth/me');
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('acxiom_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error('[Auth check failed]', err);
          setUser(null);
          localStorage.removeItem('acxiom_user');
          localStorage.removeItem('acxiom_access_token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await axiosClient.post('/auth/login', { email, password });
    const { user: userData, accessToken, refreshToken } = res.data;
    setUser(userData);
    localStorage.setItem('acxiom_user', JSON.stringify(userData));
    localStorage.setItem('acxiom_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('acxiom_refresh_token', refreshToken);
    }
    return userData;
  };

  const register = async (name, email, password) => {
    const res = await axiosClient.post('/auth/register', { name, email, password });
    const { user: userData, accessToken, refreshToken } = res.data;
    setUser(userData);
    localStorage.setItem('acxiom_user', JSON.stringify(userData));
    localStorage.setItem('acxiom_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('acxiom_refresh_token', refreshToken);
    }
    return userData;
  };

  const logout = async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      setUser(null);
      localStorage.removeItem('acxiom_user');
      localStorage.removeItem('acxiom_access_token');
      localStorage.removeItem('acxiom_refresh_token');
    }
  };

  // Quick 1-click login for evaluation
  const quickLogin = async (role) => {
    let email = 'admin@acxiomcrm.com';
    let password = 'Admin@12345';
    if (role === 'Manager') {
      email = 'manager@acxiomcrm.com';
      password = 'Manager@12345';
    } else if (role === 'Sales Executive') {
      email = 'sales1@acxiomcrm.com';
      password = 'Sales@12345';
    }
    return login(email, password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        quickLogin,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
