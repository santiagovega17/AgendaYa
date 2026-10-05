export function StickyActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto w-full max-w-md px-4">{children}</div>
    </div>
  );
}
