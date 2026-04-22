"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useSearchParams } from "next/navigation";

import { QuizPageFallback, QuizPageShell } from "@/components/quiz/quiz-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentLoading } from "@/components/ui/loading-state";
import { postJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { DEEP_ANALYSIS_STYLES, type DeepAnalysisStyle, type QuizDeepAnalysisView, type QuizResultView } from "@/types/quiz-play";

function getResultBackgroundStyle(resultConfig: Record<string, unknown> | undefined): CSSProperties | undefined {
  const raw = resultConfig && typeof resultConfig.bgColor === "string" ? resultConfig.bgColor.trim() : "";
  if (!raw) return undefined;
  return { background: raw };
}

function QuizResultContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const resultId = useMemo(() => searchParams.get("resultId") ?? "", [searchParams]);
  const [result, setResult] = useState<QuizResultView | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisStyle, setAnalysisStyle] = useState<DeepAnalysisStyle | null>(null);

  useEffect(() => {
    if (!resultId || !token) {
      setResult(null);
      setResultError("");
      setResultLoading(false);
      return;
    }
    setResultLoading(true);
    setResultError("");
    setAnalysis("");
    setAnalysisError("");
    setAnalysisStyle(null);
    void postJson<QuizResultView>("/api/quiz_play/result", { token, resultId })
      .then((data) => {
        setResult(data);
      })
      .catch((err: unknown) => {
        setResult(null);
        setResultError(err instanceof Error ? err.message : "加载结果失败");
      })
      .finally(() => {
        setResultLoading(false);
      });
  }, [resultId, token]);

  const customBg = getResultBackgroundStyle(result?.resultConfig);
  const useHero = Boolean(customBg);

  return (
    <QuizPageShell vibrant={!customBg} backgroundStyle={customBg}>
      <div className="space-y-4">
        {result && (
          <p className="text-center text-sm text-zinc-600/90" style={useHero ? { color: "rgba(255,255,255,0.75)" } : undefined}>
            {result.quizName}
          </p>
        )}

        {useHero && result && (
          <div className="px-1 pb-2 text-center">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              测验结果
            </p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight text-white drop-shadow-sm">{result.outcomeName}</h1>
            <p className="mt-0.5 font-mono text-lg text-white/80">{result.outcomeCode}</p>
            {result.outcomeAvatar?.url ? (
              <div className="mx-auto my-6 h-48 w-48 overflow-hidden rounded-3xl shadow-[var(--shadow-raised)]">
                <img
                  src={result.outcomeAvatar.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div
                className="mx-auto my-6 flex h-40 w-40 items-center justify-center rounded-3xl bg-white/20 text-5xl"
                aria-hidden
              >
                <span>🎯</span>
              </div>
            )}
            <div className="mx-auto max-w-sm rounded-2xl bg-white/20 px-6 py-2">
              <span className="text-sm text-white/80">匹配度 </span>
              <span className="text-2xl font-bold text-white">{result.score}%</span>
            </div>
          </div>
        )}

        <Card
          className={cn(
            "border-primary/20 shadow-[var(--shadow-raised)]",
            useHero && "rounded-2xl border-0",
          )}
        >
          <CardHeader className={useHero ? "border-b border-zinc-100" : ""}>
            <CardTitle className="text-2xl">{useHero ? "你的解读" : "测验结果"}</CardTitle>
            {!useHero && result && (
              <>
                <p className="text-sm font-medium text-foreground">{result.outcomeName ?? "正在计算..."}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="info">结果编码：{result.outcomeCode ?? "-"}</Badge>
                  <Badge variant="success">匹配度 {result?.score ?? 0}%</Badge>
                </div>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!useHero && (
              <p className="text-sm text-zinc-500">结果ID：{resultId}</p>
            )}
            {useHero && result && (
              <p className="text-xs text-zinc-500">结果ID：{resultId}</p>
            )}

            {!resultLoading && !useHero && result?.outcomeAvatar?.url && (
              <div className="mx-auto w-40 overflow-hidden rounded-2xl shadow-[var(--shadow-surface)]">
                <img src={result.outcomeAvatar.url} alt="" className="aspect-square w-full object-cover" />
              </div>
            )}

            {!resultLoading && result && result.outcomeTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.outcomeTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {resultLoading ? <ContentLoading label="加载结果中…" minHeightClassName="min-h-[5rem]" /> : null}
            {resultError ? <p className="text-sm text-danger">{resultError}</p> : null}

            {!resultLoading && result?.outcomeSummary ? (
              <p className="text-base font-medium leading-relaxed text-zinc-800">{result.outcomeSummary}</p>
            ) : null}

            {!resultLoading && result?.outcomeDetail ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">{result.outcomeDetail}</div>
            ) : null}

            {!resultLoading && result && !result.deepAnalysisAvailable ? (
              <p className="text-xs text-zinc-400">
                深度分析需在服务端配置大模型：LLM_API_KEY、及可选的 LLM_BASE_URL、LLM_MODEL，详见 README。
              </p>
            ) : null}

            {!resultLoading && result?.shareImage?.url && (
              <div className="space-y-2">
                <p className="text-sm text-zinc-500">保存或长按图片分享</p>
                <a
                  href={result.shareImage.url}
                  download
                  className="block overflow-hidden rounded-2xl ring-1 ring-zinc-200/80 transition hover:ring-primary/30"
                >
                  <img
                    src={result.shareImage.url}
                    alt="分享图"
                    className="max-h-96 w-full object-contain"
                  />
                </a>
              </div>
            )}

            {result && result.deepAnalysisAvailable ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-800">点评风格</p>
                <p className="text-xs text-zinc-500">请先选择一种风格，再点击「深度分析」</p>
                <div
                  className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                  role="radiogroup"
                  aria-label="点评风格"
                >
                  {DEEP_ANALYSIS_STYLES.map((item) => {
                    const selected = analysisStyle === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={!!analysisLoading}
                        onClick={() => {
                          if (!analysisLoading) setAnalysisStyle(item.id);
                        }}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                          selected
                            ? "border-primary/60 bg-primary/10 shadow-[var(--shadow-surface)]"
                            : "border-border/80 bg-surface/80 hover:border-primary/30 hover:bg-surface",
                          analysisLoading && "pointer-events-none opacity-70",
                        )}
                      >
                        <span className="font-semibold text-foreground">{item.label}</span>
                        <span className="mt-0.5 block text-xs text-zinc-500">{item.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href={`/quiz?token=${token}`}>
                <Button variant="surface" className="w-full sm:w-auto">
                  返回列表
                </Button>
              </Link>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={
                  !result?.deepAnalysisAvailable ||
                  analysisStyle === null ||
                  analysisLoading ||
                  !token ||
                  !resultId
                }
                title={
                  result && !result.deepAnalysisAvailable
                    ? "需配置 LLM_API_KEY 等，详见 README"
                    : analysisStyle === null
                      ? "请先选择上方的点评风格"
                      : "基于本题作答与系统结果，按所选风格生成解读"
                }
                onClick={async () => {
                  if (!result?.deepAnalysisAvailable || !token || !resultId || !analysisStyle) return;
                  setAnalysisError("");
                  setAnalysisLoading(true);
                  try {
                    const data = await postJson<QuizDeepAnalysisView>("/api/quiz_play/result/analyze", {
                      token,
                      resultId,
                      style: analysisStyle,
                    });
                    setAnalysis(data.analysis);
                  } catch (e) {
                    setAnalysis("");
                    setAnalysisError(
                      e instanceof Error ? e.message : "深度分析失败，请稍后重试",
                    );
                  } finally {
                    setAnalysisLoading(false);
                  }
                }}
              >
                {analysisLoading ? "分析中…" : "深度分析"}
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={async () => {
                  const name = result?.outcomeName ?? "";
                  const summary = result?.outcomeSummary ? `${name} — ${result.outcomeSummary}` : name;
                  if (navigator.share) {
                    await navigator.share({
                      title: result?.quizName || "我的测验结果",
                      text: summary || `我的结果是：${name}`,
                      url: window.location.href,
                    });
                    return;
                  }
                  await navigator.clipboard.writeText(window.location.href);
                }}
              >
                分享结果
              </Button>
            </div>

            {!resultLoading && result && result.deepAnalysisAvailable && (
              <div className="mt-2 space-y-2">
                {analysis || analysisLoading || analysisError ? (
                  <p className="text-sm font-medium text-zinc-800">AI 深度分析</p>
                ) : null}
                {analysisLoading ? <ContentLoading label="正在生成深度分析…" minHeightClassName="min-h-[4rem]" /> : null}
                {analysisError ? <p className="text-sm text-danger">{analysisError}</p> : null}
                {analysis ? (
                  <div className="rounded-xl border border-violet-200/80 bg-violet-50/60 px-4 py-3 text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">
                    {analysis}
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </QuizPageShell>
  );
}

export default function QuizResultPage() {
  return (
    <Suspense fallback={<QuizPageFallback text="结果页加载中..." />}>
      <QuizResultContent />
    </Suspense>
  );
}
