"use client"

import Link from "next/link"
import { useActionState } from "react"
import { FiArrowRight } from "react-icons/fi"
import { cn } from "cn"

import { signup } from "@/app/actions"
import { Brand, GymHero } from "@/components/gym-hero"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const [state, action, pending] = useActionState(signup, undefined)

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form action={action} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <Brand />
                <h1 className="font-heading text-3xl font-bold uppercase">Crie sua conta</h1>
                <p className="text-balance text-muted-foreground">Seu primeiro passo pro próximo PR</p>
              </div>
              <Field>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <Input id="name" name="name" autoComplete="name" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@email.com" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
                <FieldDescription>Mínimo de 8 caracteres.</FieldDescription>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="weight">Peso (kg)</FieldLabel>
                  <Input id="weight" name="weight" type="number" step="0.1" min={20} max={400} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="height">Altura (cm)</FieldLabel>
                  <Input id="height" name="height" type="number" min={80} max={260} required />
                </Field>
              </div>
              {state?.error && (
                <p role="alert" className="text-sm text-destructive">
                  {state.error}
                </p>
              )}
              <Field>
                <Button type="submit" size="lg" disabled={pending} className="font-heading tracking-wider uppercase">
                  {pending ? "Criando…" : "Criar conta"} <FiArrowRight />
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Já tem conta? <Link href="/login">Entrar</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <GymHero
            title={
              <>
                Bora
                <br />
                começar.
              </>
            }
            subtitle="Monte seu treino da semana e acompanhe sua evolução, kg por kg."
          />
        </CardContent>
      </Card>
    </div>
  )
}
