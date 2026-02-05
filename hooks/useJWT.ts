/**
 * useJWT Hook
 *
 * Encapsulates Appwrite JWT token creation in a single location.
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
import { account } from "@/lib/infrastructure/persistence/appwrite.web";

interface UseJWTReturn {
  /**
   * Creates a new JWT token on-demand.
   * Returns the JWT string directly.
   */
  getJWT: () => Promise<string>;
}

export function useJWT(): UseJWTReturn {
  const getJWT = useCallback(async (): Promise<string> => {
    const { jwt } = await account.createJWT();
    return jwt;
  }, []);

  return { getJWT };
}

export default useJWT;
