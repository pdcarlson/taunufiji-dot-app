"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { account } from "@/lib/infrastructure/client/appwrite";
import { Models, OAuthProvider } from "appwrite";
import { useRouter, usePathname } from "next/navigation";
import { getProfileAction } from "@/lib/presentation/actions/auth.actions";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  profile: any | null;
  loading: boolean;
  error: any | null; // NEW: Expose error
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null,
  );
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any | null>(null); // NEW
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("[AuthProvider] Checking session...");

        // Debug Config
        console.log("[AuthProvider] Config:", {
          endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
          project: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
        });

        const currentUser = await account.get();
        console.log("[AuthProvider] Session found:", currentUser.$id);
        setUser(currentUser);
        setError(null);

        // Fetch Internal Profile
        if (currentUser) {
          console.log("[AuthProvider] Fetching profile for:", currentUser.$id);
          const userProfile = await getProfileAction(currentUser.$id);
          console.log("[AuthProvider] Profile fetched:", userProfile);
          setProfile(userProfile);
        }
      } catch (err: any) {
        console.warn("[AuthProvider] No session found", err);
        setUser(null);
        setProfile(null);
        setError(err.message || err.toString()); // Capture Error
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [pathname]);

  const login = () => {
    // Redirect to Discord OAuth
    // Success URL: Dashboard
    // Failure URL: Login
    const origin = window.location.origin;
    account.createOAuth2Session(
      OAuthProvider.Discord,
      `${origin}/dashboard`,
      `${origin}/login`,
    );
  };

  const logout = async () => {
    await account.deleteSession("current");
    setUser(null);
    setProfile(null);
    setError(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, error, login, logout }}
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
