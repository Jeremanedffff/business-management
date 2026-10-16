import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
}

export interface Tenant {
  id: string;
  name: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  tenant: Tenant | null;
  permissions: string[];
  setAuth: (params: {
    accessToken: string;
    refreshToken: string;
    user: User;
    tenant: Tenant;
    permissions: string[];
  }) => void;
  setUser: (user: User, tenant: Tenant, permissions: string[]) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasPermission: (code: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      tenant: null,
      permissions: [],

      setAuth: ({ accessToken, refreshToken, user, tenant, permissions }) =>
        set({ accessToken, refreshToken, user, tenant, permissions }),

      setUser: (user, tenant, permissions) => set({ user, tenant, permissions }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          tenant: null,
          permissions: [],
        }),

      isAuthenticated: () => Boolean(get().accessToken),

      hasPermission: (code: string) => {
        const state = get();
        if (state.user?.is_superuser) return true;
        return state.permissions.includes(code);
      },
    }),
    {
      name: "enterprise-bms-auth",
    },
  ),
);

