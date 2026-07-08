import { SystemUser } from './types';

export interface AuthService {
  login: (user: SystemUser) => void;
  logout: () => void;
  getCurrentUser: () => SystemUser | null;
  isAuthenticated: () => boolean;
}

const STORAGE_KEY = 'edugest_auth_user';

export const authService: AuthService = {
  login: (user: SystemUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
  },
  getCurrentUser: () => {
    const userStr = localStorage.getItem(STORAGE_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },
  isAuthenticated: () => {
    return !!localStorage.getItem(STORAGE_KEY);
  },
};
