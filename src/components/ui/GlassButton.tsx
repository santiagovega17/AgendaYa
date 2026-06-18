import { cn } from "@/lib/utils/cn";

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function GlassButton({
  children,
  className,
  variant = "primary",
  size = "md",
  disabled,
  ...props
}: GlassButtonProps) {
  const variants = {
    primary:
      "bg-indigo-500/80 hover:bg-indigo-500 text-white border-indigo-400/30",
    secondary:
      "bg-white/10 hover:bg-white/20 text-white border-white/20",
    ghost: "bg-transparent hover:bg-white/10 text-white border-transparent",
    danger: "bg-red-500/70 hover:bg-red-500 text-white border-red-400/30",
  };

  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-5 text-base",
    lg: "h-12 px-6 text-base min-h-[48px]",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border font-medium transition-all",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
