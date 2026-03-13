"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Repeat, X } from "lucide-react";
import { cn, TASK_CATEGORY_LABELS } from "@/lib/utils";
import type { WarRoomTaskWithRelations, Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Sin repetición" },
  { value: "daily", label: "Diaria" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
];

const taskSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional(),
  priority: z.enum(["baja", "media", "alta", "urgente"]),
  category: z.string().min(1, "La categoría es obligatoria"),
  custom_category: z.string().optional(),
  due_date: z.date().optional(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]),
  assigned_to: z.string().optional(),
  related_client_name: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface WarRoomTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: WarRoomTaskWithRelations | null;
  profiles: Profile[];
  onSave: (data: any) => void;
  saving: boolean;
}

export default function WarRoomTaskDialog({
  open,
  onOpenChange,
  task,
  profiles,
  onSave,
  saving,
}: WarRoomTaskDialogProps) {
  const isEdit = !!task;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "media",
      category: "general",
      custom_category: "",
      due_date: undefined,
      recurrence: "none",
      assigned_to: "",
      related_client_name: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (task) {
        const knownCategories = ["seguimiento_pago", "firma_contrato", "anticipo_pendiente", "liberacion", "logistica", "documentos", "produccion", "general"];
        const isKnown = knownCategories.includes(task.category ?? "general");
        form.reset({
          title: task.title,
          description: task.description ?? "",
          priority: (task.priority as TaskFormValues["priority"]) ?? "media",
          category: isKnown ? (task.category ?? "general") : "otro",
          custom_category: isKnown ? "" : (task.category ?? ""),
          due_date: task.due_date ? parseISO(task.due_date.substring(0, 10)) : undefined,
          recurrence: (task.recurrence as TaskFormValues["recurrence"]) ?? "none",
          assigned_to: task.assigned_to ?? "",
          related_client_name: task.related_client_name ?? "",
        });
      } else {
        form.reset({
          title: "",
          description: "",
          priority: "media",
          category: "general",
          custom_category: "",
          due_date: undefined,
          recurrence: "none",
          assigned_to: "",
          related_client_name: "",
        });
      }
    }
  }, [open, task, form]);

  const watchCategory = form.watch("category");
  const watchRecurrence = form.watch("recurrence");

  function handleSubmit(values: TaskFormValues) {
    const finalCategory = values.category === "otro"
      ? (values.custom_category?.trim() || "otro")
      : values.category;

    onSave({
      title: values.title,
      description: values.description || null,
      priority: values.priority,
      category: finalCategory,
      due_date: values.due_date
        ? format(values.due_date, "yyyy-MM-dd")
        : null,
      recurrence: values.recurrence,
      related_client_name: values.related_client_name || null,
      assigned_to: values.assigned_to || null,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Glass backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />

      {/* Glass card */}
      <div className="relative w-full max-w-[520px] mx-4 rounded-3xl border border-white/30 bg-white/85 backdrop-blur-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-gradient-to-r from-[#0B5394] via-[#3B82F6] to-[#7C5CFC]" />

        {/* Close button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/60 hover:bg-white/90 text-[#6B7080] hover:text-[#18191D] transition-all duration-200 hover:rotate-90"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-[17px] font-bold text-[#18191D]">
            {isEdit ? "Editar Tarea" : "Nueva Tarea"}
          </h2>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="px-6 pb-6 space-y-4"
          >
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                    Título
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre de la tarea"
                      className="rounded-xl border-[#E8E6E1] focus:border-[#0B5394] focus:ring-[#0B5394]/10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                    Descripción
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalles adicionales (opcional)"
                      rows={2}
                      className="rounded-xl border-[#E8E6E1] resize-none focus:border-[#0B5394] focus:ring-[#0B5394]/10"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Priority + Category row */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                      Prioridad
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-[#E8E6E1]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="baja">Baja</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                      Categoría
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-[#E8E6E1]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TASK_CATEGORY_LABELS).map(
                          ([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Custom category */}
            {watchCategory === "otro" && (
              <FormField
                control={form.control}
                name="custom_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                      Especificar Categoría
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Escribe la categoría personalizada"
                        className="rounded-xl border-[#E8E6E1] focus:border-[#0B5394] focus:ring-[#0B5394]/10"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {/* Due Date + Recurrence row */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                      Fecha de Vencimiento
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal rounded-xl border-[#E8E6E1] h-9",
                              !field.value && "text-[#9CA3B4]"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-[#9CA3B4]" />
                            {field.value
                              ? format(field.value, "d MMM yyyy", { locale: es })
                              : "Seleccionar"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                      Repetición
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className={cn(
                          "rounded-xl border-[#E8E6E1]",
                          field.value !== "none" && "border-[#0B5394]/30 bg-[#E8F0FE]/30"
                        )}>
                          <div className="flex items-center gap-1.5">
                            {field.value !== "none" && (
                              <Repeat className="h-3 w-3 text-[#0B5394]" />
                            )}
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RECURRENCE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {watchRecurrence !== "none" && (
                      <p className="text-[10px] text-[#0B5394] mt-1 flex items-center gap-1">
                        <Repeat className="h-2.5 w-2.5" />
                        Se repetirá {watchRecurrence === "daily" ? "cada día" : watchRecurrence === "weekly" ? "cada semana" : "cada mes"}
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            {/* Assigned To + Client row */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                      Asignado a
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-[#E8E6E1]">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {profiles.map((p) => (
                          <SelectItem key={p.id} value={p.id!}>
                            {p.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="related_client_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                      Cliente
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Cliente relacionado"
                        className="rounded-xl border-[#E8E6E1] focus:border-[#0B5394] focus:ring-[#0B5394]/10"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl border-[#E8E6E1] text-[#6B7080] hover:bg-[#FAF9F7]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-b from-[#0B5394] to-[#094276] hover:from-[#094276] hover:to-[#07325A] text-white font-semibold shadow-sm"
              >
                {saving
                  ? "Guardando..."
                  : isEdit
                  ? "Guardar Cambios"
                  : "Crear Tarea"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
