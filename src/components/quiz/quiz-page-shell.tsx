import { Loader2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type QuizPageShellProps = {
  children: ReactNode;
  maxWidthClassName?: string;
  className?: string;
  vibrant?: boolean;
  /** 覆盖整页背景（如测验结果页 `resultConfig.bgColor` 渐变） */
  backgroundStyle?: CSSProperties;
};

export function QuizPageShell({
  children,
  maxWidthClassName = "max-w-xl",
  className,
  vibrant = false,
  backgroundStyle,
}: QuizPageShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen p-4",
        !backgroundStyle &&
          (vibrant
            ? "bg-gradient-to-br from-indigo-100 via-violet-50 to-cyan-100"
            : "bg-gradient-to-b from-indigo-50 to-surface-muted"),
        className,
      )}
      style={backgroundStyle}
    >
      <div className={cn("mx-auto space-y-4", maxWidthClassName)}>{children}</div>
    </div>
  );
}

export function QuizPageFallback({ text }: { text: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 p-4 text-sm text-zinc-600" role="status" aria-busy="true">
      <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden />
      <span>{text}</span>
    </div>
  );
}
