"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setPending(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <h1 className="card-title text-2xl">Log in</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="fieldset-label flex flex-col items-start gap-1">
              <span className="text-sm font-medium">Email</span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input w-full"
              />
            </label>
            <label className="fieldset-label flex flex-col items-start gap-1">
              <span className="text-sm font-medium">Password</span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input w-full"
              />
            </label>
            {error && <p className="text-sm text-error">{error}</p>}
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Logging in..." : "Log in"}
            </button>
          </form>
          <p className="text-sm text-base-content/60">
            No account yet?{" "}
            <Link href="/signup" className="link link-primary">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
