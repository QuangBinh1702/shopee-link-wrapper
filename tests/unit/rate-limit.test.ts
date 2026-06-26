import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows first request", () => {
    expect(checkRateLimit("test-ip-1")).toBe(true);
  });

  it("allows requests within limit", () => {
    const ip = "test-ip-2";
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(ip)).toBe(true);
    }
  });

  it("blocks exceeding requests", () => {
    const ip = "test-ip-3";
    for (let i = 0; i < 20; i++) {
      checkRateLimit(ip);
    }
    expect(checkRateLimit(ip)).toBe(false);
  });
});
