"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { sql, today } from "@/lib/db";

export type FormState = { error?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Número entre min e max, ou null se vazio/inválido. */
function num(v: unknown, min: number, max: number, int = false) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) return null;
  return n;
}

// ---------- auth ----------

export async function signup(_: FormState, f: FormData): Promise<FormState> {
  const name = str(f, "name");
  const email = str(f, "email").toLowerCase();
  const password = String(f.get("password") ?? "");
  const weight = num(f.get("weight"), 20, 400);
  const height = num(f.get("height"), 80, 260);

  if (!name) return { error: "Informe seu nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email inválido." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (weight === null || height === null) return { error: "Informe peso (kg) e altura (cm) válidos." };

  let userId: number;
  try {
    const [r] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash, name, weight_kg, height_cm)
      VALUES (${email}, ${hashPassword(password)}, ${name}, ${weight}, ${height}) RETURNING id`;
    userId = r.id;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { error: "Email já cadastrado." };
    throw e;
  }
  await createSession(userId);
  redirect("/");
}

export async function login(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  const password = String(f.get("password") ?? "");
  const [user] = await sql<{ id: number; password_hash: string }[]>`
    SELECT id, password_hash FROM users WHERE email = ${email}`;
  if (!user || !verifyPassword(password, user.password_hash)) return { error: "Email ou senha incorretos." };
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function updateProfile(f: FormData) {
  const user = await requireUser();
  const weight = num(f.get("weight"), 20, 400);
  const height = num(f.get("height"), 80, 260);
  if (weight === null || height === null) return;
  await sql`UPDATE users SET weight_kg = ${weight}, height_cm = ${height} WHERE id = ${user.id}`;
  refresh();
}

// ---------- treino ----------

export async function addExercise(f: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(f, "name");
  const weekday = num(f.get("weekday"), 0, 6, true);
  const sets = num(f.get("sets"), 1, 100, true);
  const reps = num(f.get("reps"), 1, 1000, true);
  if (!name || weekday === null || sets === null || reps === null)
    return { error: "Preencha nome, séries e repetições." };
  await sql`
    INSERT INTO exercises (user_id, weekday, name, sets, reps, optional, position)
    VALUES (${user.id}, ${weekday}, ${name}, ${sets}, ${reps}, ${f.has("optional")},
      (SELECT COALESCE(MAX(position), 0) + 1 FROM exercises WHERE user_id = ${user.id} AND weekday = ${weekday}))`;
  refresh();
}

export async function updateExercise(id: number, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(f, "name");
  const sets = num(f.get("sets"), 1, 100, true);
  const reps = num(f.get("reps"), 1, 1000, true);
  if (!name || sets === null || reps === null) return { error: "Preencha nome, séries e repetições." };
  await sql`UPDATE exercises SET name = ${name}, sets = ${sets}, reps = ${reps}, optional = ${f.has("optional")} WHERE id = ${id} AND user_id = ${user.id}`;
  refresh();
}

export async function deleteExercise(id: number) {
  const user = await requireUser();
  await sql`DELETE FROM exercises WHERE id = ${id} AND user_id = ${user.id}`;
  refresh();
}

/** Troca o exercício de lugar com o vizinho do mesmo dia (dir -1 = sobe, 1 = desce). */
export async function moveExercise(id: number, dir: -1 | 1) {
  const user = await requireUser();
  const [ex] = await sql<{ weekday: number; position: number }[]>`
    SELECT weekday, position FROM exercises WHERE id = ${id} AND user_id = ${user.id}`;
  if (!ex) return;
  const [neighbor] = await sql<{ id: number; position: number }[]>`
    SELECT id, position FROM exercises
    WHERE user_id = ${user.id} AND weekday = ${ex.weekday}
      AND ${dir < 0 ? sql`position < ${ex.position}` : sql`position > ${ex.position}`}
    ORDER BY ${dir < 0 ? sql`position DESC` : sql`position ASC`} LIMIT 1`;
  if (!neighbor) return;
  await sql`
    UPDATE exercises SET position = CASE id WHEN ${id} THEN ${neighbor.position}::int ELSE ${ex.position}::int END
    WHERE id IN (${id}, ${neighbor.id}) AND user_id = ${user.id}`;
  refresh();
}

/** Check do exercício hoje: salva kg + série e guarda a série como padrão das próximas vezes. */
export async function checkExercise(id: number, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const sets = num(f.get("sets"), 1, 100, true);
  const reps = num(f.get("reps"), 1, 1000, true);
  const kg = num(f.get("kg"), 0, 2000);
  if (sets === null || reps === null || kg === null) return { error: "Preencha séries, reps e kg (0 se for peso do corpo)." };

  const r = await sql`UPDATE exercises SET sets = ${sets}, reps = ${reps} WHERE id = ${id} AND user_id = ${user.id}`;
  if (r.count === 0) return { error: "Exercício não encontrado." };
  await sql`
    INSERT INTO logs (exercise_id, date, kg, sets, reps) VALUES (${id}, ${today()}, ${kg}, ${sets}, ${reps})
    ON CONFLICT (exercise_id, date) DO UPDATE SET kg = excluded.kg, sets = excluded.sets, reps = excluded.reps`;
  refresh();
}

export async function uncheckExercise(id: number) {
  const user = await requireUser();
  await sql`
    DELETE FROM logs WHERE date = ${today()}
      AND exercise_id IN (SELECT id FROM exercises WHERE id = ${id} AND user_id = ${user.id})`;
  refresh();
}
