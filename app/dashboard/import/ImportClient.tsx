"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Account, Bucket } from "@/app/generated/prisma/client";
import { formatMoney } from "@/lib/format";

interface PreviewRow {
  date: string;
  description: string;
  amount: number;
  direction: "IN" | "OUT";
  suggestedBucketId: string | null;
}

interface PreviewResponse {
  rows: PreviewRow[];
  rawText?: string;
}

interface EditableRow extends PreviewRow {
  bucketId: string | null;
  include: boolean;
}

export function ImportClient({
  accounts,
  buckets,
}: {
  accounts: Account[];
  buckets: Bucket[];
}) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [statementYear, setStatementYear] = useState(String(new Date().getFullYear()));
  const [rows, setRows] = useState<EditableRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Set only while we're waiting on a password for an encrypted PDF; the file
  // itself stays in memory in this component's state, never on a server disk.
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordWasWrong, setPasswordWasWrong] = useState(false);
  // Only ever set from this browser's own request/response — shown so you can
  // see why auto-detection failed; it's never sent anywhere else.
  const [rawTextPreview, setRawTextPreview] = useState<string | null>(null);

  function loadRows(data: PreviewResponse) {
    setRawTextPreview(typeof data.rawText === "string" ? data.rawText : null);
    if (data.rows.length === 0) {
      setError("No transaction rows found in that file.");
      return;
    }
    setRows(
      data.rows.map((r) => ({
        ...r,
        bucketId: r.suggestedBucketId,
        include: true,
      }))
    );
  }

  async function handleCsvFile(file: File) {
    const text = await file.text();
    const res = await fetch("/api/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.csv?.[0] ?? "Couldn't parse that file.");
      return;
    }
    loadRows(data);
  }

  async function handlePdfFile(file: File, password?: string) {
    const body = new FormData();
    body.append("file", file);
    if (password) body.append("password", password);
    if (/^\d{4}$/.test(statementYear)) body.append("year", statementYear);

    const res = await fetch("/api/import/pdf-preview", { method: "POST", body });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error?.file?.[0] ?? "Couldn't parse that PDF.");
      setRawTextPreview(typeof data.rawText === "string" ? data.rawText : null);
      setPdfFile(null);
      return;
    }
    if (data.status === "needs_password") {
      setPdfFile(file);
      setNeedsPassword(true);
      setPasswordWasWrong(false);
      return;
    }
    if (data.status === "incorrect_password") {
      setPdfFile(file);
      setNeedsPassword(true);
      setPasswordWasWrong(true);
      return;
    }

    setNeedsPassword(false);
    setPdfFile(null);
    setPdfPassword("");
    loadRows(data);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setRows(null);
    setNeedsPassword(false);
    setPdfFile(null);
    setPdfPassword("");
    setRawTextPreview(null);

    setPending(true);
    if (file.name.toLowerCase().endsWith(".pdf")) {
      await handlePdfFile(file);
    } else {
      await handleCsvFile(file);
    }
    setPending(false);
    e.target.value = "";
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pdfFile) return;
    setError(null);
    setPending(true);
    await handlePdfFile(pdfFile, pdfPassword);
    setPending(false);
  }

  async function handleAiParse() {
    if (!rawTextPreview) return;
    setError(null);
    setPending(true);
    const res = await fetch("/api/import/ai-parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rawTextPreview }),
    });
    const data = await res.json();
    setPending(false);

    if (!res.ok) {
      setError(data.error?.file?.[0] ?? "AI couldn't parse that statement either.");
      return;
    }
    setRows(
      (data.rows as PreviewRow[]).map((r) => ({
        ...r,
        bucketId: r.suggestedBucketId,
        include: true,
      }))
    );
  }

  function updateRow(index: number, patch: Partial<EditableRow>) {
    setRows((prev) => prev && prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function commit() {
    if (!rows) return;
    const included = rows.filter((r) => r.include);
    if (included.length === 0) return;

    setPending(true);
    setError(null);
    const res = await fetch("/api/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        rows: included.map((r) => ({
          date: r.date,
          description: r.description,
          amount: r.amount,
          direction: r.direction,
          bucketId: r.bucketId,
        })),
      }),
    });
    setPending(false);

    if (!res.ok) {
      setError("Couldn't import transactions.");
      return;
    }
    const data = await res.json();
    setResult(`Imported ${data.count} transaction(s).`);
    setRows(null);
    router.refresh();
  }

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Account</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="select select-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Statement (CSV or PDF)</span>
            <input
              type="file"
              accept=".csv,text/csv,.pdf,application/pdf"
              onChange={handleFile}
              disabled={pending}
              className="file-input file-input-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Statement year</span>
            <input
              type="number"
              value={statementYear}
              onChange={(e) => setStatementYear(e.target.value)}
              className="input input-sm w-24"
            />
          </label>
        </div>
        <p className="text-xs text-base-content/50">
          Processed only in memory for this request &mdash; the file (and any password) is never
          saved to disk or sent anywhere outside this app. Some PDF statements print dates without
          a year (e.g. &quot;03/07&quot;) &mdash; the year above fills that in.
        </p>

        {needsPassword && (
          <form onSubmit={submitPassword} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">This PDF is password-protected</span>
              <input
                type="password"
                value={pdfPassword}
                onChange={(e) => setPdfPassword(e.target.value)}
                required
                autoFocus
                placeholder="Statement password"
                className="input input-sm"
              />
            </label>
            <button type="submit" disabled={pending} className="btn btn-sm btn-primary">
              Unlock
            </button>
            {passwordWasWrong && <p className="text-sm text-error">Incorrect password, try again.</p>}
          </form>
        )}

        {error && <p className="text-sm text-error">{error}</p>}
        {result && <p className="text-sm text-success">{result}</p>}

        {rawTextPreview && (
          <details className="rounded border border-base-300 bg-base-200 p-3 text-xs">
            <summary className="cursor-pointer font-medium">
              {error
                ? "We couldn't auto-detect transaction lines — show what we extracted from the PDF"
                : `Found ${rows?.length ?? 0} transaction(s) — show everything we extracted from the PDF (in case some are missing)`}
            </summary>
            <p className="mt-2 text-base-content/60">
              This is only shown to you in your browser, from your own upload &mdash; it&apos;s
              not saved or sent anywhere. If the row count looks short, or the format looks off,
              this helps pin down what to adjust in the parser.
            </p>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-base-100 p-2">
              {rawTextPreview}
            </pre>
          </details>
        )}

        {rawTextPreview && (
          <div className="flex flex-wrap items-center gap-2 rounded border border-base-300 bg-base-200 p-3">
            <button
              type="button"
              onClick={handleAiParse}
              disabled={pending}
              className="btn btn-sm btn-outline"
            >
              {pending ? "Asking AI..." : "Parse with AI instead"}
            </button>
            <span className="text-xs text-base-content/60">
              Sends the extracted text above (shown in the panel) to Google&apos;s Gemini API for
              this one import only &mdash; nothing is sent unless you click this. Useful if the
              local parser missed transactions or got the bucket suggestions wrong.
            </span>
          </div>
        )}

        {rows && rows.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th></th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Direction</th>
                    <th>Bucket</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={row.include ? "" : "opacity-40"}>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(e) => updateRow(i, { include: e.target.checked })}
                          className="checkbox checkbox-sm"
                        />
                      </td>
                      <td className="whitespace-nowrap text-xs">
                        {new Date(row.date).toLocaleDateString("en-MY", { timeZone: "UTC" })}
                      </td>
                      <td className="max-w-[16rem] truncate text-xs" title={row.description}>
                        {row.description}
                      </td>
                      <td className="tabular-nums text-xs">{formatMoney(row.amount)}</td>
                      <td>
                        <select
                          value={row.direction}
                          onChange={(e) =>
                            updateRow(i, { direction: e.target.value as "IN" | "OUT" })
                          }
                          className="select select-xs"
                        >
                          <option value="OUT">Spend</option>
                          <option value="IN">Deposit</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={row.bucketId ?? ""}
                          onChange={(e) => updateRow(i, { bucketId: e.target.value || null })}
                          className="select select-xs"
                        >
                          <option value="">Uncategorized</option>
                          {buckets.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={commit}
              disabled={pending}
              className="btn btn-primary self-start"
            >
              {pending ? "Importing..." : `Import ${rows.filter((r) => r.include).length} transaction(s)`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
