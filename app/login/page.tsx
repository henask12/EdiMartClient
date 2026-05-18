import { Suspense } from "react";
import LoginForm from "./ui";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16 text-sm text-white/60">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
