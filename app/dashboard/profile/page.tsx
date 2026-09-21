import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getGoalProgress } from "@/lib/pets";
import { ProfileForm } from "./ProfileForm";
import { PetCard } from "./PetCard";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, progress] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    getGoalProgress(userId),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-base-content/70">{user.email}</p>
        </div>
        <Link href="/dashboard" className="btn btn-outline btn-sm">
          Back to dashboard
        </Link>
      </header>

      <section className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <h2 className="card-title text-base">Your details</h2>
          <ProfileForm
            initialName={user.name ?? ""}
            initialAge={user.age}
            initialAvatarUrl={user.avatarUrl}
          />
        </div>
      </section>

      <section className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <h2 className="card-title text-base">Your pet</h2>
          <PetCard
            petType={user.petType}
            petName={user.petName}
            ratio={progress.ratio}
            totalSaved={progress.totalSaved}
            totalTarget={progress.totalTarget}
            goalCount={progress.goalCount}
          />
        </div>
      </section>
    </main>
  );
}
