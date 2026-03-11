import { expect, test } from "@playwright/test";

test("login page renders expected auth call-to-action", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Tau Nu Fiji App" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Login with Discord" })).toBeVisible();
});

test("root route redirects unauthenticated users to login flow", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForURL("**/login");
  await expect(page).toHaveURL(/\/login$/);
});

test("unauthorized route renders static access restriction copy", async ({
  page,
}) => {
  await page.goto("/unauthorized");

  await expect(
    page.getByRole("heading", { name: "Access Restricted" }),
  ).toBeVisible();
  await expect(page.getByText("Verification Required")).toBeVisible();
});
