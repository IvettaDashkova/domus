import { test, expect } from "@playwright/test";

test.describe("public landing + SEO surface", () => {
  test("landing renders with the Domus title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Domus/);
  });

  test("has canonical, OG image and Google verification meta", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute(
      "content",
      /.+/,
    );
  });

  test("emits schema.org JSON-LD structured data", async ({ page }) => {
    await page.goto("/");
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(ld).toBeTruthy();
    const data = JSON.parse(ld!);
    expect(data["@type"]).toBe("SoftwareApplication");
  });

  test("serves robots.txt with a sitemap reference", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok()).toBeTruthy();
    expect(await res.text()).toContain("Sitemap:");
  });

  test("serves a valid sitemap.xml", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["content-type"]).toContain("xml");
    expect(await res.text()).toContain("<urlset");
  });

  test("serves a web manifest", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();
  });

  test("login page is reachable", async ({ page }) => {
    const res = await page.goto("/login");
    expect(res?.ok()).toBeTruthy();
  });
});
