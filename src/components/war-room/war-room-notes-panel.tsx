"use client";

import { StickyNote, Plus, Pin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeDate, NOTE_COLORS } from "@/lib/utils";
import type { WarRoomNote } from "@/types";

interface WarRoomNotesPanelProps {
  notes: WarRoomNote[];
  onAddNote: () => void;
  onClickNote: (note: WarRoomNote) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDeleteNote: (id: string) => void;
}

export default function WarRoomNotesPanel({
  notes,
  onAddNote,
  onClickNote,
  onTogglePin,
  onDeleteNote,
}: WarRoomNotesPanelProps) {
  const totalCount = notes.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4.5 w-4.5 text-[#7C5CFC]" />
          <h3 className="text-[15px] font-bold text-[#18191D]">Notas</h3>
          <Badge
            variant="secondary"
            className="bg-[#F3F0FF] text-[#7C5CFC] text-[11px] font-bold px-2 py-0 h-5 rounded-full"
          >
            {totalCount}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddNote}
          className="h-8 rounded-xl border-[#0B5394] text-[#0B5394] hover:bg-[#E8F0FE] text-[12px] font-semibold gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva Nota
        </Button>
      </div>

      {/* Notes list */}
      <div className="max-h-[400px] overflow-y-auto pr-1 space-y-2">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <StickyNote className="h-8 w-8 text-[#C5CAD5] mb-2" />
            <p className="text-[13px] text-[#9CA3B4]">
              No hay notas creadas
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={onClickNote}
              onTogglePin={onTogglePin}
              onDelete={onDeleteNote}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NoteCard({
  note,
  onClick,
  onTogglePin,
  onDelete,
}: {
  note: WarRoomNote;
  onClick: (note: WarRoomNote) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const color = note.color || "default";
  const colorConfig = NOTE_COLORS[color] || NOTE_COLORS.default;
  const isPinned = note.pinned ?? false;

  return (
    <div
      className={cn(
        "relative p-3 rounded-xl border border-l-4 transition-all hover:shadow-sm cursor-pointer",
        colorConfig.bg,
        colorConfig.border
      )}
      onClick={() => onClick(note)}
    >
      {/* Pinned indicator */}
      {isPinned && (
        <span className="absolute top-2 right-2 text-[12px]" title="Nota fijada">
          📌
        </span>
      )}

      {/* Content */}
      <p className="text-[13px] text-[#18191D] leading-relaxed line-clamp-3 pr-6">
        {note.content}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#F0EDE8]/60">
        <span className="text-[11px] text-[#9CA3B4]">
          {formatRelativeDate(note.created_at)}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(note.id!, !isPinned);
            }}
            className={cn(
              "p-1 rounded-md transition-colors",
              isPinned
                ? "text-[#0B5394] hover:bg-[#E8F0FE]"
                : "text-[#9CA3B4] hover:text-[#6B7080] hover:bg-[#F0EDE8]"
            )}
            title={isPinned ? "Desfijar nota" : "Fijar nota"}
          >
            <Pin
              className={cn("h-3.5 w-3.5", isPinned && "fill-current")}
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id!);
            }}
            className="p-1 rounded-md text-[#9CA3B4] hover:text-[#E63946] hover:bg-[#FFF1F2] transition-colors"
            title="Eliminar nota"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
