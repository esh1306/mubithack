import { INVOICE_FILE, parseInvoiceFile } from "@/lib/invoice-file";

// POST multipart { file } → { lines, columns } for /api/[broker]/classify. .xlsx and .csv by their columns;
// PDFs, images and .txt are read by the model (used by Prue's chat).
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  if (!INVOICE_FILE.test(file.name)) return Response.json({ error: "Upload an .xlsx, .csv, .pdf, image or .txt file" }, { status: 400 });
  try {
    return Response.json(await parseInvoiceFile(file.name, await file.arrayBuffer()));
  } catch (e) {
    return Response.json({ error: `Couldn't read ${file.name}: ${(e as Error).message}` }, { status: 400 });
  }
}
