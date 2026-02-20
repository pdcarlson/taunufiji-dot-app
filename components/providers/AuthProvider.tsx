"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { account } from "@/lib/infrastructure/persistence/appwrite.web";
import { Models, OAuthProvider } from "appwrite";
import { useRouter, usePathname } from "next/navigation";
import {
  getProfileAction,
  checkHousingAdminAction,
} from "@/lib/presentation/actions/auth.actions";

import { Member } from "@/lib/domain/entities";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  profile: Member | null;
  isHousingAdmin: boolean;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null,
  );
  const [profile, setProfile] = useState<Member | null>(null);
  const [isHousingAdmin, setIsHousingAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Client-side session check on mount and route change
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
        setError(null);

        // Redirect to dashboard if on login page
        if (pathname === "/login") {
          router.push("/dashboard");
          return;
        }

        // Create JWT for Server Action Verification
        const jwtResponse = await account.createJWT();

        const [userProfileData, adminStatus] = await Promise.all([
          getProfileAction(jwtResponse.jwt),
          checkHousingAdminAction(jwtResponse.jwt),
        ]);

        // getProfileAction returns { profile: Member | null, isAuthorized: boolean } | null
        setProfile(userProfileData?.profile ?? null);
        setIsHousingAdmin(adminStatus);
      } catch (err: unknown) {
        console.warn("[AuthProvider] No session found", err);
        setUser(null);
        setProfile(null);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [pathname, router]);

  const login = () => {
    const origin = window.location.origin;
    account.createOAuth2Session(
      OAuthProvider.Discord,
      `${origin}/dashboard`,
      `${origin}/login`,
    );
  };

  const getToken = useCallback(async () => {
    const { jwt } = await account.createJWT();
    return jwt;
  }, []);

  const logout = async () => {
    await account.deleteSession("current");
    setUser(null);
    setProfile(null);
    setIsHousingAdmin(false);
    setError(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isHousingAdmin,
        loading,
        error,
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
