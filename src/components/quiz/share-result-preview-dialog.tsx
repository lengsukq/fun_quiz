"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { QuizResultView } from "@/types/quiz-play";

function getSafeFileBase(result: QuizResultView): string {
  const code = (result.outcomeCode ?? "result").replaceAll(/[\\/:*?"<>|]/g, "-").slice(0, 64);
  return `quiz-result-${code}`;
}

function getResultBackgroundForCard(result: QuizResultView | undefined) {
  const raw =
    result?.resultConfig && typeof result.resultConfig === "object" && "bgColor" in result.resultConfig
      ? String((result.resultConfig as { bgColor?: unknown }).bgColor ?? "").trim()
      : "";
  if (!raw) return { background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)" };
  return { background: raw };
}

/**
 * html-to-image 在 backgroundColor 缺省时透明区易导出成黑边；`object-contain` 的 img 留白也常为透明，需全链路铺底。
 */
function getPngExportBackground(shareImageUrl: string | undefined, useHero: boolean): string {
  if (shareImageUrl) return "#ffffff";
  if (useHero) return "#f8fafc";
  return "#3b0f6b";
}

type NarrativeLayout = "belowImage" | "composed";

function hasSystemNarrative(result: QuizResultView) {
  return Boolean(result.outcomeSummary?.trim() || result.outcomeDetail?.trim());
}

export function buildSharePlainText(result: QuizResultView, pageUrl: string, deepAnalysis: string): string {
  const parts: string[] = [];
  if (result.quizName) parts.push(result.quizName);
  if (result.outcomeName) parts.push(`结果：${result.outcomeName}`);
  if (result.outcomeCode) parts.push(`编码：${result.outcomeCode}`);
  parts.push(`匹配度：${result.score}%`);
  if (result.outcomeSummary?.trim() || result.outcomeDetail?.trim()) {
    parts.push("");
    parts.push("【系统点评】");
    if (result.outcomeSummary?.trim()) parts.push(result.outcomeSummary.trim());
    if (result.outcomeDetail?.trim()) {
      if (result.outcomeSummary?.trim()) parts.push("");
      parts.push(result.outcomeDetail.trim());
    }
  }
  if (deepAnalysis.trim()) {
    parts.push("");
    parts.push("【AI 深度分析】");
    parts.push(deepAnalysis.trim());
  }
  parts.push("");
  parts.push("链接：");
  parts.push(pageUrl);
  return parts.join("\n");
}

function SystemAndAiBlocks({
  result,
  deepAnalysis,
  layout,
  useHero,
}: {
  result: QuizResultView;
  deepAnalysis: string;
  layout: NarrativeLayout;
  useHero: boolean;
}) {
  const showSystem = hasSystemNarrative(result);
  const showAi = deepAnalysis.trim().length > 0;
  if (!showSystem && !showAi) return null;

  const isBelow = layout === "belowImage";

  return (
    <div
      className={cn(
        "text-left",
        isBelow
          ? "space-y-3 border-t border-zinc-200/90 bg-white px-3 py-3 text-slate-800"
          : cn(
              "mt-2 space-y-3",
              (showSystem || showAi) && cn("border-t pt-3", useHero ? "border-slate-200" : "border-white/20"),
            ),
      )}
    >
      {showSystem ? (
        <div className="space-y-1.5">
          <p
            className={cn(
              "text-xs font-semibold",
              isBelow || useHero ? "text-violet-800" : "text-amber-100/95",
            )}
          >
            系统点评
          </p>
          {result.outcomeSummary?.trim() ? (
            <p className={cn("text-sm leading-relaxed", isBelow || useHero ? "text-slate-800" : "text-white/95")}>
              {result.outcomeSummary}
            </p>
          ) : null}
          {result.outcomeDetail?.trim() ? (
            <div
              className={cn(
                "whitespace-pre-wrap text-sm leading-relaxed",
                isBelow || useHero ? "text-slate-600" : "text-white/88",
              )}
            >
              {result.outcomeDetail}
            </div>
          ) : null}
        </div>
      ) : null}
      {showAi ? (
        <div
          className={cn("space-y-1.5", showSystem && "border-t pt-3", isBelow ? "border-zinc-200" : useHero ? "border-slate-200" : "border-white/20")}
        >
          <p
            className={cn(
              "text-xs font-semibold",
              isBelow || useHero ? "text-violet-800" : "text-amber-100/95",
            )}
          >
            AI 深度分析
          </p>
          <div
            className={cn(
              "whitespace-pre-wrap rounded-lg px-2 py-2 text-sm leading-relaxed",
              isBelow || useHero ? "bg-violet-50/80 text-slate-800" : "bg-white/10 text-white/95",
            )}
          >
            {deepAnalysis}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type ShareResultPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: QuizResultView;
  pageUrl: string;
  useHero: boolean;
  /** 已生成的 AI 深度分析全文；空字符串则不展示该块 */
  deepAnalysis: string;
};

export function ShareResultPreviewDialog({ open, onOpenChange, result, pageUrl, useHero, deepAnalysis }: ShareResultPreviewDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (open) setActionError("");
  }, [open]);

  const copyAllText = useCallback(async () => {
    setActionError("");
    try {
      const text = buildSharePlainText(result, pageUrl, deepAnalysis);
      await navigator.clipboard.writeText(text);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "复制失败");
    }
  }, [pageUrl, result, deepAnalysis]);

  const runSystemShare = useCallback(async () => {
    if (!("share" in navigator) || !navigator.share) {
      setActionError("当前环境不支持系统分享");
      return;
    }
    setActionError("");
    const text = buildSharePlainText(result, pageUrl, deepAnalysis).slice(0, 12_000);
    const title = result.quizName || "我的测验结果";
    try {
      await navigator.share({ title, text, url: pageUrl });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setActionError(e instanceof Error ? e.message : "系统分享失败");
    }
  }, [pageUrl, result, deepAnalysis]);

  const savePng = useCallback(async () => {
    const el = cardRef.current;
    if (!el) return;
    setSaving(true);
    setActionError("");
    try {
      const exportBg = getPngExportBackground(result.shareImage?.url, useHero);
      // foreignObject 截图时，根节点若带 mx-auto 会在 viewBox 内留灰/黑条；用固定宽高 + 去掉 margin/transform 与阴影
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const dataUrl = await toPng(el, {
        width: w,
        height: h,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: exportBg,
        style: {
          margin: "0",
          marginLeft: "0",
          marginRight: "0",
          position: "static",
          top: "0",
          left: "0",
          transform: "none",
          boxShadow: "none",
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${getSafeFileBase(result)}.png`;
      a.click();
    } catch (e) {
      setActionError(
        e instanceof Error
          ? `${e.message}。若含外链图片，需图片服务器允许跨域。`
          : "生成图片失败，请重试。",
      );
    } finally {
      setSaving(false);
    }
  }, [result, useHero]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0" showCloseButton>
        <DialogHeader>
          <DialogTitle>分享预览</DialogTitle>
          <DialogDescription>含系统点评与 AI 深度分析（已生成时）；可保存为 PNG 或使用下方操作</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 max-h-[min(64dvh,520px)] flex-1 flex-col items-center overflow-y-auto px-3 py-2">
          <div
            ref={cardRef}
            className={cn(
              "w-full max-w-[360px] shrink-0 overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5",
              result.shareImage?.url && "bg-white",
              !result.shareImage?.url && useHero && "bg-[#f8fafc]",
              !result.shareImage?.url && !useHero && "bg-violet-950",
            )}
            data-share-card
          >
            {result.shareImage?.url ? (
              <div className="bg-white">
                {/* img 上设置 bg-white，object-contain 时上下/左右留白处不会变成透明底（导出发黑） */}
                <img
                  src={result.shareImage.url}
                  alt="分享图"
                  className="block w-full bg-white object-contain"
                />
                <SystemAndAiBlocks result={result} deepAnalysis={deepAnalysis} layout="belowImage" useHero={useHero} />
                <p className="px-3 pb-3 text-center text-[0.7rem] text-zinc-400">长按 / 或下方「保存为 PNG」</p>
              </div>
            ) : (
              <div
                className={cn(
                  "p-5 text-left",
                  useHero ? "text-slate-900" : "text-white",
                )}
                style={useHero ? { background: "#f8fafc" } : getResultBackgroundForCard(result)}
              >
                <p className={cn("text-xs", useHero ? "text-violet-700" : "text-white/80")}>
                  {result.quizName}
                </p>
                <h3 className="mt-1 text-2xl font-extrabold leading-tight">{result.outcomeName}</h3>
                <p className="mt-0.5 font-mono text-sm opacity-90">{result.outcomeCode}</p>
                {result.outcomeAvatar?.url ? (
                  <div
                    className={cn("mx-auto my-3 h-36 w-36 overflow-hidden rounded-2xl border", useHero ? "border-violet-200" : "border-white/20")}
                  >
                    <img src={result.outcomeAvatar.url} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div
                    className="mx-auto my-3 flex h-28 w-28 items-center justify-center rounded-2xl border border-dashed text-4xl opacity-80"
                    aria-hidden
                  >
                    🎯
                  </div>
                )}
                <p className={cn("text-sm", useHero ? "text-slate-600" : "text-white/90")}>
                  匹配度 <span className="text-xl font-bold tabular-nums">{result.score}%</span>
                </p>
                <SystemAndAiBlocks result={result} deepAnalysis={deepAnalysis} layout="composed" useHero={useHero} />
                <p
                  className={cn(
                    "mt-3 border-t pt-3 text-[0.7rem] leading-tight",
                    useHero ? "border-slate-200 text-slate-500" : "border-white/20 text-white/70",
                  )}
                >
                  扫码或打开链接查看
                  <br />
                  <span className="break-all font-mono">{(pageUrl || "").slice(0, 200)}</span>
                </p>
              </div>
            )}
          </div>
        </div>
        {actionError ? <p className="px-5 pb-1 text-center text-xs text-danger">{actionError}</p> : null}
        <div className="flex flex-col gap-2 border-t border-border/60 bg-surface-muted/40 px-3 py-3 sm:flex-row sm:flex-wrap sm:justify-center sm:px-4">
          <Button type="button" className="w-full sm:min-w-[7rem] sm:max-w-[10rem] sm:flex-1" onClick={savePng} disabled={saving} loading={saving}>
            保存为 PNG
          </Button>
          {"share" in navigator && typeof navigator.share === "function" ? (
            <Button
              type="button"
              variant="primary"
              className="w-full sm:min-w-[7rem] sm:max-w-[10rem] sm:flex-1"
              onClick={() => void runSystemShare()}
            >
              系统分享
            </Button>
          ) : null}
          <Button type="button" variant="surface" className="w-full sm:min-w-[7rem] sm:max-w-[10rem] sm:flex-1" onClick={() => void copyAllText()}>
            复制全文
          </Button>
          <Button type="button" variant="outline" className="w-full sm:min-w-[7rem] sm:max-w-[10rem] sm:flex-1" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
