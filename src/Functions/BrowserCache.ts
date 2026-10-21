// Browser-persistent cache for API data.
//
// Entries live in localStorage under the "ncd_cache:" prefix and expire
// CACHE_TTL_MS after they were written. An entry is removed from storage when
// it is read after expiry, and expired entries are swept away when the app
// starts, so the browser never keeps stale data around for longer than the TTL.

const CACHE_PREFIX = "ncd_cache:";

// How long a cached entry stays usable before the browser discards it.
export const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Rough ceiling for the whole cache. Browsers count localStorage in UTF-16
// code units, so the real storage cost is roughly twice the string length.
// Kept below the usual 5MB quota so a full cache never throws.
const MAX_CACHE_BYTES = 2 * 1024 * 1024;

// Blobs larger than this are not cached; a single large image could blow the
// whole storage quota.
export const MAX_CACHED_BLOB_BYTES = 1_500_000;

interface CacheEntry<T> {
    // Timestamp (ms) of the moment the entry was written.
    t: number;
    // Username the entry belongs to, so a shared browser never mixes users.
    u: string;
    // Payload.
    d: T;
}

interface CacheStats {
    entries: number;
    bytes: number;
}

// Keys used by the app. Keeping them in one place makes invalidation
// predictable.
export const cacheKeys = {
    list: (folderId: number, sort: string, filter: string) => `list:${folderId}:${sort}:${filter}`,
    recents: (endpoint: string, page: number) => `recents:${endpoint}:${page}`,
    marked: (page: number) => `marked:${page}`,
    thumbnail: (fileId: number) => `thumb:${fileId}`,
    preview: (fileId: number) => `preview:${fileId}`,
};

function currentUser(): string {
    return localStorage.getItem("user") ?? "anonymous";
}

function fullKey(key: string): string {
    return CACHE_PREFIX + key;
}

function removeStorageKey(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // Storage can be unavailable (private mode, disabled cookies); ignore.
    }
}

interface CacheEntryInfo {
    key: string;
    t: number;
    size: number;
}

function listCacheEntries(): CacheEntryInfo[] {
    const entries: CacheEntryInfo[] = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(CACHE_PREFIX)) continue;
            const raw = localStorage.getItem(key) ?? "";
            let t = 0;
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed.t === "number") t = parsed.t;
            } catch {
                // Corrupted entry, treat it as the oldest one.
            }
            entries.push({ key, t, size: key.length + raw.length });
        }
    } catch {
        return entries;
    }
    return entries;
}

/**
 * Removes the oldest entries until the new entry fits within the storage
 * budget.
 */
function makeRoom(extraBytes: number): void {
    const entries = listCacheEntries();
    let total = entries.reduce((sum, entry) => sum + entry.size, 0);
    if (total + extraBytes <= MAX_CACHE_BYTES) return;

    entries.sort((a, b) => a.t - b.t);
    for (const entry of entries) {
        if (total + extraBytes <= MAX_CACHE_BYTES) break;
        removeStorageKey(entry.key);
        total -= entry.size;
    }
}

/**
 * Reads a cached payload. Expired entries (and entries belonging to another
 * user) are deleted from storage and reported as a miss.
 */
export function readCache<T>(key: string): T | null {
    const storageKey = fullKey(key);
    let raw: string | null = null;
    try {
        raw = localStorage.getItem(storageKey);
    } catch {
        return null;
    }
    if (raw === null) return null;

    let entry: CacheEntry<T>;
    try {
        entry = JSON.parse(raw);
    } catch {
        removeStorageKey(storageKey);
        return null;
    }

    if (!entry || typeof entry.t !== "number") {
        removeStorageKey(storageKey);
        return null;
    }
    if (Date.now() - entry.t > CACHE_TTL_MS) {
        removeStorageKey(storageKey);
        return null;
    }
    if (entry.u !== currentUser()) {
        removeStorageKey(storageKey);
        return null;
    }
    return entry.d;
}

/**
 * Stores a payload and (re)starts its TTL.
 */
export function writeCache<T>(key: string, data: T): void {
    const storageKey = fullKey(key);
    const entry: CacheEntry<T> = { t: Date.now(), u: currentUser(), d: data };

    let serialized: string;
    try {
        serialized = JSON.stringify(entry);
    } catch {
        return;
    }

    makeRoom(serialized.length);

    try {
        localStorage.setItem(storageKey, serialized);
    } catch {
        // Quota exceeded even after eviction: drop the cache and try once more.
        clearCache();
        try {
            localStorage.setItem(storageKey, serialized);
        } catch {
            // Give up, the data simply is not cached.
        }
    }
}

export function invalidateCache(key: string): void {
    removeStorageKey(fullKey(key));
}

export function invalidateCacheByPrefix(prefix: string): void {
    const target = fullKey(prefix);
    try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(target)) keys.push(key);
        }
        keys.forEach(removeStorageKey);
    } catch {
        // ignore
    }
}

/**
 * Drops every cached list. Called after anything that changes the file tree
 * so the next read goes back to the server.
 */
export function invalidateContentCaches(fileId?: number): void {
    invalidateCacheByPrefix("list:");
    invalidateCacheByPrefix("recents:");
    invalidateCacheByPrefix("marked:");
    if (fileId !== undefined) {
        invalidateCache(cacheKeys.thumbnail(fileId));
        invalidateCache(cacheKeys.preview(fileId));
    }
}

/**
 * Removes every cached entry.
 */
export function clearCache(): void {
    try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) keys.push(key);
        }
        keys.forEach(removeStorageKey);
    } catch {
        // ignore
    }
}

/**
 * Startup sweep: removes expired entries and entries that belong to a
 * different user, so nothing stale is left behind in the browser.
 */
export function purgeExpiredCache(): void {
    const user = currentUser();
    const now = Date.now();
    try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(CACHE_PREFIX)) continue;
            const raw = localStorage.getItem(key) ?? "";
            let entry: CacheEntry<unknown> | null = null;
            try {
                entry = JSON.parse(raw);
            } catch {
                entry = null;
            }
            const expired = !entry || typeof entry.t !== "number" || now - entry.t > CACHE_TTL_MS;
            const foreign = !!entry && entry.u !== user;
            if (expired || foreign) keys.push(key);
        }
        keys.forEach(removeStorageKey);
    } catch {
        // ignore
    }
}

export function getCacheStats(): CacheStats {
    const entries = listCacheEntries();
    return {
        entries: entries.length,
        bytes: entries.reduce((sum, entry) => sum + entry.size, 0),
    };
}

/**
 * Reads a blob as a data URL so it can be stored in localStorage.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}
