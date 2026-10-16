import { FormEvent, useEffect, useState } from "react";

import {
  listTenantSettings,
  updateTenantSetting,
  type Setting,
} from "../../api/settings";

export function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setSettings(await listTenantSettings());
      setError(null);
    } catch {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          {settings.length} configuration values for your business
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : settings.length === 0 ? (
        <div className="p-8 bg-white rounded-lg border border-gray-200 text-center text-gray-500">
          No settings configured yet.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {settings.map((s) => (
            <SettingRow key={s.key} setting={s} onUpdated={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function SettingRow({ setting, onUpdated }: { setting: Setting; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(setting.value || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateTenantSetting(setting.key, value);
      setEditing(false);
      onUpdated();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono font-medium text-gray-900">{setting.key}</p>
        {editing ? (
          <form onSubmit={handleSave} className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setValue(setting.value || "");
                setError(null);
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-600 mt-1 break-all">
            {setting.value || <span className="text-gray-400 italic">empty</span>}
          </p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      {!editing && (
        <button
          onClick={() => setEditing(true)}
          className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Edit
        </button>
      )}
    </div>
  );
}

