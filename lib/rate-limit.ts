const rawLimit = process.env.WRAP_RATE_LIMIT_PER_MINUTE;
const RATE_LIMIT_PER_MINUTE = rawLimit ? Number(rawLimit) : 20;

const MAX_STORE_SIZE = 10000;

const store = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 60_000);

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt <= now) {
    if (store.size >= MAX_STORE_SIZE && !store.has(ip)) {
      return true;
    }
    store.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }

  entry.count++;
  return true;
}
