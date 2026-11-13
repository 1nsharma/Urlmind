import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'urlmind');
const DEFAULT_TTL_HOURS = Number(process.env.CACHE_TTL_HOURS) || 24;
const MAX_MEMORY_ENTRIES = 100;

interface CacheEntry<T> {
  data: T;
  cachedAt: string;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

export function normalizeCacheUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'igsh', 'si', 's', 't'].forEach(
      (param) => parsed.searchParams.delete(param),
    );
    const normalized = parsed.toString();
    return normalized.endsWith('/') && parsed.pathname !== '/'
      ? normalized.slice(0, -1)
      : normalized;
  } catch {
    return rawUrl.trim();
  }
}

function getCacheKey(normalizedUrl: string): string {
  return crypto.createHash('sha256').update(normalizedUrl).digest('hex');
}

function setMemoryCache<T>(key: string, entry: CacheEntry<T>) {
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, entry);
}

export async function getCachedReport<T>(
  rawUrl: string,
  cacheDir = CACHE_DIR,
): Promise<{ data: T; cachedAt: string } | null> {
  const normalized = normalizeCacheUrl(rawUrl);
  const key = getCacheKey(normalized);
  const now = Date.now();

  const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memEntry) {
    if (memEntry.expiresAt > now) {
      memoryCache.delete(key);
      memoryCache.set(key, memEntry);
      return { data: memEntry.data, cachedAt: memEntry.cachedAt };
    }
    memoryCache.delete(key);
  }

  try {
    const filePath = path.join(cacheDir, `${key}.json`);
    const rawFile = await fs.readFile(filePath, 'utf-8');
    const diskEntry = JSON.parse(rawFile) as CacheEntry<T>;

    if (diskEntry.expiresAt > now) {
      setMemoryCache(key, diskEntry);
      return { data: diskEntry.data, cachedAt: diskEntry.cachedAt };
    }
    await fs.unlink(filePath).catch(() => {});
  } catch {
    // Cache miss
  }

  return null;
}

export async function setCachedReport<T>(
  rawUrl: string,
  data: T,
  ttlHours = DEFAULT_TTL_HOURS,
  cacheDir = CACHE_DIR,
): Promise<string> {
  const normalized = normalizeCacheUrl(rawUrl);
  const key = getCacheKey(normalized);
  const cachedAt = new Date().toISOString();
  const entry: CacheEntry<T> = {
    data,
    cachedAt,
    expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
  };

  setMemoryCache(key, entry);

  try {
    await fs.mkdir(cacheDir, { recursive: true });
    const filePath = path.join(cacheDir, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
  } catch (err) {
    console.warn('[URLMIND Cache] Disk write skipped:', err);
  }

  return cachedAt;
}

export async function clearCachedReport(
  rawUrl: string,
  cacheDir = CACHE_DIR,
): Promise<void> {
  const normalized = normalizeCacheUrl(rawUrl);
  const key = getCacheKey(normalized);
  memoryCache.delete(key);
  try {
    await fs.unlink(path.join(cacheDir, `${key}.json`));
  } catch {
    // Ignore missing entry
  }
}
