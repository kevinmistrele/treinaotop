"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DateRange } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { FiCalendar, FiLoader } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import type { View } from "@/lib/history";

const toDate = (iso: string) => new Date(`${iso}T00:00`);
const toIso = (d: Date) => d.toLocaleDateString("sv-SE");
const short = (iso: string) => toDate(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const PRESETS: [string, number][] = [
  ["7 dias", 7],
  ["4 semanas", 28],
  ["3 meses", 91],
  ["1 ano", 365],
];

const VIEW_LABELS: [View, string][] = [
  ["dias", "Dias"],
  ["semanas", "Semanas"],
  ["meses", "Meses"],
];

/** Período (calendário) + agrupamento. Estado vive na URL: ?de=&ate=&ver= */
export function HistoryFilters({ from, to, view }: { from: string; to: string; view: View }) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({ from: toDate(from), to: toDate(to) });

  const go = (params: Record<string, string>) =>
    startTransition(() => router.replace(`${pathname}?${new URLSearchParams(params)}`, { scroll: false }));

  // mudar o período tira o ?ver pra visão voltar a ser automática
  const apply = (f: Date, t: Date) => {
    setOpen(false);
    go({ de: toIso(f), ate: toIso(t) });
  };
  const preset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);
    setRange({ from: start, to: end });
    apply(start, end);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setRange({ from: toDate(from), to: toDate(to) });
        }}
      >
        <PopoverTrigger render={<Button variant="outline" className="h-10 justify-start sm:min-w-64" />}>
          {pending ? <FiLoader className="animate-spin" /> : <FiCalendar />}
          <span>
            {short(from)} – {short(to)}
            {from.slice(0, 4) !== to.slice(0, 4) || to.slice(0, 4) !== String(new Date().getFullYear())
              ? ` ${to.slice(0, 4)}`
              : ""}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-wrap gap-1 border-b p-2">
            {PRESETS.map(([label, days]) => (
              <Button key={label} size="sm" variant="secondary" onClick={() => preset(days)}>
                {label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            locale={ptBR}
            numberOfMonths={isMobile ? 1 : 2}
            defaultMonth={isMobile ? toDate(to) : new Date(toDate(to).getFullYear(), toDate(to).getMonth() - 1)}
            selected={range}
            onSelect={setRange}
            disabled={{ after: new Date() }}
          />
          <div className="flex items-center justify-end gap-2 border-t p-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={!range?.from} onClick={() => range?.from && apply(range.from, range.to ?? range.from)}>
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Tabs value={view} onValueChange={(v) => go({ de: from, ate: to, ver: String(v) })} className="sm:ml-auto">
        <TabsList className="h-10! w-full sm:w-72">
          {VIEW_LABELS.map(([v, label]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="font-heading tracking-wide uppercase data-active:bg-primary! data-active:text-primary-foreground!"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
