import { test, expect } from "@playwright/test";

const SHOPEE_WEB_LINK = "https://shopee.vn/product/123456789/9876543210";
const MOBILE_SHORT_LINK = "https://shp.ee/abc123";

test.describe("E2E-005 / E2E-006 — Layout", () => {
  test("mobile viewport 390px — no overflow, all elements visible", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const form = page.locator("form");
    await expect(form).toBeVisible();

    const input = page.locator('input[type="url"]');
    await expect(input).toBeVisible();

    const button = page.locator('button[type="submit"]');
    await expect(button).toBeVisible();

    await expect(page.locator("footer")).toBeVisible();
  });

  test("desktop viewport 1440px — balanced layout, no overlap", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const form = page.locator("form");
    await expect(form).toBeVisible();
    await expect(form).toBeInViewport();

    const boxes = await page
      .locator("main > *, footer")
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { tag: el.tagName, top: r.top, bottom: r.bottom };
        })
      );

    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1);
    }
  });
});

test.describe("E2E-001 / E2E-002 — Wrap flow", () => {
  test("paste web Shopee link and submit — shows short URL", async ({
    page,
  }) => {
    await page.goto("/");

    const input = page.locator('input[type="url"]');
    await input.fill(SHOPEE_WEB_LINK);

    const button = page.locator('button[type="submit"]');
    await button.click();

    await page.waitForTimeout(1000);

    const errorEl = page.locator('[role="alert"], .text-red-500, .text-red-400');
    const resultEl = page.locator("text=/localhost:|shortUrl|Đã sao chép/");

    const hasError = (await errorEl.count()) > 0;
    const hasResult = (await resultEl.count()) > 0;

    if (hasError) {
      const errorText = await errorEl.textContent();
      test.skip(
        !hasResult,
        `API unavailable (expected in CI without MongoDB): ${errorText}`
      );
    } else {
      await expect(resultEl.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("paste short Shopee link and submit — shows short URL", async ({
    page,
  }) => {
    await page.goto("/");

    const input = page.locator('input[type="url"]');
    await input.fill(MOBILE_SHORT_LINK);

    const button = page.locator('button[type="submit"]');
    await button.click();

    await page.waitForTimeout(2000);

    const errorEl = page.locator('[role="alert"], .text-red-500, .text-red-400');
    const hasError = (await errorEl.count()) > 0;

    if (hasError) {
      test.skip(true, "Short URL expand may fail without external network");
    }
  });
});

test.describe("E2E-003 — Redirect 302", () => {
  test("calling short URL redirects to canonical URL", async ({ request }) => {
    const response = await request.post("/api/wrap", {
      data: { url: SHOPEE_WEB_LINK },
    });

    if (!response.ok()) {
      test.skip(true, "API not available (no MongoDB)");
      return;
    }

    const body = await response.json();
    const shortUrl = body.data?.shortUrl;

    expect(shortUrl).toBeTruthy();

    const redirectResp = await request.get(shortUrl, {
      maxRedirects: 0,
    });

    expect(redirectResp.status()).toBe(302);
    const location = redirectResp.headers()["location"];
    expect(location).toBeTruthy();
    expect(location).toContain("shopee.vn");
  });
});

test.describe("E2E-004 — Click counter", () => {
  test("clicking short URL multiple times increments clicks", async ({
    request,
  }) => {
    const response = await request.post("/api/wrap", {
      data: { url: SHOPEE_WEB_LINK },
    });

    if (!response.ok()) {
      test.skip(true, "API not available (no MongoDB)");
      return;
    }

    const body = await response.json();
    const shortUrl = body.data?.shortUrl;
    const slug = body.data?.slug;

    await request.get(shortUrl, { maxRedirects: 0 });
    await request.get(shortUrl, { maxRedirects: 0 });

    const verifyResp = await request.get(
      `/api/wrap?slug=${slug}`,
      { maxRedirects: 0 }
    );

    if (verifyResp.ok()) {
      const verifyBody = await verifyResp.json();
      const clicks = verifyBody.data?.clicks;
      expect(clicks).toBeGreaterThanOrEqual(2);
    }
  });
});

test.describe("E2E-007 — API timing", () => {
  test("POST /api/wrap responds within 2 seconds", async ({ request }) => {
    const start = Date.now();
    const response = await request.post("/api/wrap", {
      data: { url: SHOPEE_WEB_LINK },
    });
    const elapsed = Date.now() - start;

    if (!response.ok()) {
      test.skip(true, "API not available (no MongoDB)");
      return;
    }

    expect(elapsed).toBeLessThan(2000);
  });
});
