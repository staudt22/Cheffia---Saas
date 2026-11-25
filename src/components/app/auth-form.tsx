"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

const signInSchema = z.object({
  fullName: z.string().optional(),
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Tell us your name").optional(),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

type Mode = "signin" | "signup";

function safeNext(next: string | null, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const isDemo = params.get("demo") === "1";
  const next = safeNext(params.get("next"), mode === "signup" ? (isDemo ? "/onboarding?demo=1" : "/onboarding") : "/dashboard");

  const form = useForm<{ fullName?: string; email: string; password: string }>({
    resolver: zodResolver(mode === "signin" ? signInSchema : signUpSchema),
    defaultValues: { fullName: "", email: params.get("email") ?? "", password: "" },
  });
  const { register, handleSubmit, formState } = form;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const supabase = createClient();
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
      if (error) return setError(error.message === "Invalid login credentials" ? "That email and password don't match." : error.message);
      router.replace(next);
      router.refresh();
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) return setError(error.message);
    if (data.session) {
      router.replace(next);
      router.refresh();
    } else {
      setSentTo(values.email);
    }
  });

  if (sentTo) {
    return (
      <div className="animate-slide-up">
        <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand"><MailCheck className="size-5" /></div>
        <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-sm text-ink-2">We sent a confirmation link to <strong>{sentTo}</strong>. Open it to finish creating your account.</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <h1 className="text-2xl font-semibold tracking-tight">{mode === "signin" ? "Welcome back" : isDemo ? "Explore Forkly" : "Create your account"}</h1>
      <p className="mt-1.5 text-sm text-ink-3">
        {mode === "signin" ? "Sign in to your restaurant workspace." : isDemo ? "Create an account and we'll set up a demo restaurant with sample data." : "Step 1 of 10 — it takes about five minutes."}
      </p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        {mode === "signup" && (
          <Field label="Your name" htmlFor="fullName" error={formState.errors.fullName?.message}>
            <Input id="fullName" autoComplete="name" aria-invalid={!!formState.errors.fullName} {...register("fullName")} />
          </Field>
        )}
        <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!formState.errors.email} {...register("email")} />
        </Field>
        <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} aria-invalid={!!formState.errors.password} {...register("password")} />
        </Field>
        {error && <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
        <Button type="submit" variant="primary" size="lg" loading={formState.isSubmitting} className="mt-2">
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-3">
        {mode === "signin" ? (
          <>New to Forkly? <Link className="font-medium text-ink underline-offset-4 hover:underline" href={`/signup${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`}>Create an account</Link></>
        ) : (
          <>Already have an account? <Link className="font-medium text-ink underline-offset-4 hover:underline" href={`/login${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`}>Sign in</Link></>
        )}
      </p>
    </div>
  );
}
