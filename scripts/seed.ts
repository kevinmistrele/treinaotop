// Dados mockados pra testar localmente: `npm run seed`
// Cria (ou recria) a conta demo abaixo com plano semanal completo e ~10 semanas de histórico.
//   Email: demo@treinao.test
//   Senha: demo1234
import { sql, today } from "../lib/db.ts";
import { addDays } from "../lib/history.ts";
import { hashPassword } from "../lib/password.ts";

const EMAIL = "demo@treinao.test";
const PASSWORD = "demo1234";
const WEEKS = 10;

// [dia da semana, nome, séries, reps, kg inicial]  (0 = domingo, descanso)
const PLAN: [number, string, number, number, number][] = [
  [1, "Supino reto", 4, 10, 50],
  [1, "Supino inclinado halteres", 3, 12, 18],
  [1, "Crucifixo", 3, 12, 12],
  [1, "Tríceps corda", 3, 15, 20],
  [2, "Agachamento", 4, 8, 70],
  [2, "Leg press", 4, 12, 140],
  [2, "Cadeira extensora", 3, 15, 35],
  [2, "Panturrilha em pé", 4, 15, 60],
  [3, "Puxada frontal", 4, 10, 45],
  [3, "Remada curvada", 4, 10, 40],
  [3, "Rosca direta", 3, 12, 14],
  [3, "Rosca martelo", 3, 12, 12],
  [4, "Desenvolvimento", 4, 10, 30],
  [4, "Elevação lateral", 3, 15, 8],
  [4, "Encolhimento", 3, 12, 50],
  [5, "Levantamento terra", 4, 6, 80],
  [5, "Stiff", 3, 10, 50],
  [5, "Mesa flexora", 3, 12, 30],
  [6, "Remada baixa", 4, 12, 45],
  [6, "Elevação pélvica", 4, 12, 60],
  [6, "Abdominal supra", 3, 20, 0],
];

const round25 = (n: number) => Math.round(n / 2.5) * 2.5;

await sql`DELETE FROM users WHERE email = ${EMAIL}`; // cascade limpa plano, logs e sessões
const [{ id: userId }] = await sql`
  INSERT INTO users (email, password_hash, name, weight_kg, height_cm)
  VALUES (${EMAIL}, ${hashPassword(PASSWORD)}, 'Demo', 82, 178) RETURNING id`;

const now = today();
const todayWd = new Date(`${now}T00:00Z`).getUTCDay();
const logs: { exercise_id: number; date: string; kg: number; sets: number; reps: number }[] = [];

for (const [position, [weekday, name, sets, reps, startKg]] of PLAN.entries()) {
  const [{ id }] = await sql`
    INSERT INTO exercises (user_id, weekday, name, sets, reps, position)
    VALUES (${userId}, ${weekday}, ${name}, ${sets}, ${reps}, ${position}) RETURNING id`;
  // última ocorrência desse dia antes de hoje, e as semanas anteriores
  const lastDate = addDays(now, -(((todayWd - weekday + 7) % 7) || 7));

  for (let i = 0; i < WEEKS; i++) {
    const date = addDays(lastDate, -7 * (WEEKS - 1 - i)); // i = 0 é a semana mais antiga
    if ((position * 7 + i * 3) % 11 === 0) continue; // falta de vez em quando
    let kg = startKg * (1 + 0.025 * i); // progressão de ~2,5% por semana
    if (i === 6) kg *= 0.9; // semana de deload: retrocesso proposital
    if (name === "Agachamento" && i >= WEEKS - 2) kg *= 0.85; // queda recente pra aparecer "Atenção"
    logs.push({ exercise_id: id, date, kg: round25(kg), sets, reps });
  }
}
await sql`INSERT INTO logs ${sql(logs)}`;
await sql.end();

console.log(`Conta demo pronta: ${EMAIL} (senha no topo de scripts/seed.ts)`);
console.log(`${PLAN.length} exercícios, ${logs.length} registros em ${WEEKS} semanas. Hoje (${now}) está sem check.`);
