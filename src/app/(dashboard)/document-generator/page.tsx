"use client";

import DocumentGenerator from "@/components/documents/DocumentGenerator";

export default function DocumentGeneratorPage() {
  return (
    <DocumentGenerator
      defaultType="commercial-invoice"
      title="Generador de Documentos"
      subtitle="Facturas Comerciales y Listas de Empaque con identidad visual IBC"
      breadcrumbLabel="Generador de Documentos"
    />
  );
}
