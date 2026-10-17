import { Suspense } from "react";
import { TodayWorkout } from "@/components/today-workout";
import { requireUser } from "@/lib/auth";
import { getExercises, today, todayWeekday } from "@/lib/db";

const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const CHEERS = [
  "Treino pago! Amanhã tem mais.",
  "Monstro! Hoje você foi além.",
  "Mais um tijolo na construção do shape.",
  "Disciplina vence motivação. Parabéns!",
  "Treino concluído. Agora é proteína e descanso.",
  "Você não negociou com a preguiça hoje.",
  "Consistência é o segredo, e você tá mandando bem.",
  "O shape agradece. Bom descanso!",
  "Cada repetição contou. Orgulho!",
  "Dia vencido. O você de amanhã agradece.",
];

// Server Component dinâmico (roda a cada request), então sortear aqui é seguro.
const pickCheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];

export default function Home() {
  return (
    <Suspense fallback={<p className="p-6 text-muted-foreground">Carregando…</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser();
  const weekday = todayWeekday();
  return (
    <div className="space-y-4">
      <TodayWorkout
        dayName={DAY_NAMES[weekday]}
        dateLabel={new Date(`${today()}T00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "UTC" })}
        exercises={await getExercises(user.id, weekday)}
        cheer={pickCheer()}
      />
    </div>
  );
}
