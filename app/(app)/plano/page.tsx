import { Suspense } from "react";
import { PlanBoard } from "@/components/plan-board";
import { requireUser } from "@/lib/auth";
import { getExercises, todayWeekday } from "@/lib/db";

export default function PlanoPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted-foreground">Carregando…</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h2 className="font-heading text-2xl uppercase">Plano semanal</h2>
        <p className="text-sm text-muted-foreground">A ordem aqui é a ordem em que os exercícios aparecem no treino do dia.</p>
      </div>
      <PlanBoard exercises={await getExercises(user.id)} todayWeekday={todayWeekday()} />
    </div>
  );
}
