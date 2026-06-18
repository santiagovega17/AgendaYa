"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { GlassButton } from "./GlassButton";

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "default" | "critical";
}

export function GlassModal({
  open,
  onClose,
  title,
  children,
  footer,
  variant = "default",
}: GlassModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl border bg-white/10 p-6 shadow-2xl backdrop-blur-xl",
          variant === "critical" ? "border-red-400/40" : "border-white/20"
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <div className="text-white/80">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ModalActions({
  onCancel,
  onConfirm,
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar",
  confirmVariant = "primary" as "primary" | "danger",
}: {
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
}) {
  return (
    <>
      <GlassButton variant="ghost" onClick={onCancel}>
        {cancelLabel}
      </GlassButton>
      <GlassButton variant={confirmVariant} onClick={onConfirm}>
        {confirmLabel}
      </GlassButton>
    </>
  );
}
