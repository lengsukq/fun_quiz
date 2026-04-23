"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { List, ListEmpty, ListItem, ListItemActions, ListItemHeader, ListItemMeta, ListItemTitle } from "@/components/ui/list";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/client-api";
import { quizCategoriesForSelect } from "@/lib/quiz-categories";

type QuestionItem = {
  id?: string;
  seq: number;
  content: string;
  options: Array<Record<string, unknown>>;
};

type OutcomeItem = {
  id?: string;
  code: string;
  name: string;
  matchConfig: Record<string, unknown>;
};

function QuizDetailContent() {
  const searchParams = useSearchParams();
  const quizId = useMemo(() => searchParams.get("id") ?? "", [searchParams]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("fun");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeItem[]>([]);

  const load = useCallback(async () => {
    if (!quizId) return;
    const quiz = await postJson<Record<string, unknown>>(`/api/quiz/detail/${quizId}`);
    const questionList = await postJson<QuestionItem[]>(`/api/quiz/questions/${quizId}`);
    const outcomeList = await postJson<OutcomeItem[]>(`/api/quiz/outcomes/${quizId}`);
    setName(String(quiz.name ?? ""));
    setCode(String(quiz.code ?? ""));
    setDescription(String(quiz.description ?? ""));
    setCategory(String(quiz.category ?? "fun"));
    setQuestions(questionList);
    setOutcomes(outcomeList);
  }, [quizId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">测验配置</h1>

        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="测验名称" />
            <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="测验编码" />
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="测验描述" />
            <label className="text-xs font-medium text-zinc-500">分类</label>
            <select
              className="w-full max-w-md rounded-xl border border-border/60 bg-surface px-3 py-2 text-sm"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {quizCategoriesForSelect().map((row) => (
                <option key={row.code} value={row.code}>
                  {row.label}
                </option>
              ))}
            </select>
            <Button
              onClick={async () => {
                await postJson("/api/quiz/edit", {
                  id: quizId,
                  name,
                  code,
                  description,
                  category,
                });
                await load();
              }}
            >
              保存基本信息
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>题目</CardTitle>
            <Button
              variant="surface"
              onClick={() =>
                setQuestions((prev) => [
                  ...prev,
                  {
                    seq: prev.length + 1,
                    content: `题目 ${prev.length + 1}`,
                    options: [
                      { key: "A", label: "选项A", score: 5 },
                      { key: "B", label: "选项B", score: 1 },
                    ],
                  },
                ])
              }
            >
              添加题目
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <List>
              {questions.map((item, index) => (
                <ListItem key={`${item.id ?? "new"}_${index}`}>
                  <ListItemHeader>
                    <div>
                      <ListItemTitle>题目 {index + 1}</ListItemTitle>
                      <ListItemMeta>序号：{item.seq}</ListItemMeta>
                    </div>
                  </ListItemHeader>
                  <ListItemActions className="mt-2">
                    <Input
                      value={item.content}
                      onChange={(event) =>
                        setQuestions((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, content: event.target.value } : row)))
                      }
                      placeholder={`题目 ${index + 1}`}
                    />
                  </ListItemActions>
                </ListItem>
              ))}
              {!questions.length ? <ListEmpty>暂无题目，点击“添加题目”开始配置</ListEmpty> : null}
            </List>
            <Button
              onClick={async () => {
                await postJson("/api/quiz/questions/batch_save", {
                  quizId,
                  questionList: questions,
                });
              }}
            >
              保存题目
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>结果</CardTitle>
            <Button
              variant="surface"
              onClick={() =>
                setOutcomes((prev) => [
                  ...prev,
                  { code: `outcome_${prev.length + 1}`, name: `结果 ${prev.length + 1}`, matchConfig: {} },
                ])
              }
            >
              添加结果
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <List>
              {outcomes.map((item, index) => (
                <ListItem key={`${item.id ?? "new"}_${index}`}>
                  <ListItemHeader>
                    <div>
                      <ListItemTitle>结果 {index + 1}</ListItemTitle>
                      <ListItemMeta>可用于匹配规则与展示文案</ListItemMeta>
                    </div>
                  </ListItemHeader>
                  <ListItemActions className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={item.code}
                      onChange={(event) =>
                        setOutcomes((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, code: event.target.value } : row)))
                      }
                      placeholder="结果编码"
                    />
                    <Input
                      value={item.name}
                      onChange={(event) =>
                        setOutcomes((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, name: event.target.value } : row)))
                      }
                      placeholder="结果名称"
                    />
                  </ListItemActions>
                </ListItem>
              ))}
              {!outcomes.length ? <ListEmpty>暂无结果，点击“添加结果”开始配置</ListEmpty> : null}
            </List>
            <Button
              onClick={async () => {
                await postJson("/api/quiz/outcomes/batch_save", {
                  quizId,
                  outcomeList: outcomes,
                });
              }}
            >
              保存结果
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

export default function QuizDetailPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">页面加载中...</div>}>
      <QuizDetailContent />
    </Suspense>
  );
}
