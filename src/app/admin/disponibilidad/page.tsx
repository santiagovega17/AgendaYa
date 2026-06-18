"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { GlassModal, ModalActions } from "@/components/ui/GlassModal";
import { useAgendaStore } from "@/store/useAgendaStore";
import { useToast } from "@/components/ui/Toast";
import type { TimeRange } from "@/lib/types";

const DIAS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const INTERVALOS = [0, 5, 10, 15, 30, 45, 60].map((v) => ({
  value: String(v),
  label: v === 0 ? "Sin intervalo" : `${v} minutos`,
}));

export default function DisponibilidadPage() {
  const weeklySchedules = useAgendaStore((s) => s.weeklySchedules);
  const settings = useAgendaStore((s) => s.settings);
  const setWeeklySchedule = useAgendaStore((s) => s.setWeeklySchedule);
  const removeWeeklySchedule = useAgendaStore((s) => s.removeWeeklySchedule);
  const updateSettings = useAgendaStore((s) => s.updateSettings);
  const { toast } = useToast();

  const [scheduleModal, setScheduleModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    diaSemana: 1,
    inicio: "09:00",
    fin: "18:00",
    tipo: "permanent" as "once" | "permanent",
    fechaInicio: new Date().toISOString().split("T")[0],
  });

  const [localSettings, setLocalSettings] = useState(settings);

  const handleAddSchedule = () => {
    setScheduleModal(true);
  };

  const confirmSchedule = () => {
    const franjas: TimeRange[] = [{ inicio: scheduleForm.inicio, fin: scheduleForm.fin }];
    setWeeklySchedule(
      scheduleForm.diaSemana,
      franjas,
      scheduleForm.tipo,
      scheduleForm.fechaInicio
    );
    toast(
      scheduleForm.tipo === "permanent"
        ? "Horario permanente guardado."
        : "Horario único guardado.",
      "success"
    );
    setScheduleModal(false);
  };

  const handleDeleteSchedule = () => {
    if (!deleteModal) return;
    const ok = removeWeeklySchedule(deleteModal);
    if (ok) {
      toast("Horario eliminado.", "success");
    } else {
      toast("No se puede eliminar: hay reservas en ese día.", "error");
    }
    setDeleteModal(null);
  };

  const saveSettings = () => {
    updateSettings(localSettings);
    toast("Configuración actualizada. Los slots públicos se recalcularon.", "success");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Disponibilidad</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Horario laboral</h2>
            <GlassButton size="sm" onClick={handleAddSchedule}>
              <Plus size={16} />
              Agregar
            </GlassButton>
          </div>
          <div className="space-y-2">
            {weeklySchedules.length === 0 && (
              <p className="text-sm text-white/50">No hay horarios configurados.</p>
            )}
            {weeklySchedules.map((sched) => {
              const dia = DIAS.find((d) => d.value === sched.diaSemana)?.label ?? "";
              return (
                <div
                  key={sched.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{dia}</p>
                    <p className="text-xs text-white/50">
                      {sched.franjas.map((f) => `${f.inicio}–${f.fin}`).join(", ")} ·{" "}
                      {sched.tipo === "permanent" ? "Permanente" : "Única vez"}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteModal(sched.id)}
                    className="text-white/40 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="space-y-4">
          <h2 className="font-semibold text-white">Configuración de turnos</h2>
          <GlassSelect
            label="Intervalo entre turnos"
            value={String(localSettings.intervaloMin)}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, intervaloMin: Number(e.target.value) })
            }
            options={INTERVALOS}
          />
          <GlassInput
            label="Antelación mínima (horas)"
            type="number"
            min={0}
            value={localSettings.antelacionMinHoras}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, antelacionMinHoras: Number(e.target.value) })
            }
          />
          <GlassInput
            label="Antelación máxima (días)"
            type="number"
            min={1}
            value={localSettings.antelacionMaxDias}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, antelacionMaxDias: Number(e.target.value) })
            }
          />
          <GlassInput
            label="Límite de reservas por actividad/día"
            type="number"
            min={1}
            value={localSettings.limiteReservasDia}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, limiteReservasDia: Number(e.target.value) })
            }
          />
          <GlassButton onClick={saveSettings}>Guardar configuración</GlassButton>
        </GlassCard>
      </div>

      <GlassModal
        open={scheduleModal}
        onClose={() => setScheduleModal(false)}
        title="Agregar horario"
        footer={
          <ModalActions
            onCancel={() => setScheduleModal(false)}
            onConfirm={confirmSchedule}
            confirmLabel="Guardar"
          />
        }
      >
        <div className="space-y-4">
          <GlassSelect
            label="Día"
            value={String(scheduleForm.diaSemana)}
            onChange={(e) =>
              setScheduleForm({ ...scheduleForm, diaSemana: Number(e.target.value) })
            }
            options={DIAS.map((d) => ({ value: String(d.value), label: d.label }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <GlassInput
              label="Inicio"
              type="time"
              value={scheduleForm.inicio}
              onChange={(e) => setScheduleForm({ ...scheduleForm, inicio: e.target.value })}
            />
            <GlassInput
              label="Fin"
              type="time"
              value={scheduleForm.fin}
              onChange={(e) => setScheduleForm({ ...scheduleForm, fin: e.target.value })}
            />
          </div>
          <GlassSelect
            label="Tipo"
            value={scheduleForm.tipo}
            onChange={(e) =>
              setScheduleForm({
                ...scheduleForm,
                tipo: e.target.value as "once" | "permanent",
              })
            }
            options={[
              { value: "permanent", label: "Permanente" },
              { value: "once", label: "Única vez" },
            ]}
          />
          {scheduleForm.tipo === "once" && (
            <GlassInput
              label="Fecha"
              type="date"
              value={scheduleForm.fechaInicio}
              onChange={(e) =>
                setScheduleForm({ ...scheduleForm, fechaInicio: e.target.value })
              }
            />
          )}
        </div>
      </GlassModal>

      <GlassModal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Eliminar horario"
        variant="critical"
        footer={
          <ModalActions
            onCancel={() => setDeleteModal(null)}
            onConfirm={handleDeleteSchedule}
            confirmLabel="Eliminar"
            confirmVariant="danger"
          />
        }
      >
        <p>¿Eliminar este horario? Si hay reservas asociadas, no se podrá eliminar.</p>
      </GlassModal>
    </div>
  );
}
