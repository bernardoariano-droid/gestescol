import { SystemUser } from './types';

export interface AuthService {
  login: (user: SystemUser) => void;
  logout: () => void;
  getCurrentUser: () => SystemUser | null;
  isAuthenticated: () => boolean;
  canAccessSchool: (schoolId: string | undefined) => boolean;
  canAccessData: <T extends { schoolId?: string }>(item: T) => boolean;
  filterBySchool: <T extends { schoolId?: string }>(items: T[]) => T[];
  canManageSchools: () => boolean;
  canManageAllUsers: () => boolean;
  canManageSchoolUsers: (schoolId: string | undefined) => boolean;
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
  canAccessSchool: (schoolId: string | undefined) => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    if (user.role === 'Super-Administrador') return true;
    return !!schoolId && user.schoolId === schoolId;
  },
  canAccessData: <T extends { schoolId?: string }>(item: T): boolean => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    if (user.role === 'Super-Administrador') return true;
    return !item.schoolId || user.schoolId === item.schoolId;
  },
  filterBySchool: <T extends { schoolId?: string }>(items: T[]): T[] => {
    const user = authService.getCurrentUser();
    if (!user) return [] as T[];
    if (user.role === 'Super-Administrador') return items;
    return items.filter(item => !item.schoolId || user.schoolId === item.schoolId) as T[];
  },
  canManageSchools: () => {
    const user = authService.getCurrentUser();
    return user?.role === 'Super-Administrador';
  },
  canManageAllUsers: () => {
    const user = authService.getCurrentUser();
    return user?.role === 'Super-Administrador';
  },
  canManageSchoolUsers: (schoolId: string | undefined) => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    if (user.role === 'Super-Administrador') return true;
    if (user.role === 'Administrador') {
      return !!schoolId && user.schoolId === schoolId;
    }
    return false;
  },
};

