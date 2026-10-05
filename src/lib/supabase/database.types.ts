// Generado a partir del esquema de Supabase. Regenerar tras cada migración.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bloqueos_turno: {
        Row: {
          admin_id: string
          created_at: string
          expira_at: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          session_id: string
          tipo_evento_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          expira_at?: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          session_id: string
          tipo_evento_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          expira_at?: string
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          session_id?: string
          tipo_evento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloqueos_turno_tipo_evento_id_admin_id_fkey"
            columns: ["tipo_evento_id", "admin_id"]
            isOneToOne: false
            referencedRelation: "tipos_evento"
            referencedColumns: ["id", "admin_id"]
          },
        ]
      }
      configuracion_reservas: {
        Row: {
          admin_id: string
          antelacion_max_dias: number
          antelacion_min_horas: number
          intervalo_min: number
          limite_reservas_dia: number
          updated_at: string
        }
        Insert: {
          admin_id: string
          antelacion_max_dias?: number
          antelacion_min_horas?: number
          intervalo_min?: number
          limite_reservas_dia?: number
          updated_at?: string
        }
        Update: {
          admin_id?: string
          antelacion_max_dias?: number
          antelacion_min_horas?: number
          intervalo_min?: number
          limite_reservas_dia?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_reservas_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dias_bloqueados: {
        Row: {
          admin_id: string
          created_at: string
          fecha: string
          motivo: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          fecha: string
          motivo?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          fecha?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dias_bloqueados_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      franjas_horarias: {
        Row: {
          hora_fin: string
          hora_inicio: string
          horario_id: string
          id: string
        }
        Insert: {
          hora_fin: string
          hora_inicio: string
          horario_id: string
          id?: string
        }
        Update: {
          hora_fin?: string
          hora_inicio?: string
          horario_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "franjas_horarias_horario_id_fkey"
            columns: ["horario_id"]
            isOneToOne: false
            referencedRelation: "horarios_semanales"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios_semanales: {
        Row: {
          admin_id: string
          created_at: string
          dia_semana: number
          fecha_inicio: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_horario"]
        }
        Insert: {
          admin_id: string
          created_at?: string
          dia_semana: number
          fecha_inicio?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_horario"]
        }
        Update: {
          admin_id?: string
          created_at?: string
          dia_semana?: number
          fecha_inicio?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_horario"]
        }
        Relationships: [
          {
            foreignKeyName: "horarios_semanales_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          admin_id: string
          asunto: string | null
          canal: Database["public"]["Enums"]["canal_notificacion"]
          created_at: string
          destinatario: string
          enviada_at: string | null
          id: string
          leida: boolean
          mensaje: string
          reserva_id: string | null
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
        }
        Insert: {
          admin_id: string
          asunto?: string | null
          canal: Database["public"]["Enums"]["canal_notificacion"]
          created_at?: string
          destinatario: string
          enviada_at?: string | null
          id?: string
          leida?: boolean
          mensaje: string
          reserva_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
        }
        Update: {
          admin_id?: string
          asunto?: string | null
          canal?: Database["public"]["Enums"]["canal_notificacion"]
          created_at?: string
          destinatario?: string
          enviada_at?: string | null
          id?: string
          leida?: boolean
          mensaje?: string
          reserva_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_notificacion"]
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          created_at: string
          email: string
          foto_url: string | null
          id: string
          nombre: string
          slug: string
          updated_at: string
          zona_horaria: string
        }
        Insert: {
          created_at?: string
          email: string
          foto_url?: string | null
          id: string
          nombre: string
          slug: string
          updated_at?: string
          zona_horaria?: string
        }
        Update: {
          created_at?: string
          email?: string
          foto_url?: string | null
          id?: string
          nombre?: string
          slug?: string
          updated_at?: string
          zona_horaria?: string
        }
        Relationships: []
      }
      plantillas_notificacion: {
        Row: {
          admin_id: string
          asunto: string
          cuerpo: string
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
          updated_at: string
        }
        Insert: {
          admin_id: string
          asunto: string
          cuerpo: string
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
          updated_at?: string
        }
        Update: {
          admin_id?: string
          asunto?: string
          cuerpo?: string
          tipo?: Database["public"]["Enums"]["tipo_notificacion"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantillas_notificacion_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          admin_id: string
          cancelada_at: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_reserva"]
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          invitado_apellido: string
          invitado_email: string
          invitado_nombre: string
          invitado_nota: string | null
          invitado_telefono: string
          numero_reserva: string
          tipo_evento_id: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          cancelada_at?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_reserva"]
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          invitado_apellido: string
          invitado_email: string
          invitado_nombre: string
          invitado_nota?: string | null
          invitado_telefono: string
          numero_reserva?: string
          tipo_evento_id: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          cancelada_at?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_reserva"]
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          invitado_apellido?: string
          invitado_email?: string
          invitado_nombre?: string
          invitado_nota?: string | null
          invitado_telefono?: string
          numero_reserva?: string
          tipo_evento_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_tipo_evento_id_admin_id_fkey"
            columns: ["tipo_evento_id", "admin_id"]
            isOneToOne: false
            referencedRelation: "tipos_evento"
            referencedColumns: ["id", "admin_id"]
          },
        ]
      }
      tipos_evento: {
        Row: {
          activo: boolean
          admin_id: string
          confirmacion_auto: boolean
          created_at: string
          descripcion: string
          duracion_min: number
          id: string
          limite_reservas_dia: number | null
          modalidad: Database["public"]["Enums"]["modalidad"]
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          admin_id: string
          confirmacion_auto?: boolean
          created_at?: string
          descripcion?: string
          duracion_min: number
          id?: string
          limite_reservas_dia?: number | null
          modalidad?: Database["public"]["Enums"]["modalidad"]
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          admin_id?: string
          confirmacion_auto?: boolean
          created_at?: string
          descripcion?: string
          duracion_min?: number
          id?: string
          limite_reservas_dia?: number | null
          modalidad?: Database["public"]["Enums"]["modalidad"]
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipos_evento_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bloquear_dia: {
        Args: {
          p_cancelar_reservas?: boolean
          p_fecha: string
          p_motivo?: string
        }
        Returns: Json
      }
      bloquear_turno: {
        Args: {
          p_fecha: string
          p_hora_inicio: string
          p_session_id: string
          p_tipo_evento_id: string
        }
        Returns: string
      }
      confirmar_reserva: {
        Args: {
          p_apellido: string
          p_email: string
          p_fecha: string
          p_hora_inicio: string
          p_nombre: string
          p_nota?: string
          p_session_id: string
          p_telefono: string
          p_tipo_evento_id: string
        }
        Returns: Json
      }
      liberar_turnos: { Args: { p_session_id: string }; Returns: undefined }
      turnos_ocupados: {
        Args: {
          p_admin_id: string
          p_desde: string
          p_hasta: string
          p_session_id?: string
        }
        Returns: {
          es_propio: boolean
          expira_at: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          origen: string
          tipo_evento_id: string
        }[]
      }
    }
    Enums: {
      canal_notificacion: "email" | "interno"
      estado_reserva: "pendiente" | "confirmada" | "completada" | "cancelada"
      modalidad: "presencial" | "virtual" | "ambas"
      tipo_horario: "unica_vez" | "permanente"
      tipo_notificacion:
        | "reserva_confirmada"
        | "reserva_pendiente"
        | "reserva_cancelada"
        | "reserva_reagendada"
        | "recordatorio"
        | "bloqueo_dia"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
