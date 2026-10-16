const ROLE_DISPLAY_NAMES: Record<string, string> = {
  "Administrator": "Business Administrator",
};

export function displayRoleName(name: string): string {
  return ROLE_DISPLAY_NAMES[name] ?? name;
}