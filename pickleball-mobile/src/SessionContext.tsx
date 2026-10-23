import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './services/api';

export type UserRole = 'PLAYER' | 'ORGANIZER' | 'REFEREE';

interface SessionContextValue {
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  setRole: (role: UserRole) => Promise<void>;
  clearSession: () => Promise<void>;
  reloadSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const validRoles: UserRole[] = ['PLAYER', 'ORGANIZER', 'REFEREE'];

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && validRoles.includes(value as UserRole);

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setRole = useCallback(async (nextRole: UserRole) => {
    setRoleState(nextRole);
    setError(null);
  }, []);

  const clearSession = useCallback(async () => {
    await AsyncStorage.removeItem('access_token');
    setRoleState(null);
    setError(null);
  }, []);

  const reloadSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        setRoleState(null);
        return;
      }

      const response = await api.get('/users/profile');
      const authenticatedRole = response.data?.role;
      if (!isUserRole(authenticatedRole)) {
        throw new Error('Tài khoản chưa được gán vai trò hợp lệ.');
      }
      await setRole(authenticatedRole);
    } catch (requestError: any) {
      if (requestError.response?.status === 401) {
        await clearSession();
      } else {
        setError(requestError.message || 'Không thể xác thực phiên đăng nhập.');
      }
    } finally {
      setLoading(false);
    }
  }, [clearSession, setRole]);

  useEffect(() => {
    void reloadSession();
  }, [reloadSession]);

  return (
    <SessionContext.Provider value={{ role, loading, error, setRole, clearSession, reloadSession }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
