import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, Image as ImageIcon, FileSpreadsheet, Loader2 } from "lucide-react";
import { downloadElementAsImage, MOBILE_CAPTURE_WIDTH, PC_CAPTURE_WIDTH } from "@/lib/downloadImage";

type DownloadKind = "image-mobile" | "image-pc" | "excel-mobile" | "excel-pc";

interface DownloadButtonsProps {
  captureRef: React.RefObject<HTMLElement | null>;
  filenameBase: string;
  onDownloadExcel: (orientation: "portrait" | "landscape") => void;
}

export default function DownloadButtons({ captureRef, filenameBase, onDownloadExcel }: DownloadButtonsProps) {
  const [loading, setLoading] = useState<DownloadKind | null>(null);

  const handleImageDownload = async (kind: "mobile" | "pc") => {
    if (!captureRef.current) return;
    const loadingKey: DownloadKind = kind === "mobile" ? "image-mobile" : "image-pc";
    setLoading(loadingKey);
    try {
      await downloadElementAsImage(
        captureRef.current,
        `${filenameBase}_${kind === "mobile" ? "スマホ用" : "PC用"}.png`,
        kind === "mobile" ? MOBILE_CAPTURE_WIDTH : PC_CAPTURE_WIDTH
      );
    } catch (e) {
      console.error(e);
      window.alert("画像の生成に失敗しました。お手数ですが、もう一度お試しください。");
    } finally {
      setLoading(null);
    }
  };

  const handleExcelDownload = (kind: "mobile" | "pc") => {
    const loadingKey: DownloadKind = kind === "mobile" ? "excel-mobile" : "excel-pc";
    setLoading(loadingKey);
    try {
      onDownloadExcel(kind === "mobile" ? "portrait" : "landscape");
    } catch (e) {
      console.error(e);
      window.alert("Excelファイルの生成に失敗しました。お手数ですが、もう一度お試しください。");
    } finally {
      setLoading(null);
    }
  };

  const btnClass = "h-auto py-2.5 flex-col gap-1 text-[11px]";

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-bold text-foreground mb-2">結果をダウンロード</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button variant="outline" className={btnClass} disabled={loading !== null} onClick={() => handleImageDownload("mobile")}>
          {loading === "image-mobile" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <span className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /><Smartphone className="w-3.5 h-3.5" /></span>
          )}
          画像(スマホ用)
        </Button>
        <Button variant="outline" className={btnClass} disabled={loading !== null} onClick={() => handleImageDownload("pc")}>
          {loading === "image-pc" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <span className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /><Monitor className="w-3.5 h-3.5" /></span>
          )}
          画像(PC用)
        </Button>
        <Button variant="outline" className={btnClass} disabled={loading !== null} onClick={() => handleExcelDownload("mobile")}>
          {loading === "excel-mobile" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <span className="flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /><Smartphone className="w-3.5 h-3.5" /></span>
          )}
          Excel(スマホ用)
        </Button>
        <Button variant="outline" className={btnClass} disabled={loading !== null} onClick={() => handleExcelDownload("pc")}>
          {loading === "excel-pc" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <span className="flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /><Monitor className="w-3.5 h-3.5" /></span>
          )}
          Excel(PC用)
        </Button>
      </div>
    </div>
  );
}
