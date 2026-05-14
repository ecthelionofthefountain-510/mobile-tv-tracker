import { beforeEach, describe, expect, it } from "vitest";
import {
  getAccount,
  hasAccount,
  listKnownUsernames,
  registerAccount,
  verifyAccount,
} from "./authStorage";

describe("authStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("registers and verifies a password-protected account", async () => {
    const result = await registerAccount("Alice", "secret123");
    expect(result.ok).toBe(true);

    const account = getAccount("Alice");
    expect(account?.username).toBe("Alice");
    expect(hasAccount("Alice")).toBe(true);

    const login = await verifyAccount("Alice", "secret123");
    expect(login.ok).toBe(true);
  });

  it("rejects duplicate accounts and wrong passwords", async () => {
    await registerAccount("Bob", "secret123");

    const duplicate = await registerAccount("bob", "another123");
    expect(duplicate.ok).toBe(false);

    const wrong = await verifyAccount("Bob", "wrongpass");
    expect(wrong.ok).toBe(false);
  });

  it("lists known usernames from legacy profiles and accounts", async () => {
    localStorage.setItem("users", JSON.stringify(["LegacyUser"]));
    await registerAccount("ModernUser", "secret123");

    expect(listKnownUsernames()).toEqual(["LegacyUser", "ModernUser"]);
  });
});
