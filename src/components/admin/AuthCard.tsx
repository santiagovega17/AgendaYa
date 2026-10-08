import { BrandMark } from "@/components/admin/AdminNav";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <BrandMark href="/" />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm space-y-4">
          <Card className="shadow-soft-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{title}</CardTitle>
              {description && <CardDescription className="text-base">{description}</CardDescription>}
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
          {footer}
        </div>
      </main>
    </div>
  );
}
