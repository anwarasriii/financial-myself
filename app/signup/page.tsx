"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      const firstError = Object.values(data.error ?? {})[0];
      setError(Array.isArray(firstError) ? firstError[0] : "Something went wrong.");
      setPending(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setPending(false);

    if (signInResult?.error) {
      setError("Account created, but sign in failed. Try logging in.");
      router.push("/login");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <h1 className="card-title text-2xl">Create your account</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="fieldset-label flex flex-col items-start gap-1">
              <span className="text-sm font-medium">Name</span>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input w-full"
              />
            </label>
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
                minLength={8}
                className="input w-full"
              />
            </label>
            {error && <p className="text-sm text-error">{error}</p>}
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Creating account..." : "Sign up"}
            </button>
          </form>
          <p className="text-sm text-base-content/60">
            Already have an account?{" "}
            <Link href="/login" className="link link-primary">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
