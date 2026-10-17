import { FiLogOut, FiUser } from "react-icons/fi";
import { logout, updateProfile } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { User } from "@/lib/db";

export function ProfileSheet({ user }: { user: User }) {
  const bmi = user.weight_kg && user.height_cm ? user.weight_kg / (user.height_cm / 100) ** 2 : null;

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        <FiUser />
        <span className="hidden sm:inline">{user.name}</span>
        <span className="hidden text-muted-foreground md:inline">
          {user.weight_kg}kg · {user.height_cm}cm
        </span>
        <span className="sr-only sm:hidden">Perfil</span>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{user.name}</SheetTitle>
          <SheetDescription>{user.email}</SheetDescription>
        </SheetHeader>
        <form action={updateProfile} className="grid gap-3 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                step="0.1"
                min={20}
                max={400}
                required
                defaultValue={user.weight_kg ?? ""}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="height">Altura (cm)</Label>
              <Input
                id="height"
                name="height"
                type="number"
                min={80}
                max={260}
                required
                defaultValue={user.height_cm ?? ""}
              />
            </div>
          </div>
          {bmi && (
            <p className="text-sm text-muted-foreground">
              IMC: <span className="font-medium text-foreground">{bmi.toFixed(1)}</span>
            </p>
          )}
          <Button type="submit">Salvar</Button>
        </form>
        <SheetFooter>
          <form action={logout}>
            <Button type="submit" variant="outline" className="w-full">
              <FiLogOut /> Sair
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
