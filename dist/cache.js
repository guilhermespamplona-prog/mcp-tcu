import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
function getDefaultCachePath() {
    if (process.env.CACHE_PATH)
        return process.env.CACHE_PATH;
    const __dirname = dirname(fileURLToPath(import.meta.url));
    return resolve(__dirname, '..', 'data', 'acordaos.json');
}
export function readCache(cachePath) {
    const p = cachePath ?? getDefaultCachePath();
    try {
        const parsed = JSON.parse(readFileSync(p, 'utf8'));
        if (typeof parsed?.lastUpdated !== 'string' || !Array.isArray(parsed?.acordaos))
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
export function writeCache(data, cachePath) {
    const p = cachePath ?? getDefaultCachePath();
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}
export function isCacheExpired(data) {
    return Date.now() - new Date(data.lastUpdated).getTime() > CACHE_TTL_MS;
}
