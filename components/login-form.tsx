"use client"

import Link from "next/link"
import { useActionState } from "react"
import { FiArrowRight } from "react-icons/fi"
import { cn } from "cn"

import { login } from "@/app/actions"
import { Brand, GymHero } from "@/components/gym-hero"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form action={action} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <Brand />
                <h1 className="font-heading text-3xl font-bold uppercase">Bora treinar</h1>
                <p className="text-balance text-muted-foreground">Entre pra registrar o treino de hoje</p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@email.com" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </Field>
              {state?.error && (
                <p role="alert" className="text-sm text-destructive">
                  {state.error}
                </p>
              )}
              <Field>
                <Button type="submit" size="lg" disabled={pending} className="font-heading tracking-wider uppercase">
                  {pending ? "Entrando…" : "Entrar"} <FiArrowRight />
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Ainda não tem conta? <Link href="/signup">Cadastre-se</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <GymHero
            title={
              <>
                Sem desculpas.
                <br />
                Só progresso.
              </>
            }
            subtitle="Cada kg conta. Veja o que pegou na semana passada e supere."
          />
        </CardContent>
      </Card>
    </div>
  )
}
