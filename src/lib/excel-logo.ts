/**
 * Utility to add the IBC logo to Excel report headers.
 *
 * Usage:
 *   const logoId = await addLogoToWorkbook(workbook);
 *   addLogoToHeader(ws, logoId, totalCols);
 */

type Workbook = import("exceljs").Workbook;
type Worksheet = import("exceljs").Worksheet;

/**
 * Fetches the logo from /logo-ibc.png, converts it to base64,
 * and adds it to the workbook as an image resource.
 * Returns the imageId to be used when placing the image on worksheets.
 */
export async function addLogoToWorkbook(workbook: Workbook): Promise<number> {
  const response = await fetch("/logo-ibc.png");
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ""
    )
  );

  const imageId = workbook.addImage({
    base64,
    extension: "png",
  });

  return imageId;
}

/**
 * Places the logo image on the header row (Row 1) of the worksheet.
 * The logo is positioned in the first column area, sized proportionally
 * to look clean inside the navy header bar.
 *
 * Call this AFTER adding Row 1 (the header row) with height already set.
 */
export function addLogoToHeader(
  ws: Worksheet,
  logoId: number,
  totalCols: number
): void {
  // Original logo is 558x219 (~2.55:1 ratio)
  // We want the logo to fit nicely in the header row (height ~50px in Excel)
  // Position: starts at column A, vertically centered in row 1
  ws.addImage(logoId, {
    tl: { col: 0.15, row: 0.1 },
    ext: { width: 119, height: 47 },
    editAs: "oneCell",
  });
}
