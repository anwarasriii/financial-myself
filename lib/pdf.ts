import "server-only";
import { getDocumentProxy, extractText } from "unpdf";
import { PasswordException, PasswordResponses } from "unpdf/pdfjs";

// Extraction happens entirely in-memory on our own server — the PDF bytes and
// any password are never written to disk, logged, or sent to a third party.
export type PdfExtractResult =
  | { status: "ok"; text: string }
  | { status: "needs_password" }
  | { status: "incorrect_password" }
  | { status: "error"; message: string };

export async function extractPdfText(data: Uint8Array, password?: string): Promise<PdfExtractResult> {
  try {
    const pdf = await getDocumentProxy(data, password ? { password } : {});
    const { text } = await extractText(pdf, { mergePages: true });
    return { status: "ok", text };
  } catch (err) {
    if (err instanceof PasswordException) {
      return err.code === PasswordResponses.INCORRECT_PASSWORD
        ? { status: "incorrect_password" }
        : { status: "needs_password" };
    }
    return { status: "error", message: "Couldn't read this PDF. It may be corrupted or unsupported." };
  }
}
