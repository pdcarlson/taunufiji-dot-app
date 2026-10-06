/**
 * Browser-side cache for Appwrite JWTs.
 *
 * Appwrite JWTs live 15 minutes, and Appwrite rate-limits JWT creation per user.
 * Minting one for every click and every route change let active members hit
 * that limit, after which every action failed until it reset.
 */

/** Reuse a token for 10 minutes, leaving headroom before the 15-minute expiry. */
export const JWT_REUSE_MS = 10 * 60 * 1000;

export interface JWTCache {
  /** Returns a cached token, minting one if none is fresh. Concurrent callers share one mint. */
  get: () => Promise<string>;
  /** Drops the cached token (call on logout or after an auth failure). */
  clear: () => void;
}

/**
 * @param mint - Creates a new JWT (e.g. `account.createJWT`).
 * @param now - Clock, injectable for tests.
 */
export function createJWTCache(
  mint: () => Promise<string>,
  now: () => number = Date.now,
): JWTCache {
  let token: string | null = null;
  let mintedAt = 0;
  let inFlight: Promise<string> | null = null;

  const get = async (): Promise<string> => {
    if (token && now() - mintedAt < JWT_REUSE_MS) return token;
    if (inFlight) return inFlight;

    const startedAt = now();
    inFlight = mint()
      .then((jwt) => {
        token = jwt;
        mintedAt = startedAt;
        return jwt;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  const clear = () => {
    token = null;
    mintedAt = 0;
  };

  return { get, clear };
}
