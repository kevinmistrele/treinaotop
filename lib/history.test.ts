// Rodar: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { autoView, exerciseSeries, groupDays, groupPeriods, overlaps, weekStart } from "./history.ts";

const log = (date: string, exercise_id: number, kg: number) => ({
  date,
  exercise_id,
  name: exercise_id === 1 ? "Supino" : "Agachamento",
  kg,
  sets: 4,
  reps: 10,
});

// semana 1: seg 05/10 e qua 07/10; semana 2: seg 12/10
const logs = [log("2026-10-05", 1, 60), log("2026-10-05", 2, 100), log("2026-10-07", 1, 62.5), log("2026-10-12", 1, 65), log("2026-10-12", 2, 90)];

test("semana começa na segunda", () => {
  assert.equal(weekStart("2026-10-11"), "2026-10-05"); // domingo
  assert.equal(weekStart("2026-10-12"), "2026-10-12"); // segunda
});

test("dias: mais recente primeiro, com diferença vs. a vez anterior", () => {
  const days = groupDays(logs);
  assert.deepEqual(days.map((d) => d.date), ["2026-10-12", "2026-10-07", "2026-10-05"]);
  assert.deepEqual(days[0].entries.map((e) => e.delta), [2.5, -10]);
  assert.equal(days[2].entries[0].delta, null);
});

test("semanas: máximo por exercício, comparação e tendência", () => {
  const [w2, w1] = groupPeriods(logs, "week");
  assert.equal(w1.key, "2026-10-05");
  assert.equal(w1.days, 2);
  assert.equal(w1.trend, null); // primeiro período não tem com o que comparar
  assert.equal(w1.exercises.find((e) => e.id === 1)?.maxKg, 62.5);

  assert.equal(w2.exercises.find((e) => e.id === 1)?.delta, 2.5);
  assert.equal(w2.exercises.find((e) => e.id === 2)?.delta, -10);
  assert.equal(w2.up, 1);
  assert.equal(w2.down, 1);
  // empate em carga → decide pelo volume médio por treino: (65+90)*40 / 1 vs (60+100+62.5)*40 / 2
  assert.equal(w2.volume, 6200);
  assert.equal(w2.volumeDelta, 39.3);
  assert.equal(w2.trend, "up");
  assert.equal(w2.best?.name, "Supino");
  assert.equal(w2.worst?.name, "Agachamento");
});

test("meses agrupam pelo mês", () => {
  const months = groupPeriods([...logs, log("2026-11-02", 1, 70)], "month");
  assert.deepEqual(months.map((m) => m.key), ["2026-11", "2026-10"]);
  assert.equal(months[0].trend, "up");
});

test("série do gráfico: máximo por semana, cronológica, mais treinado primeiro", () => {
  const [supino, agacho] = exerciseSeries(logs);
  assert.equal(supino.name, "Supino");
  assert.deepEqual(supino.points, [
    { week: "2026-10-05", kg: 62.5 },
    { week: "2026-10-12", kg: 65 },
  ]);
  assert.equal(agacho.points.length, 2);
});

test("visão automática pelo tamanho do período", () => {
  assert.equal(autoView("2026-10-04", "2026-10-17"), "dias"); // 14 dias
  assert.equal(autoView("2026-10-03", "2026-10-17"), "semanas");
  assert.equal(autoView("2026-07-18", "2026-10-17"), "semanas"); // 92 dias
  assert.equal(autoView("2026-07-17", "2026-10-17"), "meses");
});

test("semana/mês entra se encostar no período", () => {
  assert.equal(overlaps("2026-10-05", "week", "2026-10-11", "2026-10-17"), true); // domingo 11 é dessa semana
  assert.equal(overlaps("2026-10-05", "week", "2026-10-12", "2026-10-17"), false);
  assert.equal(overlaps("2026-09", "month", "2026-09-30", "2026-10-17"), true);
  assert.equal(overlaps("2026-08", "month", "2026-09-01", "2026-10-17"), false);
});
