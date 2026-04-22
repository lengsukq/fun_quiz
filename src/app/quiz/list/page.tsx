"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { DataListPanel } from "@/components/admin/data-list-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    </AdminShell>
  );
}
