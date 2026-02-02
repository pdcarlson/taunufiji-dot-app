import LoginClient from "@/components/auth/LoginClient";

export default function LoginPage() {
  // AuthProvider handles the "Already Logged In" redirect.
  // This page is purely UI.
  return <LoginClient />;
}
