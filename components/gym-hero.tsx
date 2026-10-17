import { FaDumbbell } from "react-icons/fa";
import { GiBiceps, GiMuscleUp, GiRunningShoe, GiWeightLiftingUp } from "react-icons/gi";

const LIFTS = ["Supino", "Agachamento", "Terra", "Remada", "Desenvolvimento", "Rosca", "Leg press", "Barra fixa"];

/** Painel animado dos blocks de login/cadastro: banner no mobile, coluna lateral no desktop. */
export function GymHero({ title, subtitle }: { title: React.ReactNode; subtitle: string }) {
  return (
    <div className="animate-gradient relative order-first flex flex-col justify-between gap-4 overflow-hidden bg-[linear-gradient(135deg,#ff6a00,#ee0979,#ff8c00)] p-6 text-white md:order-none md:p-8">
      <FaDumbbell className="animate-float absolute top-8 right-8 size-16 opacity-20" />
      <GiBiceps className="animate-float absolute top-1/2 right-16 size-20 opacity-15 [animation-delay:-1.5s]" />
      <GiRunningShoe className="animate-float absolute bottom-20 left-10 size-14 opacity-20 [animation-delay:-3s]" />
      <GiMuscleUp className="animate-float absolute top-1/3 left-1/2 size-12 opacity-15 [animation-delay:-2s]" />

      <div className="relative">
        <GiWeightLiftingUp className="animate-lift size-14 drop-shadow-lg md:size-24" />
        <h2 className="mt-3 font-heading text-3xl md:mt-6 md:text-5xl leading-none font-bold uppercase">{title}</h2>
        <p className="mt-3 hidden max-w-xs text-white/85 md:block">{subtitle}</p>
      </div>

      <div className="relative -mx-6 overflow-hidden md:-mx-8 border-y border-white/30 py-2" aria-hidden>
        <div className="animate-marquee flex w-max gap-6 font-heading text-lg tracking-widest uppercase">
          {[...LIFTS, ...LIFTS].map((w, i) => (
            <span key={i}>{w} •</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Brand() {
  return (
    <span className="flex items-center gap-2 font-heading text-2xl font-bold tracking-wide uppercase">
      <GiWeightLiftingUp className="size-7 text-primary" />
      <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">TreinãoTop</span>
    </span>
  );
}
