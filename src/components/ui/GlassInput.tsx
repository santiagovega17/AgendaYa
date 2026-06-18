import { cn } from "@/lib/utils/cn";

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function GlassInput({ label, error, className, id, ...props }: GlassInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-white/80">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-base text-white",
          "placeholder:text-white/40 backdrop-blur-md",
          "focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/30",
          error && "border-red-400/50",
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
