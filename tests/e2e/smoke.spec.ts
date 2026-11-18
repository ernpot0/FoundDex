import { expect, test } from "@playwright/test";

test.describe("FoundDex E2E Smoke Suite", () => {
  test("homepage renders brand identity and primary actions", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Lost Something\?/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Report Lost Item" }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Report Found Item" }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Browse & Search Map/i })
    ).toBeVisible();
  });

  test("health endpoint returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const json = (await res.json()) as { status: string; app: string };
    expect(json.status).toBe("ok");
    expect(json.app).toBe("FoundDex");
  });

  test("browse items page renders search filters and map", async ({ page }) => {
    await page.goto("/items");
    await expect(
      page.getByRole("heading", { name: /Browse Lost & Found Items/i })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/Search keyword, brand, or location/i)
    ).toBeVisible();
  });

  test("login page renders Sign In and Create Account modes", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /Sign in to FoundDex/i })
    ).toBeVisible();
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(
      page.getByRole("heading", { name: /Create an account/i })
    ).toBeVisible();
  });

  test("protected routes redirect unauthenticated visitors to /login", async ({
    page,
  }) => {
    for (const route of ["/report", "/recovery", "/messages", "/account"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});

