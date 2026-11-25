import { Suspense } from "react";
import { AuthForm } from "@/components/app/auth-form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return <Suspense><AuthForm mode="signin" /></Suspense>;
}
