import { Suspense } from "react";
import { AuthForm } from "@/components/app/auth-form";

export const metadata = { title: "Criar conta" };

export default function SignupPage() {
  return <Suspense><AuthForm mode="signup" /></Suspense>;
}
