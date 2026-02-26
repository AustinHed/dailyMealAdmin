const MAX_TRACKED_IDS = 10000;

function normalizeIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean))).slice(0, MAX_TRACKED_IDS);
}

export function readLocalIdList(key: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeIds(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return [];
  }
}

export function writeLocalIdList(key: string, ids: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeIds(ids);

  try {
    window.localStorage.setItem(key, JSON.stringify(normalized));
  } catch {
    // ignore localStorage write failures
  }
}
