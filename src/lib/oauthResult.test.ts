import { describe, it, expect } from "vitest";
import { interpretOAuthResult } from "./oauthResult";

describe("interpretOAuthResult", () => {
  it("returns session_ready when there is no error and redirected is false (popup flow)", () => {
    // Regression guard: a previous bug treated !redirected as failure, causing
    // signed-in users to see a 'could not complete' error toast.
    expect(interpretOAuthResult({ redirected: false })).toEqual({ kind: "session_ready" });
    expect(interpretOAuthResult({ error: null, redirected: false })).toEqual({
      kind: "session_ready",
    });
  });

  it("returns redirecting when redirected is true", () => {
    expect(interpretOAuthResult({ redirected: true })).toEqual({ kind: "redirecting" });
  });

  it("returns error when result.error is set", () => {
    expect(interpretOAuthResult({ error: { message: "boom" } })).toEqual({
      kind: "error",
      message: "boom",
    });
  });

  it("falls back to 'Unknown error' when error has no message", () => {
    expect(interpretOAuthResult({ error: {} })).toEqual({
      kind: "error",
      message: "Unknown error",
    });
  });
});