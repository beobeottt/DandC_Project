import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './services/api';

export type UserRole = 'PLAYER' | 'ORGANIZER' | 'REFEREE' | 'ADMIN';

interface SessionContextValue {
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  setRole: (role: UserRole) => Promise<void>;
  clearSession: () => Promise<void>;
  reloadSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const validRoles: UserRole[] = ['PLAYER', 'ORGANIZER', 'REFEREE', 'ADMIN'];
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const BACKGROUND_TIMESTAMP_KEY = 'app_backgrounded_at';

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && validRoles.includes(value as UserRole);

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const backgroundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const setRole = useCallback(async (nextRole: UserRole) => {
    setRoleState(nextRole);
    setError(null);
  }, []);

  const clearSession = useCallback(async () => {
    if (backgroundTimer.current) {
      clearTimeout(backgroundTimer.current);
      backgroundTimer.current = null;
    }
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem(BACKGROUND_TIMESTAMP_KEY);
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
      const backgroundedAt = await AsyncStorage.getItem(BACKGROUND_TIMESTAMP_KEY);
      if (backgroundedAt && Date.now() - Number(backgroundedAt) >= SESSION_TIMEOUT_MS) {
        await clearSession();
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

  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'background' && appState.current === 'active' && role) {
        const backgroundedAt = Date.now();
        await AsyncStorage.setItem(BACKGROUND_TIMESTAMP_KEY, String(backgroundedAt));
        if (backgroundTimer.current) clearTimeout(backgroundTimer.current);
        backgroundTimer.current = setTimeout(() => {
          void clearSession();
        }, SESSION_TIMEOUT_MS);
      } else if (nextState === 'active' && appState.current === 'background') {
        const backgroundedAt = await AsyncStorage.getItem(BACKGROUND_TIMESTAMP_KEY);
        if (backgroundedAt && Date.now() - Number(backgroundedAt) >= SESSION_TIMEOUT_MS) {
          await clearSession();
        } else {
          if (backgroundTimer.current) {
            clearTimeout(backgroundTimer.current);
            backgroundTimer.current = null;
          }
          await AsyncStorage.removeItem(BACKGROUND_TIMESTAMP_KEY);
        }
      }
      appState.current = nextState;
    };

    const subscription = AppState.addEventListener('change', nextState => {
      void handleAppStateChange(nextState);
    });
    return () => {
      subscription.remove();
      if (backgroundTimer.current) clearTimeout(backgroundTimer.current);
    };
  }, [clearSession, role]);

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
