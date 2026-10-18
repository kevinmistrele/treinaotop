import postgres from "postgres";

// Postgres (Supabase). Tabelas no schema `app`, que a role do app já tem como search_path.
// prepare: false é exigido pelo pooler do Supabase em modo transação.
// ponytail: em dev reaproveita a conexão entre hot reloads; em produção cada instância abre a sua.
const g = globalThis as unknown as { sql?: postgres.Sql };
export const sql = (g.sql ??= postgres(process.env.DATABASE_URL!, { prepare: false, max: 5 }));

export type User = {
  id: number;
  email: string;
  name: string;
  weight_kg: number | null;
  height_cm: number | null;
};

export type Exercise = {
  id: number;
  weekday: number;
  name: string;
  sets: number;
  reps: number;
  /** Opcional: não conta pro progresso nem pra fechar o treino do dia. */
  optional: boolean;
  last_kg: number | null;
  last_date: string | null;
  /** Registro de hoje: existir = exercício concluído (check). */
  today_kg: number | null;
  today_sets: number | null;
  today_reps: number | null;
};

// ponytail: fuso fixo do Brasil (o servidor da Vercel roda em UTC); fuso por usuário se tiver gente de fora
const TZ = "America/Sao_Paulo";

/** Data de hoje no Brasil, YYYY-MM-DD. */
export const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
/** Dia da semana de hoje no Brasil (0 = domingo). */
export const todayWeekday = () => new Date(`${today()}T00:00Z`).getUTCDay();

/** Exercícios do usuário na ordem definida por ele (opcionalmente só de um dia). */
export async function getExercises(userId: number, weekday?: number): Promise<Exercise[]> {
  const t = today();
  const rows = await sql<Exercise[]>`
    SELECT e.id, e.weekday, e.name, e.sets, e.reps, e.optional,
      (SELECT kg FROM logs WHERE exercise_id = e.id AND date < ${t} ORDER BY date DESC LIMIT 1) AS last_kg,
      (SELECT date FROM logs WHERE exercise_id = e.id AND date < ${t} ORDER BY date DESC LIMIT 1) AS last_date,
      l.kg AS today_kg, l.sets AS today_sets, l.reps AS today_reps
    FROM exercises e
    LEFT JOIN logs l ON l.exercise_id = e.id AND l.date = ${t}
    WHERE e.user_id = ${userId} ${weekday === undefined ? sql`` : sql`AND e.weekday = ${weekday}`}
    ORDER BY e.weekday, e.position, e.id`;
  return rows.map((r) => ({ ...r }));
}

export type LogRow = { date: string; exercise_id: number; name: string; kg: number; sets: number; reps: number };

// ponytail: carrega o histórico inteiro do usuário; paginar por período se ficar grande
export async function getHistoryLogs(userId: number): Promise<LogRow[]> {
  const rows = await sql<LogRow[]>`
    SELECT l.date, l.exercise_id, e.name, l.kg,
      COALESCE(l.sets, e.sets) AS sets, COALESCE(l.reps, e.reps) AS reps
    FROM logs l JOIN exercises e ON e.id = l.exercise_id
    WHERE e.user_id = ${userId}
    ORDER BY l.date, e.weekday, e.position`;
  return rows.map((r) => ({ ...r }));
}
