"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { QuizPageFallback, QuizPageShell } from "@/components/quiz/quiz-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentLoading } from "@/components/ui/loading-state";
import { postJson } from "@/lib/client-api";

type Question = {
  id: string;
  seq: number;
  content: string;
  options: Array<{
    code?: string;
    key?: string;
    label?: string;
    nextQuestionSeq?: number;
    next_question_seq?: number;
    outcomeCode?: string;
  }>;
};

function QuizPlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const quizId = useMemo(() => searchParams.get("quizId") ?? "", [searchParams]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizType, setQuizType] = useState<string>("score");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<Record<string, unknown>>>([]);
  const [playSettled, setPlaySettled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [playError, setPlayError] = useState("");

  useEffect(() => {
    if (!token || !quizId) {
      setPlaySettled(true);
      setQuestions([]);
      return;
    }
    setPlaySettled(false);
    setPlayError("");
    void postJson<{ questions: Question[]; quiz: { quizType?: string } }>("/api/quiz_play/play", { token, quizId })
      .then((data) => {
        setQuestions(data.questions);
        setQuizType(data.quiz?.quizType ?? "score");
      })
      .catch((err: unknown) => {
        setPlayError(err instanceof Error ? err.message : "题目加载失败");
        setQuestions([]);
      })
      .finally(() => {
        setPlaySettled(true);
      });
  }, [token, quizId]);

  const current = questions[index];
  const playLoading = Boolean(token && quizId) && !playSettled;
  const seqIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    questions.forEach((item, idx) => map.set(item.seq, idx));
    return map;
  }, [questions]);

  const lastIndex = questions.length > 0 ? questions.length - 1 : 0;
  const totalLabel = playLoading || questions.length === 0 ? "…" : `${Math.min(index + 1, questions.length)} / ${questions.length}`;

  return (
    <QuizPageShell>
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl">第 {totalLabel} 题</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token || !quizId ? <p className="text-sm text-danger">缺少 token 或 quizId 参数</p> : null}
          {playError ? <p className="text-sm text-danger">{playError}</p> : null}
          {playLoading ? <ContentLoading label="题目加载中…" minHeightClassName="min-h-[6rem]" /> : null}
          {submitting ? <ContentLoading label="提交中…" minHeightClassName="min-h-[5rem]" /> : null}
          {!playLoading && !submitting && !playError && current ? (
            <>
              <p className="text-base font-medium text-foreground">{current.content}</p>
              <div className="space-y-2">
                {current.options.map((option, optionIndex) => (
                  <Button
                    key={`${option.code ?? "option"}_${optionIndex}`}
                    variant="surface"
                    className="w-full justify-start"
                    onClick={() => {
                      if (submitting) return;
                      const nextAnswers = [
                        ...answers,
                        {
                          questionId: current.id,
                          questionSeq: current.seq,
                          optionCode: option.key ?? option.code ?? String(optionIndex + 1),
                        },
                      ];
                      const nextQuestionSeq = Number(option.nextQuestionSeq ?? option.next_question_seq ?? 0);
                      const isBranchEnd = quizType === "branch" && nextQuestionSeq === -1;
                      if (isBranchEnd || index >= lastIndex) {
                        setSubmitting(true);
                        void postJson<{ resultId: string }>("/api/quiz_play/submit", {
                          token,
                          quizId,
                          answers: nextAnswers,
                        })
                          .then((result) => {
                            router.push(`/quiz/result?token=${token}&resultId=${result.resultId}`);
                          })
                          .catch((err: unknown) => {
                            setSubmitting(false);
                            setPlayError(err instanceof Error ? err.message : "提交失败");
                          });
                        return;
                      }
                      setAnswers(nextAnswers);
                      if (quizType === "branch" && nextQuestionSeq > 0 && seqIndexMap.has(nextQuestionSeq)) {
                        setIndex(seqIndexMap.get(nextQuestionSeq)!);
                      } else {
                        setIndex((prev) => prev + 1);
                      }
                    }}
                  >
                    {option.label ?? option.key ?? option.code ?? `选项 ${optionIndex + 1}`}
                  </Button>
                ))}
              </div>
            </>
          ) : null}
          {!playLoading && !submitting && !playError && !current && playSettled && questions.length === 0 && token && quizId ? (
            <p className="text-sm text-zinc-500">没有题目，请从列表重新进入</p>
          ) : null}
        </CardContent>
      </Card>
    </QuizPageShell>
  );
}

export default function QuizPlayPage() {
  return (
    <Suspense fallback={<QuizPageFallback text="答题页加载中…" />}>
      <QuizPlayContent />
    </Suspense>
  );
}
