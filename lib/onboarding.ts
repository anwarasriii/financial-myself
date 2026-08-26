import { prisma } from "@/lib/prisma";

const DAILY_USE_KEYWORDS = [
  "grocery", "groceries", "mart", "jaya grocer", "mydin", "tesco", "lotus", "giant",
  "kk mart", "7-eleven", "speedmart", "restaurant", "cafe", "mcdonald", "kfc",
  "food", "grabfood", "foodpanda",
];

const ENTERTAINMENT_KEYWORDS = [
  "netflix", "spotify", "disney", "cinema", "gsc", "tgv", "steam", "playstation",
  "xbox", "concert", "karaoke",
];

const BILLS_KEYWORDS = [
  "tnb", "unifi", "astro", "maxis", "celcom", "digi", "indah water", "syabas",
  "rent", "insurance premium",
];

export async function seedDefaultAccounts(userId: string) {
  const maybank = await prisma.account.create({
    data: { userId, name: "Maybank", institution: "Maybank", type: "CHECKING" },
  });
  const highYield = await prisma.account.create({
    data: {
      userId,
      name: "High-Yield Savings",
      institution: "High-Yield Savings",
      type: "SAVINGS",
    },
  });
  const versa = await prisma.account.create({
    data: { userId, name: "Versa / Moomo", institution: "Versa/Moomo", type: "INVESTMENT" },
  });

  const [needToPay, , emergencyFund, dailyUse, , entertainment] = await Promise.all([
    prisma.bucket.create({
      data: { userId, accountId: maybank.id, name: "Need to Pay", kind: "BILLS", priority: 1 },
    }),
    prisma.bucket.create({
      data: { userId, accountId: versa.id, name: "Sinking Fund", kind: "SINKING_FUND", priority: 2 },
    }),
    prisma.bucket.create({
      data: { userId, accountId: highYield.id, name: "Emergency Fund", kind: "EMERGENCY_FUND", priority: 3 },
    }),
    prisma.bucket.create({
      data: { userId, accountId: maybank.id, name: "Daily Use", kind: "DAILY_USE", priority: 4 },
    }),
    // A single "big topic" goals bucket — wedding fund, wishlist items, etc. all live
    // here as individual goals, rather than each getting their own top-level bucket.
    prisma.bucket.create({
      data: { userId, accountId: versa.id, name: "Goals", kind: "GOAL", priority: 5 },
    }),
    prisma.bucket.create({
      data: { userId, accountId: maybank.id, name: "Entertainment", kind: "ENTERTAINMENT", priority: 6 },
    }),
  ]);

  await prisma.categoryRule.createMany({
    data: [
      ...DAILY_USE_KEYWORDS.map((keyword) => ({ userId, bucketId: dailyUse.id, keyword })),
      ...ENTERTAINMENT_KEYWORDS.map((keyword) => ({ userId, bucketId: entertainment.id, keyword })),
      ...BILLS_KEYWORDS.map((keyword) => ({ userId, bucketId: needToPay.id, keyword })),
    ],
  });
}
