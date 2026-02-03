"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { account } from "@/lib/infrastructure/persistence/appwrite.web";
import { Models, OAuthProvider } from "appwrite";
import { useRouter, usePathname } from "next/navigation";
import {
  getProfileAction,
  checkHousingAdminAction,
} from "@/lib/presentation/actions/auth.actions";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  profile: any | null;
  isHousingAdmin: boolean;
  loading: boolean;
  error: any | null;
  login: () => void;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null,
  );
  const [profile, setProfile] = useState<any | null>(null);
  const [isHousingAdmin, setIsHousingAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Client-side session check on mount and route change
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("[AuthProvider] Checking session...");
        const currentUser = await account.get();
        console.log("[AuthProvider] Session found:", currentUser.$id);
        setUser(currentUser);
        setError(null);

        // Redirect to dashboard if on login page
        if (pathname === "/login") {
          router.push("/dashboard");
          return;
        }

        // Fetch Profile
        console.log("[AuthProvider] Fetching profile for:", currentUser.$id);

        // Create JWT for Server Action Verification
        console.log("[AuthProvider] Creating JWT...");
        const jwtResponse = await account.createJWT();
        console.log("[AuthProvider] JWT Created");

        const [userProfile, adminStatus] = await Promise.all([
          getProfileAction(jwtResponse.jwt),
          checkHousingAdminAction(jwtResponse.jwt),
        ]);
        console.log("[AuthProvider] Profile fetched:", userProfile);
        console.log("[AuthProvider] Housing Admin:", adminStatus);
        setProfile(userProfile);
        setIsHousingAdmin(adminStatus);
      } catch (err: any) {
        console.warn("[AuthProvider] No session found", err);
        setUser(null);
        setProfile(null);
        setError(err.message || err.toString());
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

  const getToken = async () => {
    const { jwt } = await account.createJWT();
    return jwt;
  };

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
