import { cn } from "@/lib/utils/cn";

interface GlassSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function GlassSelect({ label, options, className, id, ...props }: GlassSelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-white/80">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          "h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-base text-white",
          "backdrop-blur-md focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/30",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
