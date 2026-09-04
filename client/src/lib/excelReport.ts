import ExcelJS from "exceljs";

// ブランドカラー（index.css の oklch トークンを sRGB に変換した値。ARGB形式で使う）
export const BRAND = {
  navy: "0A345A",       // --primary / --chart-1
  steelBlue: "1479B0",  // --chart-2
  skyBlue: "40B1B7",    // --chart-3
  foreground: "0E171E",
  mutedFg: "4C575F",
  border: "D2D8DD",
  zebraFill: "F3F7FA",
  amber: "F59E0B",
  emerald: "047857",
  emeraldFill: "E7F5EF",
  white: "FFFFFF",
};

const argb = (hex: string) => `FF${hex}`;

export function newReportWorkbook(title: string): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "LOGICAL FP";
  wb.created = new Date();
  wb.title = title;
  return wb;
}

function thinBorder(hex: string = BRAND.border): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: argb(hex) } };
  return { top: side, left: side, bottom: side, right: side };
}

// シート最上部のタイトル帯（濃紺の帯にロゴ代わりの白文字タイトル）
export function addTitleBanner(ws: ExcelJS.Worksheet, title: string, subtitle: string, colSpan: number) {
  ws.mergeCells(1, 1, 1, colSpan);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { size: 15, bold: true, color: { argb: argb(BRAND.white) } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.navy) } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, colSpan);
  const subCell = ws.getCell(2, 1);
  subCell.value = subtitle;
  subCell.font = { size: 9, color: { argb: argb(BRAND.mutedFg) }, italic: true };
  subCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(2).height = 16;
}

// セクションの見出し帯（スチールブルーの帯）
export function addSectionBanner(ws: ExcelJS.Worksheet, rowNum: number, text: string, colSpan: number) {
  ws.mergeCells(rowNum, 1, rowNum, colSpan);
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.font = { size: 11, bold: true, color: { argb: argb(BRAND.white) } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.steelBlue) } };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(rowNum).height = 20;
}

// テーブルの見出し行（濃紺の帯に白文字）
export function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.font = { bold: true, size: 10, color: { argb: argb(BRAND.white) } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.navy) } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder();
  });
  row.height = 24;
}

// 「項目 / 値」表の見出し行（スチールブルーの帯。1列目は左寄せ、それ以外は右寄せ）
export function addTableHeaderRow(ws: ExcelJS.Worksheet, rowNum: number, labels: string[]) {
  const row = ws.getRow(rowNum);
  labels.forEach((label, i) => {
    const cell = row.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, size: 10, color: { argb: argb(BRAND.white) } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.steelBlue) } };
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right" };
  });
  row.height = 20;
}

// データ行に罫線とゼブラ縞（偶数行に薄い塗り）を付ける
export function styleDataRow(row: ExcelJS.Row, zebra: boolean) {
  row.eachCell(cell => {
    cell.border = thinBorder();
    if (zebra) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.zebraFill) } };
    }
  });
}

// ヘッダー付きの数値テーブル（年次推移など）をまとめて描画する。
// ゼブラ縞・罫線・オートフィルタ・（任意で）見出し行の固定・最終行のハイライトを付ける。
// 戻り値は書き込んだ最後の行番号。
export function addDataTable(
  ws: ExcelJS.Worksheet,
  startRow: number,
  header: string[],
  rows: (string | number)[][],
  opts?: { numFmt?: string; freezeHeader?: boolean; highlightLastRow?: boolean }
): number {
  const headerRow = ws.getRow(startRow);
  header.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
  styleHeaderRow(headerRow);

  rows.forEach((r, idx) => {
    const row = ws.getRow(startRow + 1 + idx);
    r.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.alignment = { horizontal: typeof v === "number" ? "right" : "left" };
      if (typeof v === "number" && opts?.numFmt) cell.numFmt = opts.numFmt;
    });

    const isLastRow = opts?.highlightLastRow && idx === rows.length - 1;
    if (isLastRow) {
      row.eachCell(cell => {
        cell.font = { bold: true, color: { argb: argb(BRAND.navy) } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(BRAND.emeraldFill) } };
        cell.border = thinBorder();
      });
    } else {
      styleDataRow(row, idx % 2 === 1);
    }
  });

  ws.autoFilter = { from: { row: startRow, column: 1 }, to: { row: startRow, column: header.length } };
  if (opts?.freezeHeader) {
    ws.views = [{ state: "frozen", ySplit: startRow }];
  }
  return startRow + rows.length;
}

// 「項目 / 値」形式の1行（前提条件・サマリー用）。値がnumberならnumFmtを適用する
export function addLabelValueRow(
  ws: ExcelJS.Worksheet,
  rowNum: number,
  label: string,
  value: string | number,
  opts?: { numFmt?: string; bold?: boolean; color?: string; zebra?: boolean; fill?: string }
) {
  const row = ws.getRow(rowNum);
  row.getCell(1).value = label;
  row.getCell(1).font = { size: 10, color: { argb: argb(BRAND.mutedFg) } };
  const valueCell = row.getCell(2);
  valueCell.value = value;
  valueCell.font = {
    size: 10,
    bold: opts?.bold ?? true,
    color: { argb: argb(opts?.color ?? BRAND.foreground) },
  };
  valueCell.alignment = { horizontal: "right" };
  if (opts?.numFmt) valueCell.numFmt = opts.numFmt;
  if (opts?.fill) {
    row.eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(opts.fill!) } };
    });
    row.eachCell(cell => { cell.border = thinBorder(); });
  } else {
    styleDataRow(row, opts?.zebra ?? false);
  }
  row.getCell(1).alignment = { vertical: "middle" };
}

export const NUM_FMT_MANEN = '#,##0"万円"';
export const NUM_FMT_MANEN_MONTHLY = '#,##0.0"万円/月"';
export const NUM_FMT_PERCENT = '0.0"%"';
export const NUM_FMT_AGE = '0"歳"';
export const NUM_FMT_YEARS = '0"年"';
export const NUM_FMT_MULTIPLE = '0.00"倍"';

// Safari の data:URL ダウンロード不具合を避けるため、画像と同じく Blob 方式で保存する
export async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
