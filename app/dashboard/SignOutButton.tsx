"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="btn btn-outline btn-sm"
    >
      Sign out
    </button>
  );
}
