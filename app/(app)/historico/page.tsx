import Link from "next/link";
import { Suspense } from "react";
import { FiAlertTriangle, FiArrowDownRight, FiArrowUpRight, FiAward, FiMinus, FiTrendingDown, FiTrendingUp } from "react-icons/fi";
import { cn } from "cn";
import { EvolutionChart } from "@/components/evolution-chart";
import { HistoryFilters } from "@/components/history-filters";
import { ShowMore } from "@/components/show-more";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getHistoryLogs, today } from "@/lib/db";
import {
  addDays,
  autoView,
  exerciseSeries,
  groupDays,
  groupPeriods,
  overlaps,
  VIEWS,
  weekStart,
  type Day,
  type Period,
  type Trend,
  type View,
} from "@/lib/history";

// Datas YYYY-MM-DD tratadas em UTC pra não escorregar de dia por fuso.
const utc = (d: string) => new Date(`${d}T00:00Z`);
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => utc(d).toLocaleDateString("pt-BR", { ...o, timeZone: "UTC" });
const kgFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function weekLabel(start: string) {
  const o = { day: "2-digit", month: "short" } as const;
  return `${fmt(start, o)} – ${fmt(addDays(start, 6), o)}`;
}
const monthLabel = (key: string) => fmt(`${key}-01`, { month: "long", year: "numeric" });

// mobile first: 1 coluna → 2 (sm) → 3 (lg)
const GRID = "grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const param = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default function HistoricoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Carregando…</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;

  // Padrão: últimas 4 semanas. Datas inválidas na URL caem no padrão.
  const de = param(sp.de);
  const ate = param(sp.ate);
  const to = ate && DATE.test(ate) ? ate : today();
  const from = de && DATE.test(de) && de <= to ? de : addDays(to, -27);
  const ver = param(sp.ver) as View | undefined;
  const view = ver && VIEWS.includes(ver) ? ver : autoView(from, to);

  // histórico inteiro entra no cálculo (comparações com a semana/mês anterior), só a exibição é filtrada
  const logs = await getHistoryLogs(user.id);
  const workouts = new Set(logs.filter((l) => l.date >= from && l.date <= to).map((l) => l.date)).size;

  const days = view === "dias" ? groupDays(logs).filter((d) => d.date >= from && d.date <= to) : [];
  const unit = view === "meses" ? "month" : "week";
  const periods = view === "dias" ? [] : groupPeriods(logs, unit).filter((p) => overlaps(p.key, unit, from, to));
  const chartLogs = logs.filter((l) => l.date >= weekStart(from) && l.date <= to);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl uppercase">Histórico</h2>
        <p className="text-sm text-muted-foreground">
          Escolha o período no calendário. Semanas e meses comparam com o período anterior em que você treinou.
        </p>
      </div>

      {logs.length === 0 ? (
        <Card className="items-center py-10 text-center">
          <CardHeader className="w-full">
            <CardTitle className="font-heading text-2xl uppercase">Nada por aqui ainda</CardTitle>
            <CardDescription>Conclua exercícios no treino de hoje pra começar seu histórico.</CardDescription>
          </CardHeader>
          <Link href="/" className={buttonVariants()}>
            Ir pro treino de hoje
          </Link>
        </Card>
      ) : (
        <>
          <HistoryFilters from={from} to={to} view={view} />
          <p className="text-sm text-muted-foreground">
            {workouts === 0
              ? "Nenhum treino nesse período."
              : `${workouts} ${workouts === 1 ? "treino" : "treinos"} no período, agrupados por ${view}.`}
          </p>

          {workouts > 0 && (
            <>
              <EvolutionChart series={exerciseSeries(chartLogs)} />
              {/* key: trocar período/visão volta pra primeira "página" */}
              <ShowMore key={`${from}-${to}-${view}`} className={GRID}>
                {days.map((d) => (
                  <DayCard key={d.date} day={d} />
                ))}
                {periods.map((p) => (
                  <PeriodCard
                    key={p.key}
                    period={p}
                    label={unit === "week" ? weekLabel(p.key) : monthLabel(p.key)}
                    unit={unit === "week" ? "semana" : "mês"}
                  />
                ))}
              </ShowMore>
            </>
          )}
        </>
      )}
    </div>
  );
}

function DeltaBadge({ delta, unit = "kg" }: { delta: number | null; unit?: string }) {
  if (delta === null) return <span className="text-xs text-muted-foreground">novo</span>;
  if (delta === 0)
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <FiMinus /> igual
      </span>
    );
  const up = delta > 0;
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-semibold tabular-nums", up ? "text-green-500" : "text-red-500")}>
      {up ? <FiArrowUpRight /> : <FiArrowDownRight />}
      {up ? "+" : ""}
      {kgFmt.format(delta)} {unit}
    </span>
  );
}

function DayCard({ day }: { day: Day }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="font-heading text-lg uppercase">
          {fmt(day.date, { weekday: "long", day: "2-digit", month: "long" })}
        </CardTitle>
        <CardDescription>{day.entries.length} exercícios</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <ul className="divide-y">
          {day.entries.map((e) => (
            <li key={e.exercise_id} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{e.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {e.sets}×{e.reps}
              </span>
              <span className="w-16 text-right font-semibold tabular-nums">{kgFmt.format(e.kg)} kg</span>
              <span className="flex w-20 justify-end">
                <DeltaBadge delta={e.delta} />
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const TREND: Record<Trend, { label: string; icon: typeof FiTrendingUp; className: string }> = {
  up: { label: "Evolução", icon: FiTrendingUp, className: "bg-green-500/15 text-green-500" },
  down: { label: "Retrocesso", icon: FiTrendingDown, className: "bg-red-500/15 text-red-500" },
  flat: { label: "Estável", icon: FiMinus, className: "bg-muted text-muted-foreground" },
};

function TrendBadge({ trend }: { trend: Trend | null }) {
  if (!trend) return <Badge variant="outline">Primeiro registro</Badge>;
  const { label, icon: Icon, className } = TREND[trend];
  return (
    <Badge className={cn("gap-1 font-heading tracking-wide uppercase", className)}>
      <Icon /> {label}
    </Badge>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "up" | "down" }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-heading text-xl tabular-nums",
          tone === "up" && "text-green-500",
          tone === "down" && "text-red-500",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function PeriodCard({ period: p, label, unit }: { period: Period; label: string; unit: string }) {
  const vd = p.volumeDelta;

  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <CardTitle className="font-heading text-lg uppercase">{label}</CardTitle>
        <CardDescription>
          {p.days} {p.days === 1 ? "treino" : "treinos"} · {p.exercises.length} exercícios
        </CardDescription>
        <CardAction>
          <TrendBadge trend={p.trend} />
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4 px-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="Volume/treino"
            value={vd === null ? "—" : `${vd > 0 ? "+" : ""}${kgFmt.format(vd)}%`}
            tone={vd === null || vd === 0 ? undefined : vd > 0 ? "up" : "down"}
          />
          <Stat label="Subiram carga" value={p.up} tone={p.up ? "up" : undefined} />
          <Stat label="Caíram carga" value={p.down} tone={p.down ? "down" : undefined} />
        </div>

        <ul className="space-y-1.5 text-sm">
          {p.trend === null && (
            <li className="text-muted-foreground">A comparação começa a partir do próximo período com treino.</li>
          )}
          {p.best && (
            <li className="flex items-start gap-2">
              <FiAward className="mt-0.5 shrink-0 text-primary" />
              <span>
                Maior evolução: <b>{p.best.name}</b> (+{kgFmt.format(p.best.delta!)} kg)
              </span>
            </li>
          )}
          {p.worst && (
            <li className="flex items-start gap-2">
              <FiAlertTriangle className="mt-0.5 shrink-0 text-red-500" />
              <span>
                Atenção: <b>{p.worst.name}</b> caiu {kgFmt.format(Math.abs(p.worst.delta!))} kg
              </span>
            </li>
          )}
          {vd !== null && vd !== 0 && (
            <li className="text-muted-foreground">
              Volume médio por treino ({kgFmt.format(Math.round(p.volume))} kg) {vd > 0 ? "subiu" : "caiu"}{" "}
              {kgFmt.format(Math.abs(vd))}% vs. {unit} anterior.
            </li>
          )}
        </ul>

        <ExerciseList exercises={p.exercises} />
      </CardContent>
    </Card>
  );
}

const TOP = 5;

/** Maiores mudanças primeiro; além das 5 primeiras, o resto fica num <details> nativo. */
function ExerciseList({ exercises }: { exercises: Period["exercises"] }) {
  const sorted = [...exercises].sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
  const row = (e: Period["exercises"][number]) => (
    <li key={e.id} className="flex items-center gap-3 py-2">
      <span className="min-w-0 flex-1 truncate">{e.name}</span>
      <span className="text-xs text-muted-foreground">máx</span>
      <span className="w-16 text-right font-semibold tabular-nums">{kgFmt.format(e.maxKg)} kg</span>
      <span className="flex w-20 justify-end">
        <DeltaBadge delta={e.delta} />
      </span>
    </li>
  );

  return (
    <div className="border-t text-sm">
      <ul className="divide-y">{sorted.slice(0, TOP).map(row)}</ul>
      {sorted.length > TOP && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-center gap-1 rounded-md py-2 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Ver todos ({sorted.length})</span>
            <span className="hidden group-open:inline">Mostrar menos</span>
          </summary>
          <ul className="divide-y border-t">{sorted.slice(TOP).map(row)}</ul>
        </details>
      )}
    </div>
  );
}
