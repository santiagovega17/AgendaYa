"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { GlassTextarea } from "@/components/ui/GlassTextarea";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { GlassModal, ModalActions } from "@/components/ui/GlassModal";
import { useAgendaStore } from "@/store/useAgendaStore";
import { useToast } from "@/components/ui/Toast";
import type { EventType, Modality } from "@/lib/types";

const emptyForm = {
  nombre: "",
  duracionMin: 30,
  modalidad: "presencial" as Modality,
  confirmacionAuto: true,
  descripcion: "",
};

export default function EventosPage() {
  const eventTypes = useAgendaStore((s) => s.eventTypes);
  const addEventType = useAgendaStore((s) => s.addEventType);
  const updateEventType = useAgendaStore((s) => s.updateEventType);
  const toggleEventType = useAgendaStore((s) => s.toggleEventType);
  const deleteEventType = useAgendaStore((s) => s.deleteEventType);
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EventType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (evt: EventType) => {
    setEditing(evt);
    setForm({
      nombre: evt.nombre,
      duracionMin: evt.duracionMin,
      modalidad: evt.modalidad,
      confirmacionAuto: evt.confirmacionAuto,
      descripcion: evt.descripcion,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.nombre.trim()) {
      toast("El nombre es obligatorio.", "error");
      return;
    }
    if (form.duracionMin <= 0) {
      toast("La duración debe ser mayor a 0.", "error");
      return;
    }
    const duplicate = eventTypes.some(
      (e) => e.nombre.toLowerCase() === form.nombre.toLowerCase() && e.id !== editing?.id
    );
    if (duplicate) {
      toast("Ya existe un evento con ese nombre.", "error");
      return;
    }

    if (editing) {
      updateEventType(editing.id, { ...form, activo: editing.activo });
      toast("Evento actualizado.", "success");
    } else {
      addEventType({ ...form, activo: true });
      toast("Evento creado.", "success");
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const ok = deleteEventType(deleteId);
    if (ok) {
      toast("Evento eliminado.", "success");
    } else {
      toast("No se puede eliminar: tiene reservas asociadas.", "error");
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tipos de evento</h1>
        <GlassButton onClick={openCreate}>
          <Plus size={18} />
          Nuevo evento
        </GlassButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {eventTypes.map((evt) => (
          <GlassCard key={evt.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white">{evt.nombre}</h3>
                <p className="text-sm text-white/50">{evt.duracionMin} min · {evt.modalidad}</p>
              </div>
              <button onClick={() => toggleEventType(evt.id)} className="text-white/60">
                {evt.activo ? <ToggleRight className="text-emerald-400" /> : <ToggleLeft />}
              </button>
            </div>
            <p className="flex-1 text-sm text-white/60">{evt.descripcion}</p>
            <div className="flex gap-2">
              <GlassButton variant="secondary" size="sm" onClick={() => openEdit(evt)}>
                <Pencil size={14} />
                Editar
              </GlassButton>
              <GlassButton variant="ghost" size="sm" onClick={() => setDeleteId(evt.id)}>
                <Trash2 size={14} />
              </GlassButton>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar evento" : "Nuevo evento"}
        footer={
          <ModalActions
            onCancel={() => setModalOpen(false)}
            onConfirm={handleSave}
            confirmLabel="Guardar"
          />
        }
      >
        <div className="space-y-4">
          <GlassInput
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <GlassInput
            label="Duración (minutos)"
            type="number"
            min={1}
            value={form.duracionMin}
            onChange={(e) => setForm({ ...form, duracionMin: Number(e.target.value) })}
          />
          <GlassSelect
            label="Modalidad"
            value={form.modalidad}
            onChange={(e) => setForm({ ...form, modalidad: e.target.value as Modality })}
            options={[
              { value: "presencial", label: "Presencial" },
              { value: "virtual", label: "Virtual" },
              { value: "ambas", label: "Ambas" },
            ]}
          />
          <GlassSelect
            label="Confirmación"
            value={form.confirmacionAuto ? "auto" : "manual"}
            onChange={(e) => setForm({ ...form, confirmacionAuto: e.target.value === "auto" })}
            options={[
              { value: "auto", label: "Automática" },
              { value: "manual", label: "Manual" },
            ]}
          />
          <GlassTextarea
            label="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
        </div>
      </GlassModal>

      <GlassModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Eliminar evento"
        variant="critical"
        footer={
          <ModalActions
            onCancel={() => setDeleteId(null)}
            onConfirm={handleDelete}
            confirmLabel="Eliminar"
            confirmVariant="danger"
          />
        }
      >
        <p>¿Estás seguro de que querés eliminar este tipo de evento?</p>
      </GlassModal>
    </div>
  );
}
