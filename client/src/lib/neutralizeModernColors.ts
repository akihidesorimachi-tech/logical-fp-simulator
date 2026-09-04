// html2canvas は oklch()・oklab() など CSS Color 4 の新しい色関数をパースできず
// 例外を投げる（このアプリは Tailwind v4 + oklch ベースのデザイントークンを
// 全面的に使っており、不透明度付きの色は getComputedStyle 経由だと oklab(L a b / A)
// 形式で返ってくるため、そのままでは画像化に失敗する）。
// html2canvas の onclone はクローン側のスタイル反映タイミングが不確実だったため、
// 実際に表示されているライブDOMの該当要素を一時的に rgba() で上書きしてから
// html2canvas に渡し、キャプチャ完了後に元の状態へ戻す。

const COLOR_PROPS = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "fill",
  "stroke",
  "stop-color",
  "caret-color",
] as const;

const MODERN_COLOR_FN = /oklch\(|oklab\(|color-mix\(|lab\(|lch\(|color\(/;
// oklch(L C H [/ A]) / oklab(L a b [/ A]) を拾う
const OKLCH_OKLAB_TOKEN = /(oklch|oklab)\(\s*([\d.]+)%?\s+(-?[\d.]+)%?\s+(-?[\d.]+)\s*(?:\/\s*([\d.]+)%?\s*)?\)/g;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function gammaEncode(c: number) {
  const cs = clamp01(c);
  return cs <= 0.0031308 ? 12.92 * cs : 1.055 * Math.pow(cs, 1 / 2.4) - 0.055;
}

// OKLab -> 線形sRGB -> sRGB（Björn Ottosson の OKLab 参照実装の変換行列）
function oklabToRgbString(L: number, a: number, b: number, alpha: number): string {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const r = Math.round(clamp01(gammaEncode(rLin)) * 255);
  const g = Math.round(clamp01(gammaEncode(gLin)) * 255);
  const bl = Math.round(clamp01(gammaEncode(bLin)) * 255);

  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

function resolveColorToRgb(input: string): string {
  if (!MODERN_COLOR_FN.test(input)) return input;
  return input.replace(OKLCH_OKLAB_TOKEN, (_match, fn, c1, c2, c3, alphaStr) => {
    const L = parseFloat(c1);
    let a: number;
    let b: number;
    if (fn === "oklch") {
      const C = parseFloat(c2);
      const H = parseFloat(c3);
      const hRad = (H * Math.PI) / 180;
      a = C * Math.cos(hRad);
      b = C * Math.sin(hRad);
    } else {
      a = parseFloat(c2);
      b = parseFloat(c3);
    }
    const alpha = alphaStr !== undefined ? parseFloat(alphaStr) : 1;
    return oklabToRgbString(L, a, b, alpha);
  });
}

interface StyleOverride {
  el: HTMLElement;
  prop: string;
  prevValue: string;
  prevPriority: string;
}

// ライブDOMの element とその子孫すべてについて、oklch/oklab を含む computed
// color系プロパティを rgba() で上書きする。返り値の関数を呼ぶと元に戻る。
export function neutralizeModernColorsLive(root: HTMLElement): () => void {
  const win = root.ownerDocument.defaultView ?? window;
  const all = root.querySelectorAll<Element>("*");
  const targets: Element[] = [root, ...Array.from(all)];
  const overrides: StyleOverride[] = [];

  for (const el of targets) {
    if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) continue;
    const htmlEl = el as HTMLElement;
    const computed = win.getComputedStyle(el);

    for (const prop of COLOR_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value && MODERN_COLOR_FN.test(value)) {
        overrides.push({
          el: htmlEl,
          prop,
          prevValue: htmlEl.style.getPropertyValue(prop),
          prevPriority: htmlEl.style.getPropertyPriority(prop),
        });
        htmlEl.style.setProperty(prop, resolveColorToRgb(value), "important");
      }
    }

    const bgImage = computed.getPropertyValue("background-image");
    if (bgImage && bgImage !== "none" && MODERN_COLOR_FN.test(bgImage)) {
      overrides.push({
        el: htmlEl,
        prop: "background-image",
        prevValue: htmlEl.style.getPropertyValue("background-image"),
        prevPriority: htmlEl.style.getPropertyPriority("background-image"),
      });
      htmlEl.style.setProperty("background-image", resolveColorToRgb(bgImage), "important");
    }
  }

  return () => {
    for (const { el, prop, prevValue, prevPriority } of overrides) {
      if (prevValue) {
        el.style.setProperty(prop, prevValue, prevPriority);
      } else {
        el.style.removeProperty(prop);
      }
    }
  };
}
