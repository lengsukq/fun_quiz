"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { DataListPanel } from "@/components/admin/data-list-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { ContentLoading } from "@/components/ui/loading-state";
import { postJson } from "@/lib/client-api";

type QuizItem = {
  id: string;
  name: string;
  code: string;
  status: string;
  quizType: string;
};

export default function QuizListPage() {
  const [list, setList] = useState<QuizItem[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiQuizType, setAiQuizType] = useState<"score" | "vector" | "branch" | "random">("score");
  const [aiPreview, setAiPreview] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  async function load() {
    setListLoading(true);
    try {
      const data = await postJson<{ list: QuizItem[] }>("/api/quiz/page");
      setList(data.list);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminShell>
      <DataListPanel
        title="测验管理"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="surface" onClick={() => setAiOpen(true)}>
              AI 生成测验
            </Button>
            <Button
              variant="surface"
              loading={publishing}
              onClick={async () => {
                if (!window.confirm("将把所有 draft 状态测验发布为 published，继续吗？")) return;
                setPublishing(true);
                try {
                  const result = await postJson<{ published: number }>("/api/quiz/publish_all");
                  await load();
                  window.alert(`发布完成：共发布 ${result.published} 个测验`);
                } catch (error) {
                  const message = error instanceof Error ? error.message : "发布失败";
                  window.alert(message);
                } finally {
                  setPublishing(false);
                }
              }}
            >
              一键发布草稿
            </Button>
            <Button
              variant="surface"
              loading={seeding}
              onClick={async () => {
                if (!window.confirm("将从 python/doc/generated 导入题库（已存在 code 会被更新），继续吗？")) return;
                setSeeding(true);
                try {
                  const result = await postJson<{
                    total: number;
                    imported: number;
                    skipped: number;
                    failed: Array<{ file: string; reason: string }>;
                  }>("/api/system/seed_quizzes");
                  await load();
                  const firstError = result.failed[0];
                  const message = firstError
                    ? `导入完成：成功 ${result.imported}/${result.total}，跳过 ${result.skipped}。首个失败：${firstError.file} (${firstError.reason})`
                    : `导入完成：成功 ${result.imported}/${result.total}，跳过 ${result.skipped}`;
                  window.alert(message);
                } catch (error) {
                  const message = error instanceof Error ? error.message : "导入失败";
                  window.alert(message);
                } finally {
                  setSeeding(false);
                }
              }}
            >
              一键导入题库
            </Button>
            <Button
              loading={createLoading}
              onClick={async () => {
                setCreateLoading(true);
                try {
                  const created = await postJson<{ id: string }>("/api/quiz/edit", {
                    name: name || "新测验",
                    code: code || `quiz_${Date.now()}`,
                    status: "draft",
                  });
                  await load();
                  window.location.href = `/quiz/detail?id=${created.id}`;
                } catch (error) {
                  const message = error instanceof Error ? error.message : "创建失败";
                  window.alert(message);
                } finally {
                  setCreateLoading(false);
                }
              }}
            >
              新建测验
            </Button>
          </div>
        }
        filters={
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="测验名称" value={name} onChange={(event) => setName(event.target.value)} />
            <Input placeholder="测验编码" value={code} onChange={(event) => setCode(event.target.value)} />
          </div>
        }
        headers={["名称", "编码", "类型", "状态", "操作"]}
      >
        {listLoading ? (
          <TableRow>
            <TableCell colSpan={5}>
              <ContentLoading label="加载列表中…" className="py-4" minHeightClassName="min-h-0" />
            </TableCell>
          </TableRow>
        ) : (
          list.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.code}</TableCell>
              <TableCell>{item.quizType}</TableCell>
              <TableCell>
                <Badge variant={item.status === "published" ? "success" : "outline"}>{item.status}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Link href={`/quiz/detail?id=${item.id}`}>
                    <Button size="sm" variant="surface">
                      编辑
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      await postJson("/api/quiz/delete", { quizId: item.id });
                      await load();
                    }}
                  >
                    删除
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </DataListPanel>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>AI 生成测验</DialogTitle>
            <DialogDescription>依赖服务端 LLM_* 配置。可先预览 JSON，确认后再写入题库。</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[50dvh] flex-col gap-3 overflow-y-auto px-1">
            <label className="text-xs font-medium text-zinc-500">题型</label>
            <select
              className="rounded-xl border border-border/60 bg-surface px-3 py-2 text-sm"
              value={aiQuizType}
              onChange={(e) => setAiQuizType(e.target.value as typeof aiQuizType)}
            >
              <option value="score">score（累分）</option>
              <option value="vector">vector（向量）</option>
              <option value="branch">branch（分支）</option>
              <option value="random">random（加权随机）</option>
            </select>
            <label className="text-xs font-medium text-zinc-500">需求描述</label>
            <textarea
              className="min-h-[120px] rounded-xl border border-border/60 bg-surface px-3 py-2 text-sm"
              placeholder="例如：5 道生活方式题，3 个结果，轻松幽默风格…"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
            {aiPreview ? (
              <>
                <label className="text-xs font-medium text-zinc-500">预览（definition JSON）</label>
                <pre className="max-h-40 overflow-auto rounded-xl bg-zinc-950/90 p-3 text-xs text-zinc-100">{aiPreview}</pre>
              </>
            ) : null}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="surface"
              loading={aiLoading}
              disabled={!aiPrompt.trim()}
              onClick={async () => {
                setAiLoading(true);
                try {
                  const res = await postJson<{ definition: unknown }>("/api/quiz/ai_generate", {
                    prompt: aiPrompt.trim(),
                    quizType: aiQuizType,
                    persist: false,
                  });
                  setAiPreview(JSON.stringify(res.definition, null, 2));
                } catch (error) {
                  window.alert(error instanceof Error ? error.message : "生成失败");
                } finally {
                  setAiLoading(false);
                }
              }}
            >
              仅预览
            </Button>
            <Button
              loading={aiLoading}
              disabled={!aiPrompt.trim()}
              onClick={async () => {
                if (!window.confirm("将调用大模型并直接写入新测验，继续吗？")) return;
                setAiLoading(true);
                try {
                  const res = await postJson<{ quiz_id: string | null }>("/api/quiz/ai_generate", {
                    prompt: aiPrompt.trim(),
                    quizType: aiQuizType,
                    persist: true,
                  });
                  setAiOpen(false);
                  setAiPrompt("");
                  setAiPreview("");
                  await load();
                  if (res.quiz_id) {
                    window.location.href = `/quiz/detail?id=${res.quiz_id}`;
                  }
                } catch (error) {
                  window.alert(error instanceof Error ? error.message : "保存失败");
                } finally {
                  setAiLoading(false);
                }
              }}
            >
              生成并保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
