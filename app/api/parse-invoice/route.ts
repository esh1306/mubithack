import { parseInvoiceFile } from "@/lib/invoice-file";

// POST multipart { file } (.xlsx or .csv) → { lines, columns } for /api/[broker]/classify.
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  if (!/\.(xlsx|csv)$/i.test(file.name)) return Response.json({ error: "Upload an .xlsx or .csv file" }, { status: 400 });
  try {
    return Response.json(await parseInvoiceFile(file.name, await file.arrayBuffer()));
  } catch (e) {
    return Response.json({ error: `Couldn't read ${file.name}: ${(e as Error).message}` }, { status: 400 });
  }
}
