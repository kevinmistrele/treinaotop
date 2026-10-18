"use client";

import { startTransition, useState } from "react";
import { FiArrowDown, FiArrowUp, FiEdit2, FiMoreVertical, FiPlus, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";
import { addExercise, deleteExercise, moveExercise, updateExercise } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Exercise } from "@/lib/db";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEK = [1, 2, 3, 4, 5, 6, 0]; // começa na segunda

// Mobile: 2 colunas (nome | ações / série · última). sm+: 4 colunas tipo tabela.
const ROW = "grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto]";

export function PlanBoard({ exercises, todayWeekday }: { exercises: Exercise[]; todayWeekday: number }) {
  return (
    <Tabs defaultValue={todayWeekday}>
      <TabsList className="h-10! w-full">
        {WEEK.map((d) => (
          <TabsTrigger
            key={d}
            value={d}
            className="px-0 font-heading tracking-wide uppercase data-active:bg-primary! data-active:text-primary-foreground!"
          >
            {DAYS[d]}
            {d === todayWeekday && <span className="size-1.5 animate-pulse rounded-full bg-current" aria-label="hoje" />}
          </TabsTrigger>
        ))}
      </TabsList>
      {WEEK.map((d) => (
        <TabsContent key={d} value={d}>
          <DayCard weekday={d} exercises={exercises.filter((e) => e.weekday === d)} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function DayCard({ weekday, exercises }: { weekday: number; exercises: Exercise[] }) {
  return (
    <Card className="py-4">
      <CardContent className="space-y-3 px-4">
        <div className={`${ROW} hidden border-b pb-2 text-sm font-medium text-muted-foreground sm:grid`}>
          <span>Exercício</span>
          <span>Séries×Reps</span>
          <span>Última vez</span>
          <span className="w-30 text-right">Ordem</span>
        </div>
        <ol className="divide-y">
          {exercises.map((ex, i) => (
            <ExerciseRow key={ex.id} ex={ex} index={i} count={exercises.length} />
          ))}
          {exercises.length === 0 && (
            <li className="py-6 text-center text-muted-foreground">Nenhum exercício neste dia.</li>
          )}
        </ol>
        <AddExercise weekday={weekday} />
      </CardContent>
    </Card>
  );
}

const fmtDate = (d: string) => new Date(`${d}T00:00`).toLocaleDateString("pt-BR");

function ExerciseRow({ ex, index, count }: { ex: Exercise; index: number; count: number }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="py-3">
        <form
          action={async (f) => {
            const r = await updateExercise(ex.id, f);
            if (r?.error) toast.error(r.error);
            else setEditing(false);
          }}
          className="grid grid-cols-2 gap-2 sm:flex"
        >
          <Input name="name" defaultValue={ex.name} required className="col-span-2 sm:flex-1" aria-label="Nome" />
          <Input name="sets" type="number" min={1} defaultValue={ex.sets} required className="sm:w-20" aria-label="Séries" />
          <Input name="reps" type="number" min={1} defaultValue={ex.reps} required className="sm:w-20" aria-label="Repetições" />
          <OptionalCheckbox defaultChecked={ex.optional} />
          <Button type="submit">Salvar</Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </form>
      </li>
    );
  }

  const move = (dir: -1 | 1) => startTransition(() => moveExercise(ex.id, dir));
  const confirmDelete = () =>
    toast(`Remover "${ex.name}" e o histórico dele?`, {
      action: { label: "Remover", onClick: () => startTransition(() => deleteExercise(ex.id)) },
    });

  return (
    <li className={`${ROW} py-3`}>
      <span className="order-1 flex min-w-0 items-center gap-2 font-medium sm:order-none">
        <span className="font-heading text-primary tabular-nums">{index + 1}</span>
        <span className="truncate">{ex.name}</span>
        {ex.optional && <Badge variant="outline">opcional</Badge>}
      </span>

      {/* mobile: uma linha "4×10 · Última 60 kg"; sm+: duas colunas */}
      <div className="order-3 col-span-2 flex gap-2 text-sm text-muted-foreground sm:order-none sm:col-span-1 sm:contents sm:text-foreground">
        <span>
          {ex.sets}×{ex.reps}
        </span>
        <span className="sm:hidden">·</span>
        <span>
          <span className="sm:hidden">Última </span>
          {ex.last_kg !== null && ex.last_date ? (
            <Tooltip>
              <TooltipTrigger render={<span className="cursor-default font-medium text-foreground" />}>
                {ex.last_kg} kg
              </TooltipTrigger>
              <TooltipContent>{fmtDate(ex.last_date)}</TooltipContent>
            </Tooltip>
          ) : (
            "—"
          )}
        </span>
      </div>

      <div className="order-2 flex items-center justify-end gap-1 sm:order-none">
        <Button variant="ghost" size="icon" aria-label="Subir" disabled={index === 0} onClick={() => move(-1)}>
          <FiArrowUp />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Descer" disabled={index === count - 1} onClick={() => move(1)}>
          <FiArrowDown />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Ações" />}>
            <FiMoreVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <FiEdit2 /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={confirmDelete}>
              <FiTrash2 /> Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function AddExercise({ weekday }: { weekday: number }) {
  return (
    <form
      action={async (f) => {
        const r = await addExercise(f);
        if (r?.error) toast.error(r.error);
      }}
      className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:grid-cols-[1fr_auto_5rem_5rem_auto]"
    >
      <input type="hidden" name="weekday" value={weekday} />
      <Input name="name" placeholder="Novo exercício" required className="col-span-3 h-9 sm:col-span-1" aria-label="Nome do exercício" />
      <OptionalCheckbox className="col-span-3 sm:col-span-1" />
      <Input name="sets" type="number" min={1} placeholder="Séries" required className="h-9" aria-label="Séries" />
      <Input name="reps" type="number" min={1} placeholder="Reps" required className="h-9" aria-label="Repetições" />
      <Button type="submit" size="lg">
        <FiPlus /> Adicionar
      </Button>
    </form>
  );
}

function OptionalCheckbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <label className={`flex items-center gap-2 text-sm text-muted-foreground ${className ?? ""}`}>
      <input type="checkbox" name="optional" className="size-4 accent-primary" {...props} />
      Opcional
    </label>
  );
}
