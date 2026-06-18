import { cn } from "@/lib/utils/cn";

interface GlassTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  showCount?: boolean;
  maxLength?: number;
}

export function GlassTextarea({
  label,
  error,
  showCount,
  maxLength,
  className,
  value,
  id,
  ...props
}: GlassTextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");
  const count = typeof value === "string" ? value.length : 0;
  const atLimit = maxLength ? count >= maxLength : false;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-white/80">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        maxLength={maxLength}
        value={value}
        className={cn(
          "min-h-[100px] w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white",
          "placeholder:text-white/40 backdrop-blur-md resize-none",
          "focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/30",
          error && "border-red-400/50",
          className
        )}
        {...props}
      />
      <div className="flex justify-between">
        {error && <p className="text-sm text-red-300">{error}</p>}
        {showCount && maxLength && (
          <p className={cn("ml-auto text-sm", atLimit ? "text-red-400" : "text-white/50")}>
            {count}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
