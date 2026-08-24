import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 全角数字・全角ピリオドを半角に正規化し、数字(と任意で小数点1つ)以外を除去する。
// iOSでは type="number" + text-align:right の組み合わせで入力中の文字が
// 描画されないことがあるため type="text" + inputMode で数値入力欄を実装しており、
// ブラウザ側の数値フィルタが効かない分をここで肩代わりする。
export function sanitizeNumericString(raw: string, allowDecimal = false): string {
  const halfWidth = raw.replace(/[０-９．]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
  const cleaned = halfWidth.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, "");
  if (!allowDecimal) return cleaned;

  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}
