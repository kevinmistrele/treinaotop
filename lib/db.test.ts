// Teste de integração contra o Postgres do DATABASE_URL (pula se não tiver). Rodar: npm test
// Cria um usuário descartável e apaga no final (cascade leva exercícios e logs).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const enabled = Boolean(process.env.DATABASE_URL);
const { sql, getExercises, today } = enabled ? await import("./db.ts") : ({} as typeof import("./db.ts"));
let uid = 0;

before(async () => {
  if (!enabled) return;
  [{ id: uid }] = await sql`INSERT INTO users (email, password_hash, name)
    VALUES (${`test-${Date.now()}@treinao.test`}, 'x', 'Teste') RETURNING id`;
  const [a, b] = await sql`INSERT INTO exercises (user_id, weekday, name, sets, reps, position)
    VALUES (${uid}, 1, 'Supino', 4, 10, 5), (${uid}, 1, 'B', 3, 12, 0) RETURNING id`;
  await sql`INSERT INTO logs (exercise_id, date, kg) VALUES
    (${a.id}, '2000-01-01', 50), (${a.id}, '2000-01-08', 60), (${a.id}, ${today()}, 62.5), (${b.id}, '2000-01-08', 20)`;
});

after(async () => {
  if (!enabled) return;
  await sql`DELETE FROM users WHERE id = ${uid}`;
  await sql.end();
});

test("kg da última vez, de hoje e ordem do plano", { skip: !enabled && "sem DATABASE_URL" }, async () => {
  const list = await getExercises(uid, 1);
  assert.deepEqual(list.map((e) => e.name), ["B", "Supino"]); // position manda na ordem
  const supino = list[1];
  assert.equal(supino.last_kg, 60);
  assert.equal(supino.last_date, "2000-01-08");
  assert.equal(supino.today_kg, 62.5);
  assert.equal(list[0].today_kg, null);
  assert.deepEqual(await getExercises(uid, 2), []);
});
