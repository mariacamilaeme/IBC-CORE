"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { cn, REMINDER_TYPE_LABELS, REMINDER_LEAD_OPTIONS } from "@/lib/utils";
import type { ReminderWithRelations, Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

const reminderSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional(),
  type: z.enum([
    "pago",
    "contrato",
    "anticipo",
    "liberacion",
    "motonave",
    "produccion",
    "custom",
  ]),
  priority: z.enum(["baja", "media", "alta", "urgente"]),
  due_date: z.date({ error: "La fecha de vencimiento es obligatoria" }),
  lead_option: z.string().optional(),
  frequency: z.enum(["once", "daily", "weekly", "monthly"]),
  assigned_to: z.string().optional(),
  send_email: z.boolean(),
  email_recipient: z.string().optional(),
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

const FREQUENCY_LABELS: Record<string, string> = {
  once: "Una vez",
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
};

interface WarRoomReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: ReminderWithRelations | null;
  profiles: Profile[];
  onSave: (data: any) => void;
  saving: boolean;
}

export default function WarRoomReminderDialog({
  open,
  onOpenChange,
  reminder,
  profiles,
  onSave,
  saving,
}: WarRoomReminderDialogProps) {
  const isEdit = !!reminder;

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "custom",
      priority: "media",
      due_date: undefined as unknown as Date,
      lead_option: "same_day",
      frequency: "once",
      assigned_to: "",
      send_email: false,
      email_recipient: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (reminder) {
        // Try to detect the lead option from the reminder's remind_at and due_date
        let detectedLead = "same_day";
        if (reminder.remind_at && reminder.due_date) {
          const dueMs = new Date(reminder.due_date).getTime();
          const remindMs = new Date(reminder.remind_at).getTime();
          const diffDays = Math.round((dueMs - remindMs) / (1000 * 60 * 60 * 24));
          const match = REMINDER_LEAD_OPTIONS.find((o) => o.offset === diffDays);
          if (match) detectedLead = match.value;
        }

        form.reset({
          title: reminder.title,
          description: reminder.description ?? "",
          type:
            (reminder.type as ReminderFormValues["type"]) ?? "custom",
          priority:
            (reminder.priority as ReminderFormValues["priority"]) ?? "media",
          due_date: reminder.due_date
            ? parseISO(reminder.due_date.substring(0, 10))
            : (undefined as unknown as Date),
          lead_option: detectedLead,
          frequency:
            (reminder.frequency as ReminderFormValues["frequency"]) ?? "once",
          assigned_to: reminder.assigned_to ?? "",
          send_email: reminder.send_email ?? false,
          email_recipient: reminder.email_recipient ?? "",
        });
      } else {
        form.reset({
          title: "",
          description: "",
          type: "custom",
          priority: "media",
          due_date: undefined as unknown as Date,
          lead_option: "same_day",
          frequency: "once",
          assigned_to: "",
          send_email: false,
          email_recipient: "",
        });
      }
    }
  }, [open, reminder, form]);

  const sendEmail = form.watch("send_email");

  function handleSubmit(values: ReminderFormValues) {
    // Compute remind_at from due_date and lead option
    const leadOption = REMINDER_LEAD_OPTIONS.find(
      (o) => o.value === values.lead_option
    );
    const offset = leadOption?.offset ?? 0;
    const remindAt = subDays(values.due_date, offset);

    onSave({
      title: values.title,
      description: values.description || null,
      type: values.type,
      priority: values.priority,
      due_date: format(values.due_date, "yyyy-MM-dd"),
      remind_at: format(remindAt, "yyyy-MM-dd"),
      frequency: values.frequency,
      assigned_to: values.assigned_to || null,
      send_email: values.send_email,
      email_recipient: values.send_email
        ? values.email_recipient || null
        : null,
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
      <div className="relative w-full max-w-[540px] mx-4 rounded-3xl border border-white/30 bg-white/85 backdrop-blur-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-gradient-to-r from-[#DC8B0B] via-[#F97316] to-[#E63946]" />

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
            {isEdit ? "Editar Recordatorio" : "Nuevo Recordatorio"}
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
                      placeholder="Nombre del recordatorio"
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
                      rows={3}
                      className="rounded-xl border-[#E8E6E1] resize-none focus:border-[#0B5394] focus:ring-[#0B5394]/10"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Type + Priority row */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                      Tipo
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-[#E8E6E1]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(REMINDER_TYPE_LABELS).map(
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

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                      Prioridad
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
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
            </div>

            {/* Due Date */}
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
                            "justify-start text-left font-normal rounded-xl border-[#E8E6E1]",
                            !field.value && "text-[#9CA3B4]"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-[#9CA3B4]" />
                          {field.value
                            ? format(field.value, "PPP", { locale: es })
                            : "Seleccionar fecha"}
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Anticipation (Lead Option) */}
            <FormField
              control={form.control}
              name="lead_option"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                    Anticipación
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-xl border-[#E8E6E1]">
                        <SelectValue placeholder="Seleccionar anticipación" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REMINDER_LEAD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Show computed remind_at preview */}
                  {form.watch("due_date") && field.value && (
                    <p className="text-[11px] text-[#9CA3B4] mt-1">
                      Se recordará el{" "}
                      {format(
                        subDays(
                          form.watch("due_date"),
                          REMINDER_LEAD_OPTIONS.find(
                            (o) => o.value === field.value
                          )?.offset ?? 0
                        ),
                        "PPP",
                        { locale: es }
                      )}
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Frequency */}
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                    Frecuencia
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-xl border-[#E8E6E1]">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(FREQUENCY_LABELS).map(
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

            {/* Assigned To */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                    Asignado a
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-xl border-[#E8E6E1]">
                        <SelectValue placeholder="Seleccionar persona" />
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

            {/* Send Email toggle */}
            <FormField
              control={form.control}
              name="send_email"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-[#E8E6E1] px-4 py-3">
                  <FormLabel className="text-[13px] font-medium text-[#18191D] cursor-pointer">
                    Enviar por correo
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Email Recipient (conditional) */}
            {sendEmail && (
              <FormField
                control={form.control}
                name="email_recipient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                      Correo del Destinatario
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        className="rounded-xl border-[#E8E6E1] focus:border-[#0B5394] focus:ring-[#0B5394]/10"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

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
                  : "Crear Recordatorio"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
