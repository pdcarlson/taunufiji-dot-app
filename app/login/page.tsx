import LoginClient from "@/components/auth/LoginClient";

export default function LoginPage() {
  // Middleware handles the "Already Logged In" redirect.
  // Layout handles the "Stale Cookie" cleanup.
  // This page is now purely UI.
  return <LoginClient />;
}
