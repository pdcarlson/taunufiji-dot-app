"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { account } from "@/lib/client/appwrite";
import { Models, OAuthProvider } from "appwrite";
import { useRouter, usePathname } from "next/navigation";
import { getProfileAction } from "@/lib/actions/auth.actions";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  profile: any | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
        // Fetch Internal Profile
        if (currentUser) {
            const userProfile = await getProfileAction(currentUser.$id);
            setProfile(userProfile);
        }
      } catch (err) {
        setUser(null);
        setProfile(null);
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
      `${origin}/login`
    );
  };

  const logout = async () => {
    await account.deleteSession("current");
    setUser(null);
    setProfile(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
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
