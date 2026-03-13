"use client";

import { useState, useEffect } from "react";
import { Plus, CheckSquare, Bell, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/types";

interface WarRoomGreetingProps {
  profile: Profile | null;
  onAddTask: () => void;
  onAddReminder: () => void;
  onAddNote: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getFormattedDate(): string {
  const now = new Date();
  const days = [
    "domingo", "lunes", "martes", "miércoles",
    "jueves", "viernes", "sábado",
  ];
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const dayName = days[now.getDay()];
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `${dayName}, ${day} de ${month} de ${year}`;
}

function getFormattedTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getFirstName(profile: Profile | null): string {
  if (!profile?.full_name) return "";
  return profile.full_name.split(" ")[0];
}

export default function WarRoomGreeting({
  profile,
  onAddTask,
  onAddReminder,
  onAddNote,
}: WarRoomGreetingProps) {
  const [greeting, setGreeting] = useState(getGreeting());
  const [date, setDate] = useState(getFormattedDate());
  const [time, setTime] = useState(getFormattedTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getGreeting());
      setDate(getFormattedDate());
      setTime(getFormattedTime());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const firstName = getFirstName(profile);

  return (
    <div className="flex items-center justify-between px-1 py-2">
      {/* Left: Greeting + Date + Clock */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-[22px] font-bold text-[#18191D] tracking-tight">
          {greeting}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[#6B7080] capitalize">
            {date}
          </span>
          <span className="text-[13px] font-mono font-medium text-[#9CA3B4]">
            {time}
          </span>
        </div>
      </div>

      {/* Right: Add dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="wr-hover-lift bg-[#0B5394] hover:bg-[#094276] text-white rounded-xl px-4 h-9 text-[13px] font-semibold shadow-sm gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 rounded-xl border border-[#F0EDE8] shadow-[0_4px_16px_rgba(26,29,35,0.08)]"
        >
          <DropdownMenuItem
            onClick={onAddTask}
            className="gap-2.5 py-2.5 px-3 cursor-pointer text-[13px] text-[#18191D]"
          >
            <CheckSquare className="h-4 w-4 text-[#0B5394]" />
            Nueva Tarea
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onAddReminder}
            className="gap-2.5 py-2.5 px-3 cursor-pointer text-[13px] text-[#18191D]"
          >
            <Bell className="h-4 w-4 text-[#DC8B0B]" />
            Nuevo Recordatorio
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onAddNote}
            className="gap-2.5 py-2.5 px-3 cursor-pointer text-[13px] text-[#18191D]"
          >
            <StickyNote className="h-4 w-4 text-[#7C5CFC]" />
            Nueva Nota
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
