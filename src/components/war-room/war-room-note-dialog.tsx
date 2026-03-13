"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { cn, NOTE_COLORS } from "@/lib/utils";
import type { WarRoomNote, NoteColor } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

const noteSchema = z.object({
  content: z.string().min(1, "El contenido es obligatorio"),
  color: z.enum(["default", "blue", "green", "amber", "red", "violet"]),
  linked_date: z.date().optional(),
  pinned: z.boolean(),
});

type NoteFormValues = z.infer<typeof noteSchema>;

const COLOR_OPTIONS: { value: NoteColor; hex: string }[] = [
  { value: "default", hex: "#E8E6E1" },
  { value: "blue", hex: "#3B82F6" },
  { value: "green", hex: "#0D9F6E" },
  { value: "amber", hex: "#DC8B0B" },
  { value: "red", hex: "#E63946" },
  { value: "violet", hex: "#7C5CFC" },
];

interface WarRoomNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: WarRoomNote | null;
  onSave: (data: any) => void;
  saving: boolean;
}

export default function WarRoomNoteDialog({
  open,
  onOpenChange,
  note,
  onSave,
  saving,
}: WarRoomNoteDialogProps) {
  const isEdit = !!note;

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      content: "",
      color: "default",
      linked_date: undefined,
      pinned: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (note) {
        form.reset({
          content: note.content,
          color: (note.color as NoteFormValues["color"]) ?? "default",
          linked_date: note.linked_date
            ? parseISO(note.linked_date)
            : undefined,
          pinned: note.pinned ?? false,
        });
      } else {
        form.reset({
          content: "",
          color: "default",
          linked_date: undefined,
          pinned: false,
        });
      }
    }
  }, [open, note, form]);

  function handleSubmit(values: NoteFormValues) {
    onSave({
      ...values,
      linked_date: values.linked_date
        ? format(values.linked_date, "yyyy-MM-dd")
        : null,
    });
  }

  const selectedColor = form.watch("color");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Glass backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />

      {/* Glass card */}
      <div className="relative w-full max-w-[460px] mx-4 rounded-3xl border border-white/30 bg-white/85 backdrop-blur-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-200">
        {/* Gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-gradient-to-r from-[#7C5CFC] via-[#3B82F6] to-[#0D9F6E]" />

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
            {isEdit ? "Editar Nota" : "Nueva Nota"}
          </h2>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="px-6 pb-6 space-y-4"
          >
            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                    Contenido
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Escribe tu nota aquí..."
                      rows={4}
                      className="rounded-xl border-[#E8E6E1] resize-none focus:border-[#0B5394] focus:ring-[#0B5394]/10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color picker */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                    Color
                  </FormLabel>
                  <div className="flex items-center gap-2.5 pt-1">
                    {COLOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 transition-all",
                          field.value === opt.value
                            ? "border-[#18191D] scale-110 shadow-sm"
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: opt.hex }}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />

            {/* Linked Date */}
            <FormField
              control={form.control}
              name="linked_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-[12.5px] font-semibold text-[#6B7080]">
                    Fecha Vinculada
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
                            : "Seleccionar fecha (opcional)"}
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

            {/* Pinned */}
            <FormField
              control={form.control}
              name="pinned"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-[#E8E6E1] px-4 py-3">
                  <FormLabel className="text-[13px] font-medium text-[#18191D] cursor-pointer">
                    Fijar nota
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
                  : "Crear Nota"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
