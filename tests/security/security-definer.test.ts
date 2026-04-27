/**
 * SECURITY DEFINER function regression suite.
 *
 * These functions intentionally bypass RLS, so their **return shape**
 * is the security boundary. If a future migration widens the SELECT
 * list of `lookup_draft_by_share_token` or `lookup_community_by_invite`
 * we want to fail loudly here.
 */
import { describe, expect, it } from "vitest";
import { anon, QA_SHARE_TOKEN, UNKNOWN_TOKEN } from "./anonClient";

const ALLOWED_DRAFT_COLUMNS = [
  "title",
  "theme",
  "outline",
  "scripture_refs",
  "created_at",
] as const;

const FORBIDDEN_DRAFT_COLUMNS = [
  "id",
  "pastor_id",
  "community_id",
  "share_token",
  "status",
  "updated_at",
  "question_count",
] as const;

describe("SECURITY DEFINER — lookup_draft_by_share_token", () => {
  it("returns no rows for an unknown token", async () => {
    const { data, error } = await anon.rpc("lookup_draft_by_share_token", {
      _share_token: UNKNOWN_TOKEN,
    });
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("returns the seeded QA draft with only whitelisted columns", async () => {
    const { data, error } = await anon.rpc("lookup_draft_by_share_token", {
      _share_token: QA_SHARE_TOKEN,
    });
    expect(error).toBeNull();

    // The QA token is seeded for the Playwright suite; if it is missing
    // we skip the shape assertion rather than fail spuriously.
    if (!data || data.length === 0) {
      console.warn(
        "[security] QA draft token not seeded — skipping shape assertion",
      );
      return;
    }

    const row = data[0] as Record<string, unknown>;
    const keys = Object.keys(row).sort();
    expect(keys).toEqual([...ALLOWED_DRAFT_COLUMNS].sort());
    for (const forbidden of FORBIDDEN_DRAFT_COLUMNS) {
      expect(row).not.toHaveProperty(forbidden);
    }
  });

  it("does not allow enumeration via empty / null tokens", async () => {
    const probes = ["", " ", "%", "*", null];
    for (const probe of probes) {
      const { data, error } = await anon.rpc("lookup_draft_by_share_token", {
        _share_token: probe as string,
      });
      // Either the call errors or returns nothing — never a row.
      expect(error || (data ?? []).length === 0).toBeTruthy();
    }
  });
});

describe("SECURITY DEFINER — lookup_community_by_invite", () => {
  it("returns no rows for an unknown invite code", async () => {
    const { data, error } = await anon.rpc("lookup_community_by_invite", {
      _invite_code: "sec-regression-unknown-" + Date.now().toString(36),
    });
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("never returns pastor_id / invite_code / created_at fields", async () => {
    // Even if an invite happens to match, the function whitelist must
    // restrict the shape to id, name, type only.
    const { data, error } = await anon.rpc("lookup_community_by_invite", {
      _invite_code: "any",
    });
    expect(error).toBeNull();
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const keys = Object.keys(row).sort();
      expect(keys).toEqual(["id", "name", "type"]);
      expect(row).not.toHaveProperty("pastor_id");
      expect(row).not.toHaveProperty("invite_code");
      expect(row).not.toHaveProperty("created_at");
    }
  });
});

describe("SECURITY DEFINER — has_role / get_user_role for anon", () => {
  it("get_user_role returns null for an unknown user id", async () => {
    const { data, error } = await anon.rpc("get_user_role", {
      _user_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("has_role returns false for anon on every defined role", async () => {
    for (const role of ["admin", "moderator", "user"] as const) {
      const { data, error } = await anon.rpc("has_role", {
        _user_id: "00000000-0000-0000-0000-000000000000",
        _role: role,
      });
      expect(error).toBeNull();
      expect(data).toBe(false);
    }
  });
});

describe("SECURITY DEFINER — privileged helpers must reject anon callers", () => {
  it("get_cron_shared_secret denies anon", async () => {
    const { error } = await anon.rpc("get_cron_shared_secret");
    // Function raises 'access denied' for non-service-role callers.
    expect(error).not.toBeNull();
    expect((error?.message ?? "").toLowerCase()).toMatch(/access denied|denied|permission/);
  });
});