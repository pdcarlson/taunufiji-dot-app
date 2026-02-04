import LoginView from "@/components/features/auth/LoginView";

export default function LoginPage() {
  // AuthProvider handles the "Already Logged In" redirect.
  // This page is purely UI.
  return <LoginView />;
}
