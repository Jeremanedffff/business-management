import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  acceptInvitation,
  previewInvitation,
  type InvitationPreview,
} from "../../api/invitations";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function RegisterPage() {
  const { token } = useParams<{ token: string }>();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("This registration link is not valid.");
      setLoading(false);
      return;
    }
    previewInvitation(token)
      .then((data) => {
        setPreview(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        const axiosError = err as { response?: { data?: { error?: { message?: string }; detail?: string } } };
        const message =
          axiosError.response?.data?.error?.message ||
          axiosError.response?.data?.detail ||
          "This invitation could not be loaded.";
        setLoadError(message);
      })
      .finally(() => setLoading(false));
  }, [token]);

  function validatePassword(): string | null {
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Za-z]/.test(password)) return "Password must contain at least one letter.";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    const validationError = validatePassword();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await acceptInvitation({
        token,
        password,
        confirm_password: confirmPassword,
      });
      setDone(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string }; detail?: string } } };
      const message =
        axiosError.response?.data?.error?.message ||
        axiosError.response?.data?.detail ||
        "Registration failed. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const displayName = preview?.first_name || preview?.email || "there";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="grid lg:grid-cols-2 min-h-screen">
        {/* LEFT: Brand panel */}
        <div className="hidden lg:flex flex-col justify-center px-12 xl:px-20 bg-gradient-to-br from-blue-700 to-blue-900 text-white relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-white/5" />
          <div className="relative z-10 max-w-md">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-blue-700 font-bold text-lg">M</span>
              </div>
              <span className="font-bold text-2xl tracking-tight">MalutiRecon</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
              Complete your registration.
            </h1>
            <p className="text-blue-100 text-base leading-relaxed">
              Set a password to activate your account.
            </p>
          </div>
        </div>

        {/* RIGHT: Register form */}
        <div className="flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-10">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Back to sign in
              </Link>

              {loading && (
                <div className="text-sm text-slate-500">Checking your invitation...</div>
              )}

              {!loading && loadError && (
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3">Invitation unavailable</h2>
                  <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertIcon />
                    <p className="leading-relaxed">{loadError}</p>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    If you believe this is a mistake, please contact your company administrator.
                  </p>
                </div>
              )}

              {!loading && !loadError && preview && !done && (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">
                      Welcome, {displayName}
                    </h2>
                    <p className="text-sm text-slate-500">
                      You have been invited to join{" "}
                      <span className="font-medium text-slate-700">{preview.tenant_name}</span>
                      {preview.role_name ? (
                        <>
                          {" "}as <span className="font-medium text-slate-700">{preview.role_name}</span>
                        </>
                      ) : null}
                      .
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Email address
                      </label>
                      <input
                        type="email"
                        value={preview.email}
                        readOnly
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <EyeIcon open={showPassword} />
                        </button>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        Must be at least 8 characters and include a letter and a number.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Confirm password
                      </label>
                      <input
                        id="confirm"
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {submitError && (
                      <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <AlertIcon />
                        <p className="leading-relaxed">{submitError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors shadow-sm"
                    >
                      {submitting ? "Creating account..." : "Create account"}
                    </button>
                  </form>
                </>
              )}

              {done && (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-4">
                    <CheckIcon />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Account created</h2>
                  <p className="text-sm text-slate-500 mb-6">
                    Your account is ready. You can now sign in.
                  </p>
                  <Link
                    to="/login"
                    className="inline-block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm text-center"
                  >
                    Go to sign in
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}