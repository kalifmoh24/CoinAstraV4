import crypto from "node:crypto";
import jwt from "jsonwebtoken";

// CoinAstra v1 has no end-user auth, but the JWT helpers are still wired up
// for future use. Prefer an explicit JWT_SECRET, then reuse SESSION_SECRET
// (already provided by the platform), then fall back to a random per-process
// secret so the server can boot in production without manual configuration.
// If/when auth is added, set JWT_SECRET to a stable value.
const explicit = process.env["JWT_SECRET"];
const sessionSecret = process.env["SESSION_SECRET"];
const fallback = explicit ?? sessionSecret ?? crypto.randomBytes(48).toString("hex");

if (!explicit && process.env["NODE_ENV"] === "production") {
  // eslint-disable-next-line no-console
  console.warn(
    "[jwt] JWT_SECRET not set in production — using " +
      (sessionSecret ? "SESSION_SECRET" : "an ephemeral random secret") +
      ". Tokens will not survive process restarts.",
  );
}

export const JWT_SECRET = fallback;
export const JWT_EXPIRES_IN = "7d";
export const JWT_REFRESH_EXPIRES_IN = "30d";

export interface JwtPayload {
  sub: number;
  email: string;
  role: "user" | "admin";
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
}
