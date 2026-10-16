import { useAuthStore } from "../../store/authStore";

export function usePermission(code: string): boolean {
  return useAuthStore((s) => s.hasPermission(code));
}

export function usePermissions(): string[] {
  return useAuthStore((s) => s.permissions);
}

