type Attempt = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, Attempt>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function getClientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function isLoginBlocked(key: string) {
  const attempt = attempts.get(key);
  if (!attempt) return false;
  if (attempt.resetAt <= Date.now()) {
    attempts.delete(key);
    return false;
  }
  return attempt.count >= MAX_ATTEMPTS;
}

export function recordFailedLogin(key: string) {
  const existing = attempts.get(key);
  if (!existing || existing.resetAt <= Date.now()) {
    attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
    return;
  }
  existing.count += 1;
}

export function clearFailedLogins(key: string) {
  attempts.delete(key);
}
