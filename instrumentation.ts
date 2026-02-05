export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamically import to ensure server-side execution and avoid edge runtime issues
    const { initDomainEvents } =
      await import("@/lib/infrastructure/events/init");
    initDomainEvents();
  }
}
