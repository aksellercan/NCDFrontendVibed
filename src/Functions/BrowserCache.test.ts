import {
    cacheKeys,
    clearCache,
    getCacheStats,
    invalidateContentCaches,
    purgeExpiredCache,
    readCache,
    writeCache,
    CACHE_TTL_MS,
} from "./BrowserCache";

function setUser(name: string | null) {
    if (name === null) localStorage.removeItem("user");
    else localStorage.setItem("user", name);
}

function rawEntries(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("ncd_cache:")) keys.push(key);
    }
    return keys;
}

function ageEntry(key: string, millis: number) {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error("missing entry");
    const parsed = JSON.parse(raw);
    parsed.t = Date.now() - millis;
    localStorage.setItem(key, JSON.stringify(parsed));
}

beforeEach(() => {
    localStorage.clear();
    setUser("alice");
});

test("stores and reads a payload back", () => {
    writeCache(cacheKeys.list(0, "ALPHABETICAL", "DEFAULT"), { files: [1], folders: [] });
    expect(readCache(cacheKeys.list(0, "ALPHABETICAL", "DEFAULT"))).toEqual({ files: [1], folders: [] });
});

test("reports a miss for an unknown key", () => {
    expect(readCache("list:999:NONE:NONE")).toBeNull();
});

test("an expired entry is deleted and reported as a miss", () => {
    const key = cacheKeys.list(0, "ALPHABETICAL", "DEFAULT");
    writeCache(key, { files: [] });
    ageEntry("ncd_cache:" + key, CACHE_TTL_MS + 1000);

    expect(readCache(key)).toBeNull();
    expect(rawEntries()).toHaveLength(0);
});

test("an entry younger than the ttl is still served", () => {
    const key = cacheKeys.list(0, "ALPHABETICAL", "DEFAULT");
    writeCache(key, { files: [] });
    ageEntry("ncd_cache:" + key, CACHE_TTL_MS - 60_000);

    expect(readCache(key)).not.toBeNull();
});

test("the startup sweep removes expired entries", () => {
    const key = cacheKeys.list(0, "ALPHABETICAL", "DEFAULT");
    writeCache(key, { files: [] });
    ageEntry("ncd_cache:" + key, CACHE_TTL_MS + 1000);

    purgeExpiredCache();
    expect(rawEntries()).toHaveLength(0);
});

test("the startup sweep keeps fresh entries", () => {
    const key = cacheKeys.list(0, "ALPHABETICAL", "DEFAULT");
    writeCache(key, { files: [] });

    purgeExpiredCache();
    expect(rawEntries()).toHaveLength(1);
});

test("entries of another user are not served and are removed", () => {
    const key = cacheKeys.list(0, "ALPHABETICAL", "DEFAULT");
    writeCache(key, { files: [] });

    setUser("bob");
    expect(readCache(key)).toBeNull();
    expect(rawEntries()).toHaveLength(0);
});

test("writing again restarts the ttl", () => {
    const key = cacheKeys.list(0, "ALPHABETICAL", "DEFAULT");
    writeCache(key, { files: [] });
    ageEntry("ncd_cache:" + key, CACHE_TTL_MS - 1000);

    writeCache(key, { files: [1] });
    ageEntry("ncd_cache:" + key, CACHE_TTL_MS - 1000);

    expect(readCache(key)).not.toBeNull();
});

test("content invalidation drops listings and media of a file", () => {
    writeCache(cacheKeys.list(0, "A", "DEFAULT"), {});
    writeCache(cacheKeys.recents("folder", 0), {});
    writeCache(cacheKeys.marked(0), {});
    writeCache(cacheKeys.thumbnail(7), "data");
    writeCache(cacheKeys.preview(7), "data");

    invalidateContentCaches(7);

    expect(readCache(cacheKeys.list(0, "A", "DEFAULT"))).toBeNull();
    expect(readCache(cacheKeys.recents("folder", 0))).toBeNull();
    expect(readCache(cacheKeys.marked(0))).toBeNull();
    expect(readCache(cacheKeys.thumbnail(7))).toBeNull();
    expect(readCache(cacheKeys.preview(7))).toBeNull();
});

test("content invalidation without a file id keeps media", () => {
    writeCache(cacheKeys.list(0, "A", "DEFAULT"), {});
    writeCache(cacheKeys.thumbnail(7), "data");

    invalidateContentCaches();

    expect(readCache(cacheKeys.list(0, "A", "DEFAULT"))).toBeNull();
    expect(readCache(cacheKeys.thumbnail(7))).toBe("data");
});

test("clearing the cache removes every entry but keeps other storage", () => {
    writeCache(cacheKeys.list(0, "A", "DEFAULT"), {});
    writeCache(cacheKeys.thumbnail(7), "data");
    localStorage.setItem("theme", "dark");

    clearCache();

    expect(rawEntries()).toHaveLength(0);
    expect(localStorage.getItem("theme")).toBe("dark");
});

test("cache stats count entries and bytes", () => {
    expect(getCacheStats().entries).toBe(0);

    writeCache(cacheKeys.list(0, "A", "DEFAULT"), { files: [1, 2, 3] });
    const stats = getCacheStats();

    expect(stats.entries).toBe(1);
    expect(stats.bytes).toBeGreaterThan(0);
});
