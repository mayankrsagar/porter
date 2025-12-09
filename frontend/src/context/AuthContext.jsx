// src/context/AuthContext.jsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { apiFetch } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // page loads only after checking auth

  const loadUser = async () => {
    try {
      const res = await apiFetch("/auth/me"); // backend returns user if cookie valid
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "post" });
    } finally {
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
