"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX_AVATAR_BYTES = 1_500_000;

export function ProfileForm({
  initialName,
  initialAge,
  initialAvatarUrl,
}: {
  initialName: string;
  initialAge: number | null;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [age, setAge] = useState(initialAge != null ? String(initialAge) : "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Please choose an image under 1.5MB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        age: age ? Number(age) : null,
        avatarUrl,
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError("Couldn't save profile.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="avatar">
          <div className="w-16 rounded-full bg-base-200">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Profile picture" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center text-lg font-medium text-base-content/50">
                {name.trim().charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Profile picture</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="file-input file-input-sm w-full max-w-xs"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="input w-full max-w-xs"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Age</span>
        <input
          type="number"
          min="0"
          max="150"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Optional"
          className="input w-full max-w-xs"
        />
      </label>

      {error && <p className="text-sm text-error">{error}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary btn-sm w-fit">
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
