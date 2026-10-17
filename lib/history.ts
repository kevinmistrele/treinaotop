import type { LogRow } from "./db";

export type Entry = LogRow & { delta: number | null };
export type Day = { date: string; entries: Entry[] };

export type Trend = "up" | "down" | "flat";
export type PeriodExercise = { id: number; name: string; maxKg: number; delta: number | null };
export type Period = {
  key: string;
  days: number;
  /** Volume médio por treino (kg × séries × reps ÷ dias treinados). */
  volume: number;
  /** % do volume médio vs. período anterior com treino; null no primeiro período.
   *  Médio por treino pra um mês/semana ainda incompleto não parecer retrocesso. */
  volumeDelta: number | null;
  exercises: PeriodExercise[];
  up: number;
  down: number;
  trend: Trend | null;
  best: PeriodExercise | null;
  worst: PeriodExercise | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Dias com treino (mais recente primeiro); cada exercício com a diferença de kg vs. a vez anterior. */
export function groupDays(logs: LogRow[]): Day[] {
  const lastKg = new Map<number, number>();
  const days = new Map<string, Entry[]>();
  for (const l of logs) {
    const prev = lastKg.get(l.exercise_id);
    lastKg.set(l.exercise_id, l.kg);
    const list = days.get(l.date) ?? [];
    list.push({ ...l, delta: prev === undefined ? null : round1(l.kg - prev) });
    days.set(l.date, list);
  }
  return [...days].map(([date, entries]) => ({ date, entries })).reverse();
}

/** Segunda-feira da semana (YYYY-MM-DD). */
export function weekStart(date: string) {
  const d = new Date(`${date}T00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Semanas ou meses (mais recente primeiro), cada um comparado com o período anterior que teve treino. */
export function groupPeriods(logs: LogRow[], unit: "week" | "month"): Period[] {
  const buckets = new Map<string, LogRow[]>();
  for (const l of logs) {
    const key = unit === "week" ? weekStart(l.date) : l.date.slice(0, 7);
    buckets.set(key, [...(buckets.get(key) ?? []), l]);
  }

  const periods: Period[] = [];
  let prev: Period | undefined;
  for (const [key, rows] of [...buckets].sort(([a], [b]) => a.localeCompare(b))) {
    const max = new Map<number, PeriodExercise>();
    for (const r of rows) {
      const cur = max.get(r.exercise_id);
      if (!cur || r.kg > cur.maxKg) max.set(r.exercise_id, { id: r.exercise_id, name: r.name, maxKg: r.kg, delta: null });
    }
    const exercises = [...max.values()].map((e) => {
      const before = prev?.exercises.find((p) => p.id === e.id);
      return { ...e, delta: before ? round1(e.maxKg - before.maxKg) : null };
    });

    const days = new Set(rows.map((r) => r.date)).size;
    const volume = rows.reduce((sum, r) => sum + r.kg * r.sets * r.reps, 0) / days;
    const volumeDelta = prev && prev.volume > 0 ? round1(((volume - prev.volume) / prev.volume) * 100) : null;
    const up = exercises.filter((e) => (e.delta ?? 0) > 0).length;
    const down = exercises.filter((e) => (e.delta ?? 0) < 0).length;
    const compared = exercises.filter((e) => e.delta !== null).sort((a, b) => b.delta! - a.delta!);

    // Carga manda: mais exercícios subindo que caindo = evolução. Empate decide pelo volume (±5%).
    let trend: Trend | null = null;
    if (prev) {
      if (up !== down) trend = up > down ? "up" : "down";
      else if (volumeDelta !== null && Math.abs(volumeDelta) >= 5) trend = volumeDelta > 0 ? "up" : "down";
      else trend = "flat";
    }

    const period: Period = {
      key,
      days,
      volume,
      volumeDelta,
      exercises,
      up,
      down,
      trend,
      best: (compared[0]?.delta ?? 0) > 0 ? compared[0] : null,
      worst: (compared.at(-1)?.delta ?? 0) < 0 ? compared.at(-1)! : null,
    };
    periods.push(period);
    prev = period;
  }
  return periods.reverse();
}

export type Series = { id: number; name: string; points: { week: string; kg: number }[] };

/** Kg máximo por semana de cada exercício, em ordem cronológica (pro gráfico de evolução). */
export function exerciseSeries(logs: LogRow[]): Series[] {
  const byExercise = new Map<number, Series>();
  for (const l of logs) {
    const s = byExercise.get(l.exercise_id) ?? { id: l.exercise_id, name: l.name, points: [] };
    byExercise.set(l.exercise_id, s);
    const week = weekStart(l.date);
    const last = s.points.at(-1);
    if (last?.week === week) last.kg = Math.max(last.kg, l.kg);
    else s.points.push({ week, kg: l.kg });
  }
  // mais treinado primeiro: é o que o usuário mais provavelmente quer ver
  return [...byExercise.values()].sort((a, b) => b.points.length - a.points.length);
}

// ---------- filtro por período ----------

export type View = "dias" | "semanas" | "meses";
export const VIEWS: View[] = ["dias", "semanas", "meses"];

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Período curto → dias; até ~3 meses → semanas; maior → meses. */
export function autoView(from: string, to: string): View {
  const days = (Date.parse(`${to}T00:00Z`) - Date.parse(`${from}T00:00Z`)) / 86_400_000 + 1;
  return days <= 14 ? "dias" : days <= 92 ? "semanas" : "meses";
}

/** A semana/mês encosta no intervalo [from, to]? (períodos das pontas entram inteiros) */
export function overlaps(key: string, unit: "week" | "month", from: string, to: string) {
  if (unit === "month") return key >= from.slice(0, 7) && key <= to.slice(0, 7);
  return key <= to && addDays(key, 6) >= from;
}
