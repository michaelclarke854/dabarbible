/**
 * RLS write-deny regression suite.
 *
 * Anon must never be able to INSERT or UPDATE rows that belong to
 * authenticated users or to admin-only surfaces. These are the highest-
 * impact RLS regressions, so each failure should block a deploy.
 */
import { describe, expect, it } from "vitest";
import { anon, assertAnonCannotInsert } from "./anonClient";

describe("RLS — anon INSERT is blocked on protected tables", () => {
  it("anon cannot insert a profile row", async () => {
    const { denied, error } = await assertAnonCannotInsert("profiles", {
      user_id: "00000000-0000-0000-0000-000000000000",
      role: "free",
      plan: "free",
    });
    expect(denied, error?.message).toBe(true);
  });

  it("anon cannot insert a subscription row", async () => {
    const { denied } = await assertAnonCannotInsert("subscriptions", {
      user_id: "00000000-0000-0000-0000-000000000000",
      plan_type: "personal",
      status: "active",
    });
    expect(denied).toBe(true);
  });

  it("anon cannot insert a wisdom_session row", async () => {
    const { denied } = await assertAnonCannotInsert("wisdom_sessions", {
      question: "rls probe",
      response: "rls probe",
      user_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(denied).toBe(true);
  });

  it("anon cannot write to role_change_log", async () => {
    const { denied } = await assertAnonCannotInsert("role_change_log", {
      target_user_id: "00000000-0000-0000-0000-000000000000",
      new_role: "super_admin",
      old_role: "free",
    });
    expect(denied).toBe(true);
  });

  it("anon cannot write to system_prompts", async () => {
    const { denied } = await assertAnonCannotInsert("system_prompts", {
      version: "rls-probe",
      is_active: true,
      content: { rls: "probe" },
    });
    expect(denied).toBe(true);
  });

  it("anon cannot write to app_config", async () => {
    const { denied } = await assertAnonCannotInsert("app_config", {
      key: "rls-probe",
      value: "rls-probe",
    });
    expect(denied).toBe(true);
  });

  it("anon cannot write to pastor_message_drafts", async () => {
    const { denied } = await assertAnonCannotInsert("pastor_message_drafts", {
      community_id: "00000000-0000-0000-0000-000000000000",
      pastor_id: "00000000-0000-0000-0000-000000000000",
      title: "rls probe",
      theme: "rls probe",
      outline: "rls probe",
    });
    expect(denied).toBe(true);
  });

  it("anon UPDATE on profiles cannot escalate role", async () => {
    const { error, data } = await anon
      .from("profiles")
      .update({ role: "super_admin", plan: "community" })
      .neq("user_id", "00000000-0000-0000-0000-000000000000")
      .select("user_id");
    // Either the request errors OR it returns zero affected rows.
    expect(error || (data?.length ?? 0) === 0).toBeTruthy();
  });
});

describe("RLS — public submission paths still work", () => {
  it("anon can submit a funnel_event with no user_id", async () => {
    const { error } = await anon.from("funnel_events").insert({
      event_name: "security_regression_probe",
      anon_session_id: "sec-test-" + Date.now(),
      screen: "test",
    });
    expect(error).toBeNull();
  });

  it("anon can submit a pastoral_inquiry with valid shape", async () => {
    const { error } = await anon.from("pastoral_inquiries").insert({
      name: "Security Regression Bot",
      church_name: "Regression Test Church",
      email: `sec-regression+${Date.now()}@example.com`,
      notes: "Automated security regression — safe to delete.",
    });
    expect(error).toBeNull();
  });

  it("anon CANNOT submit a pastoral_inquiry with malformed email", async () => {
    const { error } = await anon.from("pastoral_inquiries").insert({
      name: "Bad Email",
      church_name: "Bad",
      email: "not-an-email",
    });
    expect(error).not.toBeNull();
  });
});