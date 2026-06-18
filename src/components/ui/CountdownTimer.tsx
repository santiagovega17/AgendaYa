"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("00:00");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(
        `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-amber-200">
      <Clock size={16} />
      <span className="text-sm">
        Horario reservado por <strong>{remaining}</strong>
      </span>
    </div>
  );
}
