import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const COOKIE_NAME = "nlm_session";

export function getOrCreateSessionId(): string {
  const jar = cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const id = randomUUID();
  jar.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return id;
}

export function getSessionId(): string | null {
  return cookies().get(COOKIE_NAME)?.value ?? null;
}
