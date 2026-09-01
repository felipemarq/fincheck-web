import { cn } from "@/lib/utils";

type PlatformBrandProps = {
  compact?: boolean;
  className?: string;
};

export function PlatformBrand({ compact = false, className }: PlatformBrandProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-emerald-300/20 bg-[#071b17] shadow-[0_0_28px_rgba(16,185,129,0.16)]">
        <svg
          viewBox="0 0 40 40"
          role="img"
          aria-label="MoneyStack"
          className="size-8"
        >
          <path
            d="M7 11.5 20 5l13 6.5L20 18 7 11.5Z"
            fill="#34d399"
          />
          <path
            d="m7 18 13 6.5L33 18v5.5L20 30 7 23.5V18Z"
            fill="#10b981"
            opacity=".82"
          />
          <path
            d="m7 25 13 6.5L33 25v4.5L20 36 7 29.5V25Z"
            fill="#047857"
          />
        </svg>
      </div>
      {!compact && (
        <div className="min-w-0 leading-none">
          <p className="truncate font-semibold tracking-[-0.03em] text-foreground">
            MoneyStack
          </p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-400/80">
            Operacoes
          </p>
        </div>
      )}
    </div>
  );
}
