import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { extractPdfText } from "@/lib/pdf";
import { parseStatementFromText } from "@/lib/pdf-statement";
import { matchBucket } from "@/lib/categorize";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB

// Nothing here is written to disk or logged: the uploaded bytes and any
// password live only in this request's memory and are discarded once the
// response is sent.
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const password = formData.get("password");
  const yearField = formData.get("year");
  const year =
    typeof yearField === "string" && /^\d{4}$/.test(yearField) ? Number(yearField) : undefined;

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: { file: ["No PDF file provided."] } }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: { file: ["File is too large (max 15MB)."] } }, { status: 400 });
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const extracted = await extractPdfText(buffer, typeof password === "string" && password ? password : undefined);

  if (extracted.status === "needs_password") {
    return NextResponse.json({ status: "needs_password" });
  }
  if (extracted.status === "incorrect_password") {
    return NextResponse.json({ status: "incorrect_password" });
  }
  if (extracted.status === "error") {
    return NextResponse.json({ error: { file: [extracted.message] } }, { status: 400 });
  }

  const result = parseStatementFromText(extracted.text, { year });
  if (result.error) {
    // Echo back what we extracted (to this same authenticated request only —
    // never logged, never stored) so the user can see why auto-detection
    // failed instead of hitting an opaque error.
    return NextResponse.json(
      { error: { file: [result.error] }, rawText: extracted.text },
      { status: 400 }
    );
  }

  const rules = await prisma.categoryRule.findMany({ where: { userId } });
  const rows = result.rows.map((row) => ({
    ...row,
    suggestedBucketId: matchBucket(row.description, rules),
  }));

  // Always include the extracted text, even on success — if the row count
  // looks short, you can expand it yourself to see what was actually read
  // from the PDF, without needing to send the file or its contents to me.
  return NextResponse.json({ status: "ok", rows, rawText: extracted.text });
}
