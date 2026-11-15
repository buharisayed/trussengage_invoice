import { NextResponse } from "next/server";
import { listDocuments, upsertDocument } from "@/lib/storage";
import type { DocumentRecord } from "@/types/document";

export async function GET() {
  try {
    const documents = await listDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Failed to list documents:", error);
    return NextResponse.json({ error: "Failed to list documents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      document: DocumentRecord;
      incrementCounter?: boolean;
    };
    if (!body?.document?.id) {
      return NextResponse.json({ error: "Invalid document payload" }, { status: 400 });
    }
    const saved = await upsertDocument(body.document, Boolean(body.incrementCounter));
    return NextResponse.json({ document: saved }, { status: 201 });
  } catch (error) {
    console.error("Failed to save document:", error);
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }
}
