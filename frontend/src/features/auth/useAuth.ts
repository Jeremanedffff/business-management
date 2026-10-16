import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchMe, login as apiLogin } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";

export function useAuth() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const tokens = await apiLogin({ email, password });
      useAuthStore.setState({ accessToken: tokens.access_token });
      const me = await fetchMe();
      setAuth({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user: me.user,
        tenant: { id: me.tenant_id, name: me.tenant_name },
        permissions: me.permissions,
      });
      navigate("/dashboard");
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      const msg =
        axiosError.response?.data?.error?.message ||
        "Login failed. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    logout();
    navigate("/login");
  }

  return { login, signOut, loading, error };
}

