"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { FiCheck, FiCheckCircle, FiChevronDown, FiCircle, FiCopy, FiList, FiMoon, FiTrendingDown, FiTrendingUp, FiMinus } from "react-icons/fi";
import { GiTrophyCup } from "react-icons/gi";
import { toast } from "sonner";
import { cn } from "cn";
import { checkExercise, uncheckExercise } from "@/app/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { Exercise } from "@/lib/db";

const isDone = (e: Exercise) => e.today_kg !== null;
/** O que precisa ser feito pra fechar o dia. Dia só com opcionais: todos contam. */
const required = (list: Exercise[]) => (list.some((e) => !e.optional) ? list.filter((e) => !e.optional) : list);
const fmtDate = (d: string) => new Date(`${d}T00:00`).toLocaleDateString("pt-BR");

type Props = { dayName: string; dateLabel: string; exercises: Exercise[]; cheer: string };

export function TodayWorkout({ dayName, dateLabel, exercises, cheer }: Props) {
  // null = segue o fluxo (primeiro exercício sem check, na ordem do plano)
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // opcionais ficam fora do fluxo: só abrem tocando na lista
  const current = exercises.find((e) => e.id === selectedId) ?? required(exercises).find((e) => !isDone(e));

  if (exercises.length === 0) return <RestDay dayName={dayName} />;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <DayCard
        dayName={dayName}
        dateLabel={dateLabel}
        exercises={exercises}
        currentId={current?.id}
        onSelect={setSelectedId}
      />
      {current ? (
        <CurrentCard
          key={`${current.id}-${current.today_kg}`}
          ex={current}
          position={exercises.indexOf(current) + 1}
          prev={exercises.slice(0, exercises.indexOf(current)).findLast(isDone)}
          total={exercises.length}
          onSaved={() => setSelectedId(null)}
        />
      ) : (
        <FinishedCard exercises={exercises} cheer={cheer} />
      )}
    </div>
  );
}

/** Compacto: dia + progresso. A lista de exercícios fica recolhida pra o foco ser o exercício atual. */
function DayCard({
  dayName,
  dateLabel,
  exercises,
  currentId,
  onSelect,
}: {
  dayName: string;
  dateLabel: string;
  exercises: Exercise[];
  currentId?: number;
  onSelect: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const goal = required(exercises);
  const done = goal.filter(isDone).length;

  return (
    <Card className="py-3">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardContent className="space-y-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-heading text-xs tracking-widest text-primary uppercase">Hoje · {dateLabel}</p>
              <p className="font-heading text-2xl leading-tight uppercase">{dayName}</p>
            </div>
            <CollapsibleTrigger render={<Button variant="ghost" className="group shrink-0 tabular-nums" />}>
              {done}/{goal.length} exercícios
              <FiChevronDown className="transition-transform group-data-[panel-open]:rotate-180" />
            </CollapsibleTrigger>
          </div>
          <Progress value={(done / goal.length) * 100} aria-label="Progresso do treino" />

          <CollapsibleContent className="space-y-3">
            <ol className="space-y-1">
              {exercises.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(e.id);
                      setOpen(false);
                    }}
                    aria-current={e.id === currentId ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                      e.id === currentId && "bg-primary/10 text-primary hover:bg-primary/15",
                    )}
                  >
                    {isDone(e) ? (
                      <FiCheckCircle className="size-5 shrink-0 text-green-500" aria-label="Concluído" />
                    ) : (
                      <FiCircle className="size-5 shrink-0 text-muted-foreground" aria-label="Pendente" />
                    )}
                    <span className={cn("flex-1 truncate font-medium", isDone(e) && "text-muted-foreground line-through")}>
                      {e.name}
                    </span>
                    {e.optional && <span className="text-xs text-muted-foreground">opcional</span>}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {isDone(e) ? `${e.today_kg} kg` : `${e.sets}×${e.reps}`}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <Link href="/plano" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
              <FiList /> Gerenciar exercícios
            </Link>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

function CurrentCard({
  ex,
  position,
  total,
  prev,
  onSaved,
}: {
  ex: Exercise;
  position: number;
  total: number;
  /** Último exercício concluído antes deste hoje: atalho pra copiar a série. */
  prev?: Exercise;
  onSaved: () => void;
}) {
  const [kg, setKg] = useState(ex.today_kg?.toString() ?? "");
  const [sets, setSets] = useState(String(ex.today_sets ?? ex.sets));
  const [reps, setReps] = useState(String(ex.today_reps ?? ex.reps));
  const kgNum = kg.trim() === "" ? null : Number(kg.replace(",", "."));

  return (
    <Card className="animate-in border-primary/40 ring-1 ring-primary/30 duration-300 fade-in slide-in-from-bottom-4">
      <CardHeader>
        <CardDescription className="font-heading tracking-widest uppercase">
          Exercício {position} de {total}
        </CardDescription>
        <CardTitle className="font-heading text-4xl leading-tight uppercase">{ex.name}</CardTitle>
        <CardDescription>
          {ex.last_kg !== null && ex.last_date ? (
            <>
              Última vez: <span className="font-semibold text-foreground">{ex.last_kg} kg</span> em {fmtDate(ex.last_date)}
            </>
          ) : (
            "Primeira vez nesse exercício. Bora!"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={async (f) => {
            const r = await checkExercise(ex.id, f);
            if (r?.error) return void toast.error(r.error);
            toast.success(`${ex.name} concluído!`);
            onSaved();
          }}
          className="grid gap-5"
        >
          <div className="grid grid-cols-3 gap-3">
            <BigField label="Séries" name="sets" type="number" min={1} value={sets} onChange={(e) => setSets(e.target.value)} />
            <BigField label="Reps" name="reps" type="number" min={1} value={reps} onChange={(e) => setReps(e.target.value)} />
            <BigField
              label="Kg"
              name="kg"
              inputMode="decimal"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              placeholder={ex.last_kg?.toString() ?? "0"}
              autoFocus
            />
          </div>
          {prev?.today_sets && prev.today_reps && !isDone(ex) && (
            <Button
              type="button"
              variant="outline"
              className="-mt-2"
              onClick={() => {
                setSets(String(prev.today_sets));
                setReps(String(prev.today_reps));
              }}
            >
              <FiCopy /> Usar {prev.today_sets}×{prev.today_reps} do {prev.name}
            </Button>
          )}
          <Trend kg={kgNum} last={ex.last_kg} />
          <SubmitButton label={isDone(ex) ? "Atualizar" : "Concluir exercício"} />
          {isDone(ex) && (
            <Button type="button" variant="ghost" onClick={() => uncheckExercise(ex.id).then(onSaved)}>
              Desmarcar
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function BigField({ label, ...props }: { label: string } & React.ComponentProps<"input">) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={props.name}>{label}</Label>
      <Input id={props.name} required className="h-14 text-center text-2xl! font-semibold tabular-nums" {...props} />
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-14 font-heading text-lg tracking-wider uppercase">
      <FiCheck className="size-5!" /> {pending ? "Salvando…" : label}
    </Button>
  );
}

function Trend({ kg, last }: { kg: number | null; last: number | null }) {
  if (kg === null || last === null || Number.isNaN(kg)) return null;
  const diff = Math.round((kg - last) * 10) / 10;
  if (diff > 0)
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-green-500">
        <FiTrendingUp /> +{diff} kg em relação à última vez
      </p>
    );
  if (diff < 0)
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-red-500">
        <FiTrendingDown /> {diff} kg em relação à última vez
      </p>
    );
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <FiMinus /> Mesma carga da última vez
    </p>
  );
}

function FinishedCard({ exercises, cheer }: { exercises: Exercise[]; cheer: string }) {
  const upgrades = exercises.filter((e) => e.last_kg !== null && (e.today_kg ?? 0) > e.last_kg).length;

  return (
    <Card className="animate-in overflow-hidden pt-0 text-center duration-500 zoom-in-95 fade-in">
      <div className="animate-gradient flex justify-center bg-[linear-gradient(135deg,#ff6a00,#ee0979,#ff8c00)] py-8 text-white">
        <GiTrophyCup className="animate-lift size-24 drop-shadow-lg" />
      </div>
      <CardHeader>
        <CardTitle className="font-heading text-4xl uppercase">Treino concluído!</CardTitle>
        <CardDescription className="text-lg text-foreground">{cheer}</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        {exercises.filter(isDone).length} exercícios feitos
        {upgrades > 0 && ` · subiu carga em ${upgrades}`}
      </CardContent>
    </Card>
  );
}

function RestDay({ dayName }: { dayName: string }) {
  return (
    <Card className="items-center py-10 text-center">
      <FiMoon className="size-12 text-primary" />
      <CardHeader className="w-full">
        <CardTitle className="font-heading text-3xl uppercase">{dayName}: descanso</CardTitle>
        <CardDescription>Nenhum exercício no plano de hoje.</CardDescription>
      </CardHeader>
      <Link href="/plano" className={buttonVariants()}>
        <FiList /> Montar treino
      </Link>
    </Card>
  );
}
