import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type LoadingIndicatorProps = {
  className?: string;
  label?: ReactNode;
  size?: "sm" | "md";
};

const iconSize = { sm: "size-4", md: "size-5" } as const;

/** 行内/紧凑：按钮内、短行说明 */
export function LoadingIndicator({ className, label, size = "sm" }: LoadingIndicatorProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-sm text-zinc-600", className)}
      role="status"
      aria-busy="true"
    >
      <Loader2 className={cn("shrink-0 animate-spin text-primary", iconSize[size])} aria-hidden />
      {label != null && label !== false ? <span className="min-w-0">{label}</span> : null}
    </span>
  );
}

type ContentLoadingProps = {
  className?: string;
  label?: ReactNode;
  minHeightClassName?: string;
};

/** 区块级居中加载 */
export function ContentLoading({ className, label = "加载中…", minHeightClassName = "min-h-[7rem]" }: ContentLoadingProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 py-8", minHeightClassName, className)}
      role="status"
      aria-busy="true"
    >
      <Loader2 className="size-8 shrink-0 animate-spin text-primary" aria-hidden />
      {label != null && label !== false ? (
        <p className="text-center text-sm text-zinc-600">{label}</p>
      ) : null}
    </div>
  );
}

type SectionLoaderProps = {
  className?: string;
  label?: ReactNode;
};

/** 更紧凑的区块行（如历史子区域） */
export function SectionLoader({ className, label = "加载中…" }: SectionLoaderProps) {
  return (
    <div
      className={cn("flex items-center justify-center gap-2 py-4 text-xs text-zinc-500", className)}
      role="status"
      aria-busy="true"
    >
      <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
