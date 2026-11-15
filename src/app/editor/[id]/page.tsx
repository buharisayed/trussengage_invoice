import { notFound } from "next/navigation";
import { EditorWorkspace } from "@/components/EditorWorkspace";
import { createDocumentFromSettings } from "@/lib/defaults";
import { getDocumentById, getSettingsAndClients } from "@/lib/storage";
import type { DocumentType } from "@/types/document";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; print?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { settings, clients } = await getSettingsAndClients();

  if (id === "new") {
    const docType: DocumentType =
      query.type === "quotation" ? "quotation" : "invoice";
    const initialDoc = createDocumentFromSettings(docType, settings);
    return (
      <EditorWorkspace
        initialDoc={initialDoc}
        isNew={true}
        initialClients={clients}
        initialSettings={settings}
      />
    );
  }

  const existing = await getDocumentById(id);
  if (!existing) {
    notFound();
  }

  return (
    <EditorWorkspace
      initialDoc={existing}
      isNew={false}
      initialClients={clients}
      initialSettings={settings}
      autoPrint={query.print === "1"}
    />
  );
}
