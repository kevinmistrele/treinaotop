import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { sql, type User } from "./db";
export { hashPassword, verifyPassword } from "./password";

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  await sql`INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, now() + make_interval(secs => ${MAX_AGE}))`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await sql`DELETE FROM sessions WHERE token = ${token}`;
  store.delete(COOKIE);
}

export async function getUser(): Promise<User | undefined> {
  await connection(); // dados por request: libera Date/Math.random no render
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return;
  const [row] = await sql<User[]>`
    SELECT u.id, u.email, u.name, u.weight_kg, u.height_cm FROM sessions s
    JOIN users u ON u.id = s.user_id WHERE s.token = ${token} AND s.expires_at > now()`;
  return row ? { ...row } : undefined;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
