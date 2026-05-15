import { describe, expect, it } from "@jest/globals";
import type { IncomingMessage } from "node:http";
import {
  getBearerTokenFromHeader,
  isAuthorizedHeaderValue,
  isAuthorizedNodeRequest,
} from "../auth.js";

describe("auth helpers", () => {
  it("extracts bearer token from authorization header", () => {
    expect(getBearerTokenFromHeader("Bearer token-123")).toBe("token-123");
  });

  it("rejects non-bearer authorization header", () => {
    expect(getBearerTokenFromHeader("Basic abc")).toBeNull();
  });

  it("allows requests when auth token not configured", () => {
    expect(isAuthorizedHeaderValue(null, null)).toBe(true);
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
