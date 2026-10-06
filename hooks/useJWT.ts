/**
 * useJWT Hook
 *
 * Encapsulates Appwrite JWT access in a single location (backed by a shared cache).
 * Components should use this hook instead of importing the Appwrite account directly.
 *
 * @example
 * ```tsx
 * const { getJWT } = useJWT();
 *
 * const handleSubmit = async () => {
 *   const jwt = await getJWT();
 *   await someServerAction(data, jwt);
 * };
 * ```
 */

import { useCallback } from "react";
import { jwtCache } from "@/lib/infrastructure/persistence/appwrite.web";

interface UseJWTReturn {
  /**
   * Returns a JWT for server actions, reusing a recent one when possible.
   */
  getJWT: () => Promise<string>;
}

export function useJWT(): UseJWTReturn {
  const getJWT = useCallback((): Promise<string> => jwtCache.get(), []);

  return { getJWT };
}

export default useJWT;
