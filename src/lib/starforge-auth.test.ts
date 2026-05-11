import { afterEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, isAuthConfigured, validatePasscode, verifySessionToken } from "./starforge-auth";

describe("starforge passcode auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects auth when passcode configuration is missing", () => {
    vi.stubEnv("STARFORGE_PASSCODE", "");
    vi.stubEnv("STARFORGE_SESSION_SECRET", "");

    expect(isAuthConfigured()).toBe(false);
    expect(validatePasscode("anything")).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);
  });

  it("accepts the configured passcode and verifies signed sessions", () => {
    vi.stubEnv("STARFORGE_PASSCODE", "anvil");
    vi.stubEnv("STARFORGE_SESSION_SECRET", "a-secret-that-is-long-enough-for-tests");

    const now = new Date("2026-05-11T12:00:00Z").getTime();
    const token = createSessionToken(now);

    expect(isAuthConfigured()).toBe(true);
    expect(validatePasscode("wrong")).toBe(false);
    expect(validatePasscode("anvil")).toBe(true);
    expect(verifySessionToken(token, now + 1000)).toBe(true);
    expect(verifySessionToken(`${token}tampered`, now + 1000)).toBe(false);
  });
});
