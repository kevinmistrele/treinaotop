"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { cn } from "cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Series } from "@/lib/history";

// Laranja da marca um passo abaixo do --primary: passa no validador do dataviz (L 0.48–0.67, ≥3:1 no card escuro).
const config = { kg: { label: "Kg máximo", color: "#e8650f" } } satisfies ChartConfig;

const kgFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
/** Eixo Y com números redondos (ex.: 60 / 70 / 80) e folga acima e abaixo da curva. */
function niceTicks(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = [2.5, 5, 10, 20, 25, 50, 100].find((s) => (max - min) / s <= 4) ?? 200;
  const lo = Math.max(0, Math.floor(min / step) * step - step);
  const hi = Math.ceil(max / step) * step + step;
  return Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
}

const fmtWeek = (w: string) =>
  new Date(`${w}T00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

export function EvolutionChart({ series }: { series: Series[] }) {
  // peso do corpo (sempre 0 kg) não tem curva de carga pra mostrar
  const options = series.filter((s) => s.points.some((p) => p.kg > 0));
  const [selectedId, setSelectedId] = useState(options[0]?.id);
  const s = options.find((o) => o.id === selectedId) ?? options[0];
  if (!s) return null;

  const first = s.points[0].kg;
  const current = s.points.at(-1)!.kg;
  const best = Math.max(...s.points.map((p) => p.kg));
  const diff = current - first;
  const lastIndex = s.points.length - 1;
  const ticks = niceTicks(s.points.map((p) => p.kg));

  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <CardTitle className="font-heading text-lg uppercase">Evolução de carga</CardTitle>
        <CardDescription>Kg máximo por semana · {s.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4">
        <Select
          items={options.map((o) => ({ value: o.id, label: o.name }))}
          value={s.id}
          onValueChange={(v) => setSelectedId(Number(v))}
        >
          <SelectTrigger className="h-10! w-full sm:w-72" aria-label="Exercício do gráfico">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Atual</dt>
            <dd className="font-heading text-xl">{kgFmt.format(current)} kg</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Recorde</dt>
            <dd className="font-heading text-xl">{kgFmt.format(best)} kg</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Desde o início</dt>
            <dd
              className={cn(
                "font-heading text-xl",
                diff > 0 && "text-green-500",
                diff < 0 && "text-red-500",
              )}
            >
              {diff > 0 ? "+" : ""}
              {kgFmt.format(diff)} kg
              {first > 0 && diff !== 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({diff > 0 ? "+" : ""}
                  {kgFmt.format((diff / first) * 100)}%)
                </span>
              )}
            </dd>
          </div>
        </dl>

        {s.points.length < 2 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Treine mais uma semana pra ver a curva de evolução.
          </p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-hidden>
            <AreaChart data={s.points} margin={{ top: 20, right: 60, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="week" tickFormatter={fmtWeek} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis
                width={36}
                tickLine={false}
                axisLine={false}
                domain={[ticks[0], ticks.at(-1)!]}
                ticks={ticks}
                tickFormatter={(v: number) => kgFmt.format(v)}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => `Semana de ${fmtWeek(payload[0]?.payload.week)}`}
                    formatter={(value) => (
                      <div className="flex items-center gap-2">
                        <span className="h-0.5 w-3 rounded-full bg-(--color-kg)" />
                        <span className="font-semibold text-foreground tabular-nums">{kgFmt.format(Number(value))} kg</span>
                        <span className="text-muted-foreground">Kg máximo</span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                dataKey="kg"
                type="monotone"
                stroke="var(--color-kg)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="var(--color-kg)"
                fillOpacity={0.1}
                activeDot={{ r: 5, fill: "var(--color-kg)", stroke: "var(--card)", strokeWidth: 2 }}
                // só o último ponto ganha marcador e rótulo; o resto fica no tooltip
                dot={({ cx, cy, index }) =>
                  index === lastIndex ? (
                    <circle key="end" cx={cx} cy={cy} r={4} fill="var(--color-kg)" stroke="var(--card)" strokeWidth={2} />
                  ) : (
                    <g key={index} />
                  )
                }
                label={({ x, y, index }) =>
                  index === lastIndex ? (
                    <text key="end-label" x={Number(x) + 8} y={Number(y) + 4} className="fill-foreground text-xs font-semibold">
                      {kgFmt.format(current)} kg
                    </text>
                  ) : (
                    <g key={index} />
                  )
                }
              />
            </AreaChart>
          </ChartContainer>
        )}

        {/* visão em tabela pra leitor de tela */}
        <table className="sr-only">
          <caption>Kg máximo por semana em {s.name}</caption>
          <thead>
            <tr>
              <th>Semana</th>
              <th>Kg</th>
            </tr>
          </thead>
          <tbody>
            {s.points.map((p) => (
              <tr key={p.week}>
                <td>{fmtWeek(p.week)}</td>
                <td>{kgFmt.format(p.kg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
