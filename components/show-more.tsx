"use client";

import { Children, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { Button } from "@/components/ui/button";

/** Mostra `step` itens por vez com botão "Ver mais" (os cards já vêm renderizados do servidor). */
export function ShowMore({ children, step = 6, className }: { children: React.ReactNode; step?: number; className?: string }) {
  const items = Children.toArray(children);
  const [visible, setVisible] = useState(step);
  const rest = items.length - visible;

  return (
    <div className="space-y-4">
      <div className={className}>{items.slice(0, visible)}</div>
      {rest > 0 && (
        <div className="flex flex-col items-center gap-1">
          <Button variant="outline" size="lg" onClick={() => setVisible((v) => v + step)} className="w-full sm:w-auto">
            <FiChevronDown /> Ver mais {Math.min(step, rest)}
          </Button>
          <p className="text-xs text-muted-foreground">
            Mostrando {visible} de {items.length}
          </p>
        </div>
      )}
    </div>
  );
}
