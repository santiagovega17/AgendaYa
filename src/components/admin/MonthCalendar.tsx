"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { GlassButton } from "@/components/ui/GlassButton";

interface MonthCalendarProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  getDayStatus?: (date: string) => "available" | "blocked" | "has-bookings" | "empty";
  disabledDates?: string[];
}

const statusColors = {
  available: "hover:bg-indigo-500/30 text-white",
  blocked: "bg-red-500/30 text-red-200",
  "has-bookings": "bg-emerald-500/30 text-emerald-200",
  empty: "text-white/30",
};

export function MonthCalendar({
  currentMonth,
  onMonthChange,
  selectedDate,
  onSelectDate,
  getDayStatus,
  disabledDates = [],
}: MonthCalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <GlassButton
          variant="ghost"
          size="sm"
          onClick={() => onMonthChange(addMonths(currentMonth, -1))}
        >
          <ChevronLeft size={18} />
        </GlassButton>
        <h3 className="font-semibold text-white capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h3>
        <GlassButton
          variant="ghost"
          size="sm"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
        >
          <ChevronRight size={18} />
        </GlassButton>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((d) => (
          <div key={d} className="py-1 text-xs font-medium text-white/50">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, currentMonth);
          const status = getDayStatus?.(dateStr) ?? "available";
          const isSelected = selectedDate === dateStr;
          const isDisabled = disabledDates.includes(dateStr);

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!inMonth || isDisabled}
              onClick={() => onSelectDate?.(dateStr)}
              className={cn(
                "aspect-square rounded-lg text-sm transition-colors",
                !inMonth && "invisible",
                inMonth && statusColors[status],
                isSelected && "ring-2 ring-indigo-400",
                isDisabled && "cursor-not-allowed opacity-30"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function getDayStatusHelper(
  dateStr: string,
  blockedDates: string[],
  bookingDates: string[]
): "available" | "blocked" | "has-bookings" | "empty" {
  if (blockedDates.includes(dateStr)) return "blocked";
  if (bookingDates.includes(dateStr)) return "has-bookings";
  return "available";
}
