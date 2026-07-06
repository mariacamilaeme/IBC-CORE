"use client";

import DocumentGenerator from "@/components/documents/DocumentGenerator";

export default function PackingListConverterPage() {
  return (
    <DocumentGenerator
      defaultType="packing-list"
      title="Packing List"
      subtitle="Conversión automática al formato IBC Steel Group"
      breadcrumbLabel="Packing List"
    />
  );
}
