'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'CUSTOMER' | 'WORKER' | 'ADMIN';

export interface User {
  id: string;
  phone: string;
  name?: string;
  role: Role;
  workerProfile?: any;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = '';

  const clearSession = () => {
    setUser(null);
    localStorage.removeItem('servzest_token');
    localStorage.removeItem('servzest_user');
    localStorage.removeItem('quickkaam_token');
    localStorage.removeItem('quickkaam_user');
  };

  useEffect(() => {
    let active = true;
    const savedUserValue = localStorage.getItem('servzest_user') || localStorage.getItem('quickkaam_user');
    let savedUser: User | null = null;
    try { savedUser = savedUserValue ? JSON.parse(savedUserValue) : null; } catch { /* Invalid cache is ignored. */ }
    if (savedUser) setUser(savedUser);
    fetch(`${API_URL}/api/auth/me`, { credentials: 'same-origin', signal: AbortSignal.timeout(15000) })
      .then(async response => {
        if (response.status === 401) { if (active) clearSession(); return; }
        if (!response.ok) throw new Error('Session check unavailable');
        const result = await response.json();
        if (!result.success || !result.user) throw new Error('Session check unavailable');
        if (active) {
          setUser(result.user);
          localStorage.setItem('servzest_user', JSON.stringify(result.user));
        }
      })
      .catch(() => {
        // Keep the locally cached session during temporary network/server outages.
        // Keep the non-sensitive display cache during a temporary outage. The
        // HttpOnly cookie is still validated before every protected operation.
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const expire = () => clearSession();
    window.addEventListener('servzest:auth-expired', expire);
    return () => window.removeEventListener('servzest:auth-expired', expire);
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('servzest_user', JSON.stringify(newUser));
  };

  const logout = async () => {
    try { await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'same-origin' }); } catch { /* Clear the local UI even if offline. */ }
    clearSession();
  };

  const refreshUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'same-origin',
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (res.status === 401) { clearSession(); return; }
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('servzest_user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error('Error refreshing user', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
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
