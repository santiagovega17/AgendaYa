import { cn } from "@/lib/utils/cn";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: "sm" | "md" | "lg";
}

export function GlassCard({
  children,
  className,
  padding = "md",
  ...props
}: GlassCardProps) {
  const paddingClass = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }[padding];

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-xl",
        paddingClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
