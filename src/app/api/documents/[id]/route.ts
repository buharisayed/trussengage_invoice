import { NextResponse } from "next/server";
import { deleteDocumentById, getDocumentById, upsertDocument } from "@/lib/storage";
import type { DocumentRecord } from "@/types/document";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({ document });
  } catch (error) {
    console.error("Failed to get document:", error);
    return NextResponse.json({ error: "Failed to get document" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { document: DocumentRecord };
    if (!body?.document) {
      return NextResponse.json({ error: "Invalid document payload" }, { status: 400 });
    }
    const saved = await upsertDocument({ ...body.document, id }, false);
    return NextResponse.json({ document: saved });
  } catch (error) {
    console.error("Failed to update document:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const deleted = await deleteDocumentById(id);
    if (!deleted) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
