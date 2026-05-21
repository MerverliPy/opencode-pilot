import { describe, expect, it } from "@jest/globals";
import type { IncomingMessage } from "node:http";
import {
  getBearerTokenFromHeader,
  isAuthorizedHeaderValue,
  isAuthorizedNodeRequest,
  tokensEqualConstantTime,
} from "../auth.js";

describe("auth helpers", () => {
  it("extracts bearer token from authorization header", () => {
    expect(getBearerTokenFromHeader("Bearer token-123")).toBe("token-123");
  });

  it("rejects non-bearer authorization header", () => {
    expect(getBearerTokenFromHeader("Basic abc")).toBeNull();
  });

  it("allows requests when auth token not configured", () => {
    expect(isAuthorizedHeaderValue(null, null)).toBe(false);
  });

  it("rejects missing or wrong bearer token when configured", () => {
    expect(isAuthorizedHeaderValue(null, "pilot-token")).toBe(false);
    expect(isAuthorizedHeaderValue("Bearer wrong", "pilot-token")).toBe(false);
  });

  it("accepts matching bearer token when configured", () => {
    expect(isAuthorizedHeaderValue("Bearer pilot-token", "pilot-token")).toBe(true);
  });

  it("checks incoming node request authorization header", () => {
    const req = {
      headers: { authorization: "Bearer pilot-token" },
    } as IncomingMessage;

    expect(isAuthorizedNodeRequest(req, "pilot-token")).toBe(true);
    expect(isAuthorizedNodeRequest(req, "other-token")).toBe(false);
  });
});

describe("auth edge cases", () => {
  // Empty token after Bearer prefix
  it.each(["Bearer ", "Bearer  ", "Bearer\t"])(
    "rejects %j as empty bearer token",
    (header) => {
      expect(getBearerTokenFromHeader(header)).toBeNull();
      expect(isAuthorizedHeaderValue(header, "token")).toBe(false);
    },
  );

  // Whitespace-only token
  it("rejects whitespace-only token", () => {
    expect(getBearerTokenFromHeader("Bearer   ")).toBeNull();
    expect(isAuthorizedHeaderValue("Bearer   ", "token")).toBe(false);
  });

  // Unicode in token
  it("handles unicode in token value", () => {
    const token = "tökèn-üñîçödé-日本語";
    expect(getBearerTokenFromHeader(`Bearer ${token}`)).toBe(token);
    expect(isAuthorizedHeaderValue(`Bearer ${token}`, token)).toBe(true);
  });

  // SQLi attempt in token
  it("rejects SQL injection in token (does not match)", () => {
    const sqli = "' OR 1=1 --";
    expect(getBearerTokenFromHeader(`Bearer ${sqli}`)).toBe(sqli);
    expect(isAuthorizedHeaderValue(`Bearer ${sqli}`, "admin")).toBe(false);
    expect(isAuthorizedHeaderValue(`Bearer ${sqli}`, sqli)).toBe(true);
  });

  // Null header
  it("returns null for null/undefined header", () => {
    expect(getBearerTokenFromHeader(null)).toBeNull();
    expect(getBearerTokenFromHeader(undefined)).toBeNull();
  });

  // Length extremes
  it("accepts very long bearer token", () => {
    const long = "a".repeat(4096);
    expect(getBearerTokenFromHeader(`Bearer ${long}`)).toBe(long);
    expect(isAuthorizedHeaderValue(`Bearer ${long}`, long)).toBe(true);
  });

  it("handles 1-char token", () => {
    expect(getBearerTokenFromHeader("Bearer x")).toBe("x");
    expect(isAuthorizedHeaderValue("Bearer x", "x")).toBe(true);
  });

  // Non-Bearer schemes
  it.each(["Basic dXNlcjpwYXNz", "Digest realm=test", "Negotiate aaa"])(
    "rejects non-Bearer scheme %j",
    (header) => {
      expect(getBearerTokenFromHeader(header)).toBeNull();
    },
  );

  // isAuthorizedNodeRequest edge cases
  it("handles node request with array header", () => {
    const req = {
      headers: { authorization: ["Bearer token-123"] },
    } as unknown as IncomingMessage;
    expect(isAuthorizedNodeRequest(req, "token-123")).toBe(true);
    expect(isAuthorizedNodeRequest(req, "wrong")).toBe(false);
  });

  it("handles node request with missing header", () => {
    const req = { headers: {} } as IncomingMessage;
    expect(isAuthorizedNodeRequest(req, "token")).toBe(false);
    expect(isAuthorizedNodeRequest(req, null)).toBe(false);
  });

  it("rejects different-length tokens with constant-time helper", async () => {
    await expect(tokensEqualConstantTime("short", "much-longer-token")).resolves.toBe(false);
  });

  it("accepts equal tokens with constant-time helper", async () => {
    await expect(tokensEqualConstantTime("pilot-token", "pilot-token")).resolves.toBe(true);
  });
});
