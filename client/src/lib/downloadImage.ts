import html2canvas from "html2canvas";
import { neutralizeModernColorsLive } from "./neutralizeModernColors";

// スマホ・PCそれぞれの想定幅で、実際の画面幅に関係なくその見た目で画像化する
export const MOBILE_CAPTURE_WIDTH = 430;
export const PC_CAPTURE_WIDTH = 1280;

export async function downloadElementAsImage(
  element: HTMLElement,
  filename: string,
  windowWidth: number
) {
  // html2canvas は oklch()/oklab() をパースできないため、キャプチャ中だけ
  // ライブDOMの該当色を rgba() に一時置換し、完了後に元へ戻す。
  // html2canvas はキャプチャ対象の祖先（body/html）のスタイルも参照するため、
  // 対象要素だけでなくドキュメント全体を対象にする
  const restore = neutralizeModernColorsLive(document.documentElement);
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      windowWidth,
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
  } finally {
    restore();
  }

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
