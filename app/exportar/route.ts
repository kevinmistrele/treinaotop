import { getUser } from "@/lib/auth";
import { getHistoryLogs, today } from "@/lib/db";

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** CSV dos treinos do usuário no período ?de=&ate= (padrão: tudo). `;` + vírgula decimal pro Excel em pt-BR. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  const q = new URL(req.url).searchParams;
  const from = isDate(q.get("de")) ? q.get("de")! : "0000-01-01";
  const to = isDate(q.get("ate")) ? q.get("ate")! : today();

  const cell = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const rows = (await getHistoryLogs(user.id))
    .filter((l) => l.date >= from && l.date <= to)
    .map((l) => [l.date, cell(l.name), String(l.kg).replace(".", ","), l.sets, l.reps].join(";"));
  const csv = "﻿" + ["data;exercicio;kg;series;reps", ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="treinos_${from === "0000-01-01" ? "inicio" : from}_${to}.csv"`,
    },
  });
}
