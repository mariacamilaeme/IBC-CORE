// =====================================================
// Document Print Renderer — HTML for window.print() PDF
// =====================================================

import { IBC_COMPANY, IBC_BANK, DOCUMENT_DISCLAIMER, FOOTER_CODE, DOCUMENT_TYPES } from "./document-constants";
import type { DocumentTemplate } from "./document-template";

/**
 * Generates a full HTML page string for the document.
 * Open in a new window and call window.print() to produce PDF.
 */
export function renderDocumentHTML(template: DocumentTemplate): string {
  const docType = DOCUMENT_TYPES[template.type];
  const headers = template.dataTable.headers.filter(h => h !== "");
  const numCols = headers.length;

  // Build data rows HTML
  const dataRowsHTML = template.dataTable.rows
    .map((row, i) => {
      const cells = headers
        .map((_, ci) => {
          const val = row[ci] ?? "";
          const isNum = typeof val === "number" || (!isNaN(Number(val)) && val !== "");
          const cls = `dc${i % 2 ? " z" : ""}${isNum ? " n" : ""}`;
          const displayVal = isNum ? Number(val).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val;
          return `<td class="${cls}">${displayVal}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  // Build totals row
  const totalsHTML = headers
    .map((_, ci) => {
      if (ci === 0) return `<td class="dc" style="font-weight:800;font-size:9px;letter-spacing:.08em">TOTAL</td>`;
      const hasNumbers = template.dataTable.rows.some((r) => {
        const v = r[ci];
        return v != null && !isNaN(Number(v)) && typeof v === "number";
      });
      if (hasNumbers) {
        const sum = template.dataTable.rows.reduce((s, r) => s + (Number(r[ci]) || 0), 0);
        return `<td class="dc n">${sum.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>`;
      }
      return `<td class="dc"></td>`;
    })
    .join("");

  // Build header cells for table
  const headerCellsHTML = headers.map((h) => `<td class="th">${h}</td>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${docType.title} — IBC Steel Group</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
@page{size:A4 portrait;margin:12mm 14mm 10mm 14mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:10px;color:#111827;background:#fff;line-height:1.35;-webkit-font-smoothing:antialiased}
table{border-collapse:collapse;width:100%}
.dc{text-align:center;vertical-align:middle;padding:5.5px 5px;font-size:10px;font-weight:400;color:#1f2937;border-bottom:1px solid #f0f0f4}
.dc.n{font-variant-numeric:tabular-nums;letter-spacing:.01em;font-feature-settings:'tnum';text-align:right}
.dc.z{background:#f8f9fb}
.th{font-family:'Inter',sans-serif;font-weight:700;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.95);background:linear-gradient(135deg,#1E3A5F 0%,#2a5082 100%);text-align:center;padding:9px 5px;vertical-align:middle}
.tr-total .dc{font-weight:700;background:linear-gradient(135deg,#EEF2F8 0%,#E3EAF4 100%);border-top:2px solid #3b6ba5;border-bottom:2px solid #3b6ba5;color:#1E3A5F;font-size:10.5px}
.L{font-family:'Inter',sans-serif;font-weight:600;font-size:9px;color:#1E3A5F;letter-spacing:.02em}
.V{font-family:'Inter',sans-serif;font-weight:400;font-size:10px;color:#374151}
@media print{
  body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .nb{page-break-inside:avoid}
}
</style></head><body>

<!-- HEADER -->
<table style="border-spacing:0">
  <tr>
    <td style="width:38%;vertical-align:middle;padding:6px 0">
      <img src="/pl-assets/template-image-2.png" style="height:48px" alt="IBC"/>
    </td>
    <td style="width:62%;vertical-align:middle">
      <table style="border-spacing:0"><tr>
        <td style="background:linear-gradient(135deg,#1E3A5F,#2a5082);color:#fff;text-align:center;padding:9px 16px;border-radius:6px">
          <div style="font-weight:600;font-size:8.5px;letter-spacing:.06em;line-height:1.7;opacity:.9">
            ${IBC_COMPANY.address}<br/>
            <span style="opacity:.75">${IBC_COMPANY.email} &nbsp;·&nbsp; ${IBC_COMPANY.tel}</span>
          </div>
        </td>
      </tr></table>
    </td>
  </tr>
</table>

<!-- TITLE -->
<div style="text-align:center;margin:10px 0 8px 0">
  <span style="font-weight:800;font-size:22px;letter-spacing:.08em;color:#1E3A5F">${docType.title}</span>
  <div style="width:60%;height:3px;margin:6px auto 0;background:linear-gradient(90deg,#5D81AF,#1E3A5F,#5D81AF);border-radius:2px"></div>
</div>

<!-- CLIENT & ISSUER INFO -->
<table style="border-spacing:8px;margin:4px 0"><tr>
  <td style="width:50%;vertical-align:top;background:linear-gradient(135deg,#1E3A5F,#2a5082);border-radius:8px;padding:12px 14px;color:#fff">
    <div style="font-weight:700;font-size:8px;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px;opacity:.7">Client</div>
    <div style="margin-bottom:3px"><span class="L" style="color:rgba(255,255,255,.7)">Messrs:</span> <span style="font-size:10px;font-weight:500">${template.client.messrs}</span></div>
    <div style="margin-bottom:3px"><span class="L" style="color:rgba(255,255,255,.7)">NIT:</span> <span style="font-size:10px">${template.client.nit}</span></div>
    <div style="margin-bottom:3px"><span class="L" style="color:rgba(255,255,255,.7)">Address:</span> <span style="font-size:10px">${template.client.address}</span></div>
    <div><span class="L" style="color:rgba(255,255,255,.7)">Country - City:</span> <span style="font-size:10px">${template.client.countryCity}</span></div>
  </td>
  <td style="width:50%;vertical-align:top;background:#f1f5f9;border-radius:8px;padding:12px 14px">
    <div style="font-weight:700;font-size:8px;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px;color:#94a3b8">Issued by</div>
    <div style="font-weight:700;font-size:13px;color:#1E3A5F;margin-bottom:4px">${template.company.name}</div>
    <div style="font-size:9px;color:#475569;line-height:1.5">
      ${template.company.address}<br/>
      Tel: ${template.company.tel}<br/>
      EIN: ${template.company.ein}
    </div>
  </td>
</tr></table>

<!-- TRANSPORT DETAILS -->
<table style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin:6px 0">
  <tr style="background:linear-gradient(135deg,#1E3A5F,#2a5082)">
    <td colspan="4" style="color:#fff;font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;padding:6px 10px">Transport Details</td>
  </tr>
  <tr>
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0;width:15%"><span class="L">Transport Details:</span></td>
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0;width:35%"></td>
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0;width:18%"><span class="L">No:</span></td>
    <td style="padding:5px 10px;width:32%"><span class="V">${template.documentNumber}</span></td>
  </tr>
  <tr style="border-top:1px solid #f0f0f4">
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0"><span class="L">Port of Loading:</span></td>
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0"><span class="V">${template.metadata.portOfLoading || ""}</span></td>
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0"><span class="L">Date:</span></td>
    <td style="padding:5px 10px"><span class="V">${template.documentDate}</span></td>
  </tr>
  <tr style="border-top:1px solid #f0f0f4">
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0"><span class="L">Port of Discharging:</span></td>
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0"><span class="V">${template.metadata.portOfDischarge || ""}</span></td>
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0"><span class="L">Shipping Marks:</span></td>
    <td style="padding:5px 10px"><span class="V">N/M</span></td>
  </tr>
  <tr style="border-top:1px solid #f0f0f4">
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0"><span class="L">Vessel Name:</span></td>
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0"><span class="V">${template.metadata.vesselName || ""}</span></td>
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0"><span class="L">BL No:</span></td>
    <td style="padding:5px 10px"><span class="V">${template.metadata.blNo || ""}</span></td>
  </tr>
  <tr style="border-top:1px solid #f0f0f4">
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0" colspan="2"></td>
    <td style="padding:5px 10px;border-right:1px solid #e2e8f0"><span class="L">Place of Invoice Issue:</span></td>
    <td style="padding:5px 10px"><span class="V">MIAMI, FL</span></td>
  </tr>
</table>

${template.metadata.descriptionOfGoods ? `
<div style="text-align:center;padding:6px 12px;margin:6px 0;background:#f0f7ff;border:1px solid #d0e0f0;border-radius:4px">
  <span style="font-weight:600;font-size:10px;color:#1E3A5F">${template.metadata.descriptionOfGoods}</span>
</div>` : ""}

<!-- DATA TABLE -->
<table style="margin:8px 0;border:1px solid #e2e5eb;border-radius:5px;overflow:hidden" class="nb">
  <tr>${headerCellsHTML}</tr>
  ${dataRowsHTML}
  <tr class="tr-total">${totalsHTML}</tr>
</table>

<!-- PAYMENT & NOTE -->
<table style="border-spacing:8px;margin:8px 0"><tr>
  <td style="width:55%;vertical-align:top;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px">
    <div style="font-weight:700;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#92400e;margin-bottom:4px">Note</div>
    <div style="font-size:8.5px;color:#78350f;line-height:1.4;font-style:italic">${DOCUMENT_DISCLAIMER}</div>
  </td>
  <td style="width:45%;vertical-align:top;padding:10px 12px;border:1px solid #d0e0f0;border-radius:6px">
    <div style="font-weight:700;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#1E3A5F;margin-bottom:4px">Payment Information</div>
    <div style="font-size:8.5px;color:#334155;line-height:1.5">
      <b>Beneficiary:</b> ${IBC_BANK.beneficiaryName}<br/>
      <b>Bank:</b> ${IBC_BANK.beneficiaryBank}<br/>
      <b>Account No:</b> ${IBC_BANK.accountNo}<br/>
      <b>SWIFT:</b> ${IBC_BANK.swiftCode}<br/>
      <b>Bank Address:</b> ${IBC_BANK.bankAddress}<br/>
      <b>ABA:</b> ${IBC_BANK.aba}
    </div>
  </td>
</tr></table>

<!-- FOOTER: Signature, ISO, QR -->
<table style="border-spacing:0;margin:10px 0"><tr>
  <td style="width:40%;vertical-align:bottom;padding:4px 0">
    <img src="/pl-assets/firma.png" style="height:68px" alt="Signature"/>
  </td>
  <td style="width:30%;text-align:center;vertical-align:bottom;padding:4px 0">
    <img src="/pl-assets/iso.png" style="height:72px" alt="ISO"/>
  </td>
  <td style="width:30%;text-align:right;vertical-align:bottom;padding:4px 0">
    <img src="/pl-assets/qr.png" style="height:92px" alt="QR"/>
  </td>
</tr></table>

<!-- VERSION FOOTER -->
<div style="background:linear-gradient(135deg,#0D71B9,#1E3A5F);color:#fff;text-align:center;padding:6px 0;border-radius:4px;margin-top:4px">
  <span style="font-size:8px;font-weight:600;letter-spacing:.08em">${FOOTER_CODE} &nbsp;·&nbsp; ${IBC_COMPANY.name} &nbsp;·&nbsp; www.ibcsteelgroup.com</span>
</div>

</body></html>`;
}

/**
 * PDF V1: Direct download using html2canvas + jsPDF.
 * Renders the styled HTML template, captures it, and saves as PDF.
 */
export async function printDocumentPDF(template: DocumentTemplate): Promise<void> {
  const html = renderDocumentHTML(template);
  const docType = DOCUMENT_TYPES[template.type];

  // Fixed pixel width matching A4 at 96dpi (210mm ≈ 794px), minus margins
  const targetWidth = 750;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = `${targetWidth}px`;
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error("No se pudo crear el iframe para el PDF");
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for images and fonts to load
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Set iframe height to match content
  const contentHeight = iframeDoc.body.scrollHeight;
  iframe.style.height = `${contentHeight}px`;

  try {
    const html2canvas = (await import("html2canvas")).default;
    const { default: jsPDF } = await import("jspdf");

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#FFFFFF",
      width: targetWidth,
      height: contentHeight,
      windowWidth: targetWidth,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const margin = 8; // mm
    const usableW = pdfW - margin * 2;
    const imgRatio = canvas.width / canvas.height;
    const imgHeight = usableW / imgRatio;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, usableW, imgHeight);
    heightLeft -= (pdfH - margin * 2);

    while (heightLeft > 0) {
      position -= (pdfH - margin * 2);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position + margin, usableW, imgHeight);
      heightLeft -= (pdfH - margin * 2);
    }

    const fileName = `${template.documentNumber || "DOC"} ${docType.title}.pdf`;
    pdf.save(fileName);
  } finally {
    document.body.removeChild(iframe);
  }
}

/**
 * Downloads the document as a PDF using jsPDF + jspdf-autotable.
 */
export async function downloadDocumentPDF(template: DocumentTemplate): Promise<void> {
  const jsPDFModule = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const jsPDF = jsPDFModule.default;
  const autoTable = autoTableModule.default;

  const docType = DOCUMENT_TYPES[template.type];
  const headers = template.dataTable.headers.filter((h) => h !== "");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // Title
  doc.setFillColor(11, 83, 148);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(docType.title, pageW / 2, 12, { align: "center" });
  doc.setFontSize(8);
  doc.text(`${IBC_COMPANY.address} · ${IBC_COMPANY.email}`, pageW / 2, 19, { align: "center" });
  doc.setFontSize(7);
  doc.text(`${template.company.name} · Tel: ${template.company.tel} · EIN: ${template.company.ein}`, pageW / 2, 24, { align: "center" });
  y = 34;

  // Client & Document info
  doc.setTextColor(11, 83, 148);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENT", 14, y);
  doc.text("DOCUMENT", pageW / 2 + 10, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(8);
  const clientLines = [
    `Messrs: ${template.client.messrs}`,
    `NIT: ${template.client.nit}`,
    `Address: ${template.client.address}`,
    `Country - City: ${template.client.countryCity}`,
  ];
  clientLines.forEach((line) => { doc.text(line, 14, y); y += 4; });

  y -= 16;
  const docLines = [
    `No: ${template.documentNumber}`,
    `Date: ${template.documentDate}`,
    `Port of Loading: ${template.metadata.portOfLoading || "-"}`,
    `Port of Discharge: ${template.metadata.portOfDischarge || "-"}`,
    `Vessel: ${template.metadata.vesselName || "-"}`,
    `BL No: ${template.metadata.blNo || "-"}`,
  ];
  docLines.forEach((line) => { doc.text(line, pageW / 2 + 10, y); y += 4; });
  y += 6;

  // Data table
  const tableHead = [headers];
  const tableBody = template.dataTable.rows.map((row) =>
    headers.map((_, ci) => {
      const v = row[ci];
      if (v == null) return "";
      if (typeof v === "number") return v.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return String(v);
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  autoTable(doc as any, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2, halign: "center", valign: "middle" },
    headStyles: { fillColor: [11, 83, 148], textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [240, 244, 248] },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // Payment info
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 83, 148);
  doc.text("PAYMENT INFORMATION", 14, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  const bankLines = [
    `Beneficiary: ${IBC_BANK.beneficiaryName}`,
    `Bank: ${IBC_BANK.beneficiaryBank}`,
    `Account: ${IBC_BANK.accountNo}`,
    `SWIFT: ${IBC_BANK.swiftCode}`,
    `Bank Address: ${IBC_BANK.bankAddress}`,
  ];
  bankLines.forEach((line) => { doc.text(line, 14, y); y += 3.5; });

  // Disclaimer
  y += 4;
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  const disclaimerLines = doc.splitTextToSize(DOCUMENT_DISCLAIMER, pageW - 28);
  doc.text(disclaimerLines, 14, y);

  // Footer
  y = doc.internal.pageSize.getHeight() - 8;
  doc.setFillColor(13, 113, 185);
  doc.rect(0, y - 3, pageW, 12, "F");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(`${FOOTER_CODE} · ${IBC_COMPANY.name} · www.ibcsteelgroup.com`, pageW / 2, y + 2, { align: "center" });

  // Save
  const fileName = `${template.documentNumber || "DOC"} ${template.type === "commercial-invoice" ? "INVOICE" : "PACKING LIST"}.pdf`;
  doc.save(fileName);
}
