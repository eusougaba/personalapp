"use client";
import { useActionState } from "react";
import { acceptInvite, login, signup, type FormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/client";
import { Field, Input, Notice } from "@/components/ui";

function ErrorBox({ state }: { state: FormState }) {
  return state?.error ? <Notice tone="red">{state.error}</Notice> : null;
}

export function LoginForm({ next, demo }: { next?: string; demo?: { email: string; password: string } }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <ErrorBox state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="email" required defaultValue={demo?.email} />
      </Field>
      <Field label="Senha">
        <Input name="password" type="password" autoComplete="current-password" required defaultValue={demo?.password} />
      </Field>
      <SubmitButton className="w-full" pendingText="Entrando…">
        Entrar
      </SubmitButton>
    </form>
  );
}

export function SignupForm({ rootDomain, defaultEmail }: { rootDomain: string; defaultEmail?: string }) {
  const [state, action] = useActionState(signup, undefined);
  return (
    <form action={action} className="space-y-4">
      <ErrorBox state={state} />
      <Field label="Seu nome">
        <Input name="name" required autoComplete="name" placeholder="Felipe Astur" />
      </Field>
      <Field label="Nome do seu negócio" hint="Aparece no app dos seus alunos">
        <Input name="business" required placeholder="Felipe Astur Personal" />
      </Field>
      <Field label="Endereço do seu app" hint={`Seus alunos acessam em seuendereco.${rootDomain}`}>
        <Input name="slug" required pattern="[a-z0-9-]{3,32}" placeholder="felipeastur" />
      </Field>
      <Field label="E-mail">
        <Input name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} />
      </Field>
      <Field label="Senha" hint="Mínimo de 8 caracteres">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <SubmitButton variant="volt" className="w-full" pendingText="Criando sua conta…">
        Criar conta grátis
      </SubmitButton>
      <p className="text-center text-xs text-zinc-500">14 dias grátis, sem cartão de crédito.</p>
    </form>
  );
}

export function InviteForm({ token, email, accent }: { token: string; email?: string | null; accent: string }) {
  const [state, action] = useActionState(acceptInvite, undefined);
  return (
    <form action={action} className="space-y-4">
      <ErrorBox state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label="E-mail">
        <Input name="email" type="email" required defaultValue={email ?? ""} autoComplete="email" />
      </Field>
      <Field label="Crie uma senha" hint="Mínimo de 8 caracteres">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <label className="flex items-start gap-2 text-sm text-zinc-600">
        <input type="checkbox" name="consent" className="mt-1" required />
        <span>Autorizo o uso dos meus dados de treino e avaliação física pelo meu personal, conforme a LGPD.</span>
      </label>
      <div style={{ ["--accent" as string]: accent }}>
        <SubmitButton variant="accent" className="w-full" pendingText="Ativando…">
          Ativar meu acesso
        </SubmitButton>
      </div>
    </form>
  );
}
