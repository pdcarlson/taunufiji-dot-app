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
import { useRouter } from "next/navigation";
import { getProfileAction } from "@/lib/presentation/actions/auth.actions";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  profile: any | null;
  loading: boolean;
  error: any | null;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: Models.User<Models.Preferences> | null;
}

export function AuthProvider({
  children,
  initialUser = null,
}: AuthProviderProps) {
  // Initialize state with Server Data
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    initialUser,
  );
  const [profile, setProfile] = useState<any | null>(null);
  // If we have initial user, we are not loading. If null, we are also done.
  // Profile fetch happens in background.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const router = useRouter();

  // Sync Profile on detailed hydration
  useEffect(() => {
    const syncProfile = async () => {
      if (user && !profile) {
        try {
          console.log("[AuthProvider] Hydrating profile for:", user.$id);
          const userProfile = await getProfileAction(user.$id);
          setProfile(userProfile);
        } catch (err) {
          console.error("Profile sync failed", err);
          // We do NOT redirect here. Just log error.
        }
      }
    };
    syncProfile();
  }, [user, profile]);

  const login = () => {
    // Redirect to Discord OAuth
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
    router.refresh(); // Refresh to clear server cookies
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
