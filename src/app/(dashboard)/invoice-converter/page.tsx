"use client";

import DocumentGenerator from "@/components/documents/DocumentGenerator";

export default function InvoiceConverterPage() {
  return (
    <DocumentGenerator
      defaultType="commercial-invoice"
      title="Facturación"
      subtitle="Conversión automática de facturas al formato IBC Steel Group"
      breadcrumbLabel="Facturación"
    />
  );
}
