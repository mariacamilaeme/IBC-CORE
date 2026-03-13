"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { T } from "@/lib/design-tokens";
import { useAuth } from "@/hooks/useAuth";
import {
  BookOpen,
  FileText,
  StickyNote,
  Lock,
  Plus,
  Search,
  Star,
  StarOff,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  ChevronRight,
  Clock,
  Tag,
  Folder,
  Send,
  Edit3,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  X,
  MoreHorizontal,
  Archive,
  Pin,
  PinOff,
  Bookmark,
  BookmarkCheck,
  Shield,
  KeyRound,
  Globe,
  Server,
  Database,
  Mail,
  Smartphone,
  CreditCard,
  Wifi,
  CloudCog,
  RefreshCw,
  Download,
  Upload,
  Sparkles,
  Lightbulb,
  Zap,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────
type WikiTab = "templates" | "notes" | "articles" | "passwords";

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  isFavorite: boolean;
}

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  status: "draft" | "published";
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  readTime: number;
}

interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  category: string;
  icon: LucideIcon;
  color: string;
  notes: string;
  lastUpdated: Date;
  isFavorite: boolean;
}

// ─── Data ──────────────────────────────────────────────

const TEMPLATE_CATEGORIES = ["Comercial", "Logistica", "Finanzas", "Legal", "General"];

const initialTemplates: Template[] = [
  {
    id: "t1",
    title: "Propuesta Comercial",
    description: "Plantilla para enviar propuestas comerciales a clientes potenciales",
    category: "Comercial",
    content: `Estimado/a [Nombre del Cliente],\n\nEs un placer dirigirnos a usted para presentarle nuestra propuesta comercial.\n\nIBC Steel Group se especializa en [descripción del producto/servicio]. A continuación, detallamos nuestra oferta:\n\n• Producto: [Nombre del producto]\n• Cantidad: [Cantidad]\n• Precio unitario: USD [Precio]\n• Condiciones de pago: [Términos]\n• Tiempo de entrega: [Plazo]\n\nQuedamos atentos a sus comentarios.\n\nCordialmente,\n[Su nombre]\nIBC Steel Group`,
    icon: Send,
    color: T.accent,
    bgColor: T.accentLight,
    isFavorite: true,
  },
  {
    id: "t2",
    title: "Seguimiento de Cotizacion",
    description: "Email de seguimiento despues de enviar una cotizacion al cliente",
    category: "Comercial",
    content: `Estimado/a [Nombre],\n\nEspero que se encuentre bien. Me permito hacer seguimiento a la cotización No. [Numero] enviada el [Fecha].\n\n¿Ha tenido oportunidad de revisar nuestra propuesta? Estamos disponibles para resolver cualquier duda.\n\nQuedo atento.\n\nSaludos,\n[Su nombre]`,
    icon: FileText,
    color: T.blue,
    bgColor: T.blueBg,
    isFavorite: false,
  },
  {
    id: "t3",
    title: "Confirmacion de Embarque",
    description: "Notificacion al cliente sobre detalles del embarque",
    category: "Logistica",
    content: `Estimado/a [Nombre],\n\nLe informamos que su pedido ha sido embarcado con los siguientes detalles:\n\n• Orden de compra: [OC]\n• Motonave: [Nombre del buque]\n• BL: [Numero BL]\n• Puerto de origen: [Puerto]\n• Puerto de destino: [Puerto]\n• ETA: [Fecha estimada]\n• Contenedores: [Cantidad y tipo]\n\nAdjuntamos los documentos de embarque.\n\nCordialmente,\n[Su nombre]`,
    icon: Globe,
    color: T.teal,
    bgColor: T.tealBg,
    isFavorite: true,
  },
  {
    id: "t4",
    title: "Solicitud de Anticipo",
    description: "Plantilla para solicitar anticipo de pago al cliente",
    category: "Finanzas",
    content: `Estimado/a [Nombre],\n\nDe acuerdo al contrato No. [Numero], le solicitamos amablemente proceder con el anticipo correspondiente:\n\n• Monto: USD [Monto]\n• Porcentaje: [%] del valor total\n• Fecha limite: [Fecha]\n\nDatos bancarios:\n• Banco: [Nombre del banco]\n• Cuenta: [Numero]\n• SWIFT: [Codigo]\n• Beneficiario: IBC Steel Group\n\nAgradecemos su atencion.\n\nSaludos,\n[Su nombre]`,
    icon: CreditCard,
    color: T.warning,
    bgColor: T.warningBg,
    isFavorite: false,
  },
  {
    id: "t5",
    title: "Reclamacion de Calidad",
    description: "Formato para documentar y reportar reclamaciones de calidad",
    category: "Legal",
    content: `REPORTE DE RECLAMACION DE CALIDAD\n\nFecha: [Fecha]\nCliente: [Nombre]\nContrato: [Numero]\nProducto: [Descripcion]\n\n1. DESCRIPCION DEL PROBLEMA:\n[Detalle del problema encontrado]\n\n2. EVIDENCIA:\n[Fotos, documentos, resultados de pruebas]\n\n3. IMPACTO:\n[Efecto en la operacion del cliente]\n\n4. ACCION SOLICITADA:\n[Reemplazo, credito, descuento]\n\n5. PLAZO DE RESPUESTA:\n[Fecha esperada de resolucion]`,
    icon: Shield,
    color: T.danger,
    bgColor: T.dangerBg,
    isFavorite: false,
  },
  {
    id: "t6",
    title: "Acta de Reunion",
    description: "Template para documentar acuerdos y compromisos de reuniones",
    category: "General",
    content: `ACTA DE REUNION\n\nFecha: [Fecha]\nHora: [Hora inicio] - [Hora fin]\nLugar: [Presencial/Virtual]\nAsistentes:\n• [Nombre 1 - Cargo]\n• [Nombre 2 - Cargo]\n\nAGENDA:\n1. [Tema 1]\n2. [Tema 2]\n\nACUERDOS:\n1. [Acuerdo 1] - Responsable: [Nombre] - Fecha: [Plazo]\n2. [Acuerdo 2] - Responsable: [Nombre] - Fecha: [Plazo]\n\nPROXIMA REUNION: [Fecha y hora]`,
    icon: BookOpen,
    color: T.violet,
    bgColor: T.violetBg,
    isFavorite: true,
  },
];

const NOTE_COLORS = [
  { name: "Blanco", value: "#FFFFFF", border: T.border },
  { name: "Azul", value: "#EFF6FF", border: "#BFDBFE" },
  { name: "Verde", value: "#ECFDF5", border: "#A7F3D0" },
  { name: "Amarillo", value: "#FFFBEB", border: "#FDE68A" },
  { name: "Rosa", value: "#FFF1F2", border: "#FECDD3" },
  { name: "Violeta", value: "#F5F3FF", border: "#C4B5FD" },
];

const PASSWORD_CATEGORIES = [
  { name: "Plataformas", icon: Globe, color: T.accent },
  { name: "Servidores", icon: Server, color: T.teal },
  { name: "Bases de datos", icon: Database, color: T.violet },
  { name: "Email", icon: Mail, color: T.blue },
  { name: "Servicios Cloud", icon: CloudCog, color: T.orange },
  { name: "Otros", icon: KeyRound, color: T.inkMuted },
];

const initialPasswords: PasswordEntry[] = [
  {
    id: "p1",
    title: "Supabase Dashboard",
    username: "admin@ibcsteel.com",
    password: "••••••••••••",
    url: "https://supabase.com",
    category: "Bases de datos",
    icon: Database,
    color: T.teal,
    notes: "Proyecto IBC Core - Produccion",
    lastUpdated: new Date(2025, 11, 15),
    isFavorite: true,
  },
  {
    id: "p2",
    title: "Vercel Deployment",
    username: "deploy@ibcsteel.com",
    password: "••••••••••••",
    url: "https://vercel.com",
    category: "Servicios Cloud",
    icon: CloudCog,
    color: T.orange,
    notes: "Cuenta de despliegue principal",
    lastUpdated: new Date(2025, 10, 20),
    isFavorite: false,
  },
  {
    id: "p3",
    title: "Email Corporativo",
    username: "info@ibcsteel.com",
    password: "••••••••••••",
    url: "https://mail.google.com",
    category: "Email",
    icon: Mail,
    color: T.blue,
    notes: "Cuenta principal de comunicaciones",
    lastUpdated: new Date(2025, 9, 5),
    isFavorite: true,
  },
];

// ─── Helpers ───────────────────────────────────────────
function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function formatDate(d: Date) {
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function getReadTime(content: string) {
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

// ─── Tab Button Component ──────────────────────────────
function TabButton({
  tab,
  active,
  icon: Icon,
  label,
  count,
  onClick,
}: {
  tab: WikiTab;
  active: boolean;
  icon: LucideIcon;
  label: string;
  count: number;
  onClick: (t: WikiTab) => void;
}) {
  return (
    <button
      onClick={() => onClick(tab)}
      className="relative flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
      style={{
        background: active
          ? `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`
          : "transparent",
        color: active ? "#fff" : T.inkMuted,
        boxShadow: active ? `0 4px 15px -3px ${T.accent}40` : "none",
      }}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span
        className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
        style={{
          background: active ? "rgba(255,255,255,0.2)" : T.surfaceAlt,
          color: active ? "#fff" : T.inkLight,
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Template Card ─────────────────────────────────────
function TemplateCard({
  template,
  onSelect,
  onEdit,
  onToggleFav,
  onDelete,
  delay,
}: {
  template: Template;
  onSelect: (t: Template) => void;
  onEdit: (t: Template) => void;
  onToggleFav: (id: string) => void;
  onDelete: (id: string) => void;
  delay: number;
}) {
  const Icon = template.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay * 0.08, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
      className="wiki-hover-lift group cursor-pointer"
      onClick={() => onSelect(template)}
    >
      <div
        className="relative p-5 rounded-2xl border overflow-hidden"
        style={{
          background: T.surface,
          borderColor: T.borderLight,
          boxShadow: T.shadow,
        }}
      >
        {/* Category badge + actions */}
        <div className="flex items-center justify-between mb-4">
          <span
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider"
            style={{ background: template.bgColor, color: template.color }}
          >
            {template.category}
          </span>
          <div className="flex items-center gap-1">
            {/* Edit */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(template);
              }}
              className="p-1.5 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-gray-100"
              style={{ color: T.inkMuted }}
              title="Editar plantilla"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            {/* Delete */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(template.id);
              }}
              className="p-1.5 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-red-50"
              style={{ color: T.danger }}
              title="Eliminar plantilla"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            {/* Favorite */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFav(template.id);
              }}
              className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110"
              style={{ color: template.isFavorite ? "#F59E0B" : T.inkGhost }}
            >
              {template.isFavorite ? (
                <Star className="h-4 w-4 fill-current" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Icon */}
        <div
          className="wiki-hover-bounce w-12 h-12 rounded-xl flex items-center justify-center mb-3"
          style={{ background: template.bgColor }}
        >
          <Icon className="wiki-icon h-6 w-6" style={{ color: template.color }} />
        </div>

        {/* Content */}
        <h3 className="font-bold text-[15px] mb-1.5" style={{ color: T.ink }}>
          {template.title}
        </h3>
        <p className="text-[13px] leading-relaxed line-clamp-2" style={{ color: T.inkMuted }}>
          {template.description}
        </p>

        {/* Footer */}
        <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: `1px solid ${T.borderLight}` }}>
          <Send className="h-3.5 w-3.5" style={{ color: T.inkLight }} />
          <span className="text-[12px] font-medium" style={{ color: T.inkLight }}>
            Usar plantilla
          </span>
          <ArrowRight
            className="h-3.5 w-3.5 ml-auto opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
            style={{ color: T.accent }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Note Card ─────────────────────────────────────────
function NoteCard({
  note,
  onSelect,
  onPin,
  onDelete,
  delay,
}: {
  note: Note;
  onSelect: (n: Note) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  delay: number;
}) {
  const noteColor = NOTE_COLORS.find((c) => c.value === note.color) || NOTE_COLORS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ delay: delay * 0.06, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      layout
      className="wiki-hover-lift group cursor-pointer"
      onClick={() => onSelect(note)}
    >
      <div
        className="relative p-4 rounded-2xl border-2 min-h-[160px] flex flex-col"
        style={{
          background: note.color,
          borderColor: noteColor.border,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* Pin indicator */}
        {note.isPinned && (
          <div className="absolute -top-1.5 -right-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center wiki-badge-pop"
              style={{ background: T.accent, boxShadow: `0 2px 8px ${T.accent}40` }}
            >
              <Pin className="h-3 w-3 text-white" />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin(note.id);
            }}
            className="p-1 rounded-md hover:bg-black/5 transition-colors"
            style={{ color: T.inkMuted }}
          >
            {note.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            className="p-1 rounded-md hover:bg-red-50 transition-colors"
            style={{ color: T.danger }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <h4 className="font-bold text-[14px] mb-1.5 line-clamp-1" style={{ color: T.ink }}>
          {note.title}
        </h4>
        <p className="text-[13px] leading-relaxed line-clamp-4 flex-1" style={{ color: T.inkSoft }}>
          {note.content}
        </p>

        {/* Tags & Date */}
        <div className="mt-3 pt-2 flex items-center gap-2 flex-wrap" style={{ borderTop: `1px solid ${noteColor.border}` }}>
          {note.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{ background: "rgba(0,0,0,0.05)", color: T.inkMuted }}
            >
              #{tag}
            </span>
          ))}
          <span className="ml-auto text-[11px]" style={{ color: T.inkLight }}>
            {formatDate(note.updatedAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Article Row ───────────────────────────────────────
function ArticleRow({
  article,
  onSelect,
  onDelete,
  delay,
}: {
  article: Article;
  onSelect: (a: Article) => void;
  onDelete: (id: string) => void;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.06, duration: 0.35 }}
      className="group cursor-pointer"
      onClick={() => onSelect(article)}
    >
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-200 hover:shadow-md"
        style={{
          background: T.surface,
          borderColor: T.borderLight,
        }}
      >
        {/* Status indicator */}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{
            background: article.status === "published" ? T.success : T.warning,
            boxShadow: `0 0 0 3px ${article.status === "published" ? T.successSoft : T.warningSoft}`,
          }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[14px] truncate" style={{ color: T.ink }}>
            {article.title}
          </h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[12px]" style={{ color: T.inkLight }}>
              <Clock className="inline h-3 w-3 mr-1" />
              {article.readTime} min lectura
            </span>
            <span className="text-[12px]" style={{ color: T.inkLight }}>
              {formatDate(article.updatedAt)}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex gap-1.5 flex-shrink-0">
          {article.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md text-[11px] font-medium"
              style={{ background: T.accentLight, color: T.accent }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Status badge */}
        <span
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase flex-shrink-0"
          style={{
            background: article.status === "published" ? T.successBg : T.warningBg,
            color: article.status === "published" ? T.success : T.warning,
          }}
        >
          {article.status === "published" ? "Publicado" : "Borrador"}
        </span>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(article.id);
          }}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
          style={{ color: T.danger }}
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <ChevronRight
          className="h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: T.inkLight }}
        />
      </div>
    </motion.div>
  );
}

// ─── Password Row ──────────────────────────────────────
function PasswordRow({
  entry,
  onCopy,
  onToggleShow,
  showPassword,
  onToggleFav,
  onDelete,
  delay,
}: {
  entry: PasswordEntry;
  onCopy: (text: string, label: string) => void;
  onToggleShow: (id: string) => void;
  showPassword: boolean;
  onToggleFav: (id: string) => void;
  onDelete: (id: string) => void;
  delay: number;
}) {
  const Icon = entry.icon;
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    onCopy(text, label);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.07, duration: 0.35 }}
      className="group"
    >
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-200 hover:shadow-md"
        style={{
          background: T.surface,
          borderColor: T.borderLight,
        }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${entry.color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: entry.color }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-[14px] truncate" style={{ color: T.ink }}>
              {entry.title}
            </h4>
            {entry.isFavorite && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
          </div>
          <p className="text-[12px] truncate mt-0.5" style={{ color: T.inkLight }}>
            {entry.username}
          </p>
        </div>

        {/* Password field */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="px-3 py-1.5 rounded-lg font-mono text-[13px] min-w-[140px] text-center select-all"
            style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.borderLight}` }}
          >
            {showPassword ? entry.password : "••••••••••••"}
          </div>
          <button
            onClick={() => onToggleShow(entry.id)}
            className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: T.inkMuted }}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            onClick={() => handleCopy(entry.password, "password")}
            className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: copied === "password" ? T.success : T.inkMuted }}
          >
            {copied === "password" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleFav(entry.id)}
            className="p-1.5 rounded-lg transition-colors hover:bg-yellow-50"
            style={{ color: entry.isFavorite ? "#F59E0B" : T.inkGhost }}
          >
            <Star className={`h-4 w-4 ${entry.isFavorite ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
            style={{ color: T.danger }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Editor Toolbar ────────────────────────────────────
function EditorToolbar() {
  const tools = [
    { icon: Bold, label: "Negrita" },
    { icon: Italic, label: "Cursiva" },
    { icon: Underline, label: "Subrayado" },
    { divider: true },
    { icon: Heading1, label: "Titulo 1" },
    { icon: Heading2, label: "Titulo 2" },
    { icon: Heading3, label: "Titulo 3" },
    { divider: true },
    { icon: List, label: "Lista" },
    { icon: ListOrdered, label: "Lista numerada" },
    { icon: Quote, label: "Cita" },
    { icon: Code, label: "Codigo" },
    { divider: true },
    { icon: Link2, label: "Enlace" },
    { icon: Image, label: "Imagen" },
    { divider: true },
    { icon: AlignLeft, label: "Izquierda" },
    { icon: AlignCenter, label: "Centro" },
    { icon: AlignRight, label: "Derecha" },
  ] as const;

  return (
    <div
      className="flex items-center gap-0.5 px-3 py-2 rounded-xl border mb-3 flex-wrap"
      style={{ background: T.surfaceAlt, borderColor: T.borderLight }}
    >
      {tools.map((tool, i) => {
        if ("divider" in tool) {
          return (
            <div
              key={`d${i}`}
              className="w-px h-5 mx-1.5"
              style={{ background: T.border }}
            />
          );
        }
        const ToolIcon = tool.icon;
        return (
          <button
            key={tool.label}
            className="p-1.5 rounded-lg transition-all duration-150 hover:bg-white hover:shadow-sm"
            style={{ color: T.inkMuted }}
            title={tool.label}
          >
            <ToolIcon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

// ─── Modals ────────────────────────────────────────────

function TemplateViewModal({
  template,
  onClose,
  onEdit,
}: {
  template: Template;
  onClose: () => void;
  onEdit: (t: Template) => void;
}) {
  const [copied, setCopied] = useState(false);
  const Icon = template.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(template.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: T.surface, boxShadow: T.shadowLg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center gap-4"
          style={{ borderBottom: `1px solid ${T.borderLight}` }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: template.bgColor }}
          >
            <Icon className="h-5 w-5" style={{ color: template.color }} />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg" style={{ color: T.ink }}>
              {template.title}
            </h2>
            <p className="text-[13px]" style={{ color: T.inkMuted }}>
              {template.description}
            </p>
          </div>
          <button
            onClick={() => onEdit(template)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            style={{ color: T.accent }}
            title="Editar plantilla"
          >
            <Edit3 className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            style={{ color: T.inkMuted }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[400px] overflow-y-auto">
          <pre
            className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed"
            style={{ color: T.inkSoft }}
          >
            {template.content}
          </pre>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-end gap-3"
          style={{ borderTop: `1px solid ${T.borderLight}`, background: T.surfaceAlt }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ color: T.inkMuted }}
          >
            Cerrar
          </button>
          <button
            onClick={() => onEdit(template)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100"
            style={{ color: T.accent, border: `1px solid ${T.accent}30` }}
          >
            <Edit3 className="h-4 w-4" /> Editar
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90"
            style={{
              background: copied
                ? T.success
                : `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
              boxShadow: `0 4px 12px -2px ${copied ? T.success : T.accent}40`,
            }}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiar plantilla
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TemplateEditorModal({
  template,
  onSave,
  onClose,
}: {
  template: Template | null;
  onSave: (t: Partial<Template> & { id?: string }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(template?.title || "");
  const [description, setDescription] = useState(template?.description || "");
  const [category, setCategory] = useState(template?.category || TEMPLATE_CATEGORIES[0]);
  const [content, setContent] = useState(template?.content || "");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: T.surface, boxShadow: T.shadowLg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center gap-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${T.borderLight}` }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: T.accentLight }}
          >
            <FileText className="h-5 w-5" style={{ color: T.accent }} />
          </div>
          <h2 className="font-bold text-lg flex-1" style={{ color: T.ink }}>
            {template ? "Editar plantilla" : "Nueva plantilla"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100" style={{ color: T.inkMuted }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Title & Category */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>
                Titulo de la plantilla
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Propuesta Comercial"
                className="w-full px-4 py-2.5 rounded-xl border text-[14px] outline-none transition-all focus:ring-2"
                style={{ borderColor: T.border, color: T.ink, background: T.surfaceAlt }}
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border text-[14px] outline-none"
                style={{ borderColor: T.border, color: T.ink, background: T.surfaceAlt }}
              >
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>
              Descripcion
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripcion de para que sirve esta plantilla..."
              className="w-full px-4 py-2.5 rounded-xl border text-[14px] outline-none transition-all focus:ring-2"
              style={{ borderColor: T.border, color: T.ink, background: T.surfaceAlt }}
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[13px] font-semibold" style={{ color: T.inkSoft }}>
                Contenido de la plantilla
              </label>
              <span className="text-[11px] font-medium" style={{ color: T.inkLight }}>
                Usa [Nombre], [Fecha], etc. como variables
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"Estimado/a [Nombre del Cliente],\n\nEscribe aqui el contenido de la plantilla...\n\nCordialmente,\n[Su nombre]"}
              rows={14}
              className="w-full px-4 py-3 rounded-xl border text-[14px] outline-none transition-all focus:ring-2 resize-none font-sans leading-relaxed"
              style={{ borderColor: T.border, color: T.ink, background: T.surfaceAlt }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: `1px solid ${T.borderLight}`, background: T.surfaceAlt }}
        >
          <div className="text-[12px]" style={{ color: T.inkLight }}>
            {content.length > 0 && `${content.length} caracteres`}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ color: T.inkMuted }}>
              Cancelar
            </button>
            <button
              onClick={() => {
                onSave({
                  id: template?.id,
                  title,
                  description,
                  category,
                  content,
                });
                onClose();
              }}
              disabled={!title.trim() || !content.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
                boxShadow: `0 4px 12px -2px ${T.accent}40`,
              }}
            >
              <Check className="h-4 w-4" />
              {template ? "Guardar cambios" : "Crear plantilla"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NoteEditorModal({
  note,
  onSave,
  onClose,
}: {
  note: Note | null;
  onSave: (n: Partial<Note> & { id?: string }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [color, setColor] = useState(note?.color || NOTE_COLORS[0].value);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(note?.tags || []);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: T.surface, boxShadow: T.shadowLg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${T.borderLight}` }}
        >
          <h2 className="font-bold text-lg" style={{ color: T.ink }}>
            {note ? "Editar nota" : "Nueva nota"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100" style={{ color: T.inkMuted }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>
              Titulo
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mi nota..."
              className="w-full px-4 py-2.5 rounded-xl border text-[14px] outline-none transition-all focus:ring-2"
              style={{
                borderColor: T.border,
                color: T.ink,
                background: T.surfaceAlt,
              }}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>
              Contenido
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe aqui..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl border text-[14px] outline-none transition-all focus:ring-2 resize-none"
              style={{
                borderColor: T.border,
                color: T.ink,
                background: T.surfaceAlt,
              }}
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-[13px] font-semibold mb-2" style={{ color: T.inkSoft }}>
              Color
            </label>
            <div className="flex gap-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className="w-8 h-8 rounded-full border-2 transition-all duration-200"
                  style={{
                    background: c.value,
                    borderColor: color === c.value ? T.accent : c.border,
                    boxShadow: color === c.value ? `0 0 0 3px ${T.accent}30` : "none",
                    transform: color === c.value ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>
              Etiquetas
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-medium"
                  style={{ background: T.accentLight, color: T.accent }}
                >
                  #{tag}
                  <button
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    className="hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Agregar etiqueta..."
                className="flex-1 px-3 py-2 rounded-xl border text-[13px] outline-none"
                style={{ borderColor: T.border, background: T.surfaceAlt, color: T.ink }}
              />
              <button
                onClick={addTag}
                className="px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors"
                style={{ background: T.accentLight, color: T.accent }}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex justify-end gap-3"
          style={{ borderTop: `1px solid ${T.borderLight}`, background: T.surfaceAlt }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ color: T.inkMuted }}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave({ id: note?.id, title, content, color, tags });
              onClose();
            }}
            disabled={!title.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
              boxShadow: `0 4px 12px -2px ${T.accent}40`,
            }}
          >
            {note ? "Guardar cambios" : "Crear nota"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ArticleEditorModal({
  article,
  onSave,
  onClose,
}: {
  article: Article | null;
  onSave: (a: Partial<Article> & { id?: string }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(article?.title || "");
  const [content, setContent] = useState(article?.content || "");
  const [category, setCategory] = useState(article?.category || "General");
  const [status, setStatus] = useState<"draft" | "published">(article?.status || "draft");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(article?.tags || []);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: T.surface, boxShadow: T.shadowLg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: `1px solid ${T.borderLight}` }}
        >
          <h2 className="font-bold text-lg" style={{ color: T.ink }}>
            {article ? "Editar articulo" : "Nuevo articulo"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100" style={{ color: T.inkMuted }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Title & Category row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>
                Titulo del articulo
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titulo..."
                className="w-full px-4 py-2.5 rounded-xl border text-[14px] outline-none transition-all focus:ring-2"
                style={{ borderColor: T.border, color: T.ink, background: T.surfaceAlt }}
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border text-[14px] outline-none"
                style={{ borderColor: T.border, color: T.ink, background: T.surfaceAlt }}
              >
                <option>General</option>
                <option>Procesos</option>
                <option>Normativas</option>
                <option>Productos</option>
                <option>Logistica</option>
                <option>DLP</option>
              </select>
            </div>
          </div>

          {/* Editor toolbar */}
          <EditorToolbar />

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe el contenido del articulo aqui... Puedes usar formato tipo Markdown."
            rows={12}
            className="w-full px-4 py-3 rounded-xl border text-[14px] outline-none transition-all focus:ring-2 resize-none wiki-editor-content"
            style={{ borderColor: T.border, color: T.ink, background: T.surfaceAlt }}
          />

          {/* Tags row */}
          <div className="flex items-center gap-3 flex-wrap">
            <Tag className="h-4 w-4" style={{ color: T.inkLight }} />
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-medium"
                style={{ background: T.accentLight, color: T.accent }}
              >
                {tag}
                <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="+ Etiqueta"
              className="px-2 py-1 text-[12px] outline-none bg-transparent"
              style={{ color: T.inkMuted }}
            />
          </div>

          {/* Status toggle */}
          <div className="flex items-center gap-3">
            <label className="text-[13px] font-semibold" style={{ color: T.inkSoft }}>
              Estado:
            </label>
            <button
              onClick={() => setStatus(status === "draft" ? "published" : "draft")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: status === "published" ? T.successBg : T.warningBg,
                color: status === "published" ? T.success : T.warning,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: status === "published" ? T.success : T.warning }}
              />
              {status === "published" ? "Publicado" : "Borrador"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex justify-end gap-3 flex-shrink-0"
          style={{ borderTop: `1px solid ${T.borderLight}`, background: T.surfaceAlt }}
        >
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ color: T.inkMuted }}>
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave({ id: article?.id, title, content, category, status, tags, readTime: getReadTime(content) });
              onClose();
            }}
            disabled={!title.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
              boxShadow: `0 4px 12px -2px ${T.accent}40`,
            }}
          >
            {article ? "Guardar cambios" : "Crear articulo"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PasswordModal({
  entry,
  onSave,
  onClose,
}: {
  entry: PasswordEntry | null;
  onSave: (p: Partial<PasswordEntry> & { id?: string }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(entry?.title || "");
  const [username, setUsername] = useState(entry?.username || "");
  const [password, setPassword] = useState(entry?.id ? entry.password : "");
  const [url, setUrl] = useState(entry?.url || "");
  const [category, setCategory] = useState(entry?.category || "Plataformas");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [showPwd, setShowPwd] = useState(false);

  const catInfo = PASSWORD_CATEGORIES.find((c) => c.name === category) || PASSWORD_CATEGORIES[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: T.surface, boxShadow: T.shadowLg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${T.borderLight}` }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${catInfo.color}15` }}
          >
            <Shield className="h-5 w-5" style={{ color: catInfo.color }} />
          </div>
          <h2 className="font-bold text-lg flex-1" style={{ color: T.ink }}>
            {entry ? "Editar credencial" : "Nueva credencial"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100" style={{ color: T.inkMuted }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>Titulo</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nombre del servicio"
                className="w-full px-4 py-2.5 rounded-xl border text-[14px] outline-none"
                style={{ borderColor: T.border, color: T.ink, background: T.surfaceAlt }}
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border text-[14px] outline-none"
                style={{ borderColor: T.border, color: T.ink, background: T.surfaceAlt }}
              >
                {PASSWORD_CATEGORIES.map((c) => (
                  <option key={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>
              Usuario / Email
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-2.5 rounded-xl border text-[14px] outline-none"
              style={{ borderColor: T.border, color: T.ink, background: T.surfaceAlt }}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>
              Contrasena
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 pr-20 rounded-xl border text-[14px] outline-none font-mono"
                style={{ borderColor: T.border, color: T.ink, background: T.surfaceAlt }}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button onClick={() => setShowPwd(!showPwd)} className="p-1 rounded hover:bg-gray-100" style={{ color: T.inkMuted }}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
                    let generated = "";
                    const array = new Uint32Array(20);
                    crypto.getRandomValues(array);
                    for (let i = 0; i < 20; i++) {
                      generated += chars[array[i] % chars.length];
                    }
                    setPassword(generated);
                    setShowPwd(true);
                  }}
                  className="p-1 rounded hover:bg-gray-100"
                  style={{ color: T.accent }}
                  title="Generar contrasena segura"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl border text-[14px] outline-none"
              style={{ borderColor: T.border, color: T.ink, background: T.surfaceAlt }}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1.5" style={{ color: T.inkSoft }}>Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border text-[14px] outline-none resize-none"
              style={{ borderColor: T.border, color: T.ink, background: T.surfaceAlt }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex justify-end gap-3"
          style={{ borderTop: `1px solid ${T.borderLight}`, background: T.surfaceAlt }}
        >
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ color: T.inkMuted }}>
            Cancelar
          </button>
          <button
            onClick={() => {
              const cat = PASSWORD_CATEGORIES.find((c) => c.name === category) || PASSWORD_CATEGORIES[0];
              onSave({
                id: entry?.id,
                title,
                username,
                password,
                url,
                category,
                icon: cat.icon,
                color: cat.color,
                notes,
              });
              onClose();
            }}
            disabled={!title.trim() || !password.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
              boxShadow: `0 4px 12px -2px ${T.accent}40`,
            }}
          >
            {entry ? "Guardar" : "Crear credencial"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Empty State ───────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16"
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 wiki-shimmer-bg"
        style={{ background: T.surfaceAlt, border: `2px dashed ${T.border}` }}
      >
        <Icon className="h-9 w-9" style={{ color: T.inkGhost }} />
      </div>
      <h3 className="font-bold text-lg mb-2" style={{ color: T.inkSoft }}>
        {title}
      </h3>
      <p className="text-[14px] text-center max-w-sm mb-5" style={{ color: T.inkMuted }}>
        {description}
      </p>
      <button
        onClick={onAction}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
        style={{
          background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
          boxShadow: `0 4px 12px -2px ${T.accent}40`,
        }}
      >
        <Plus className="h-4 w-4" />
        {action}
      </button>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN WIKI PAGE
// ═══════════════════════════════════════════════════════

export default function WikiPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<WikiTab>("templates");
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // ─── Templates State
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null | "new">(null);
  const [templateFilter, setTemplateFilter] = useState("Todas");

  // ─── Notes State
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "n1",
      title: "Pendientes semana",
      content: "Revisar cotizaciones pendientes de China\nEnviar facturas a cliente ABC\nConfirmar embarque container MSKU123",
      color: NOTE_COLORS[3].value,
      isPinned: true,
      tags: ["urgente", "operaciones"],
      createdAt: new Date(2025, 11, 10),
      updatedAt: new Date(2025, 11, 12),
    },
    {
      id: "n2",
      title: "Ideas para presentacion Q1",
      content: "Incluir graficos de crecimiento\nMostrar nuevos mercados\nResaltar margin improvement\nAgregar seccion de proyecciones",
      color: NOTE_COLORS[1].value,
      isPinned: false,
      tags: ["presentacion", "Q1"],
      createdAt: new Date(2025, 11, 8),
      updatedAt: new Date(2025, 11, 11),
    },
    {
      id: "n3",
      title: "Datos de contacto proveedor",
      content: "Shanghai Steel Corp\nContacto: Li Wei\nEmail: liwei@shanghaisc.cn\nTel: +86 21 5555 1234",
      color: NOTE_COLORS[4].value,
      isPinned: false,
      tags: ["contacto", "proveedor"],
      createdAt: new Date(2025, 11, 5),
      updatedAt: new Date(2025, 11, 5),
    },
  ]);
  const [editingNote, setEditingNote] = useState<Note | null | "new">(null);

  // ─── Articles State
  const [articles, setArticles] = useState<Article[]>([
    {
      id: "a1",
      title: "Proceso de importacion de acero - Guia completa",
      content: "Este articulo describe el proceso paso a paso para la importacion de productos de acero...",
      category: "Procesos",
      status: "published",
      tags: ["importacion", "acero", "guia"],
      createdAt: new Date(2025, 10, 15),
      updatedAt: new Date(2025, 11, 1),
      readTime: 8,
    },
    {
      id: "a2",
      title: "Normativa arancelaria 2025 - Cambios clave",
      content: "Resumen de las modificaciones arancelarias vigentes para productos metalurgicos...",
      category: "Normativas",
      status: "published",
      tags: ["normativa", "aranceles", "2025"],
      createdAt: new Date(2025, 10, 20),
      updatedAt: new Date(2025, 11, 5),
      readTime: 5,
    },
    {
      id: "a3",
      title: "Ficha tecnica - Bobinas HR",
      content: "Especificaciones tecnicas de bobinas laminadas en caliente...",
      category: "Productos",
      status: "draft",
      tags: ["producto", "bobinas", "HR"],
      createdAt: new Date(2025, 11, 2),
      updatedAt: new Date(2025, 11, 8),
      readTime: 3,
    },
  ]);
  const [editingArticle, setEditingArticle] = useState<Article | null | "new">(null);
  const [articleFilter, setArticleFilter] = useState("Todos");

  // ─── Passwords State
  const [passwords, setPasswords] = useState<PasswordEntry[]>(initialPasswords);
  const [editingPassword, setEditingPassword] = useState<PasswordEntry | null | "new">(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [passwordFilter, setPasswordFilter] = useState("Todas");

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── Handlers ────────────────────────────────────────

  const toggleTemplateFav = useCallback((id: string) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t)));
  }, []);

  const saveTemplate = useCallback((data: Partial<Template> & { id?: string }) => {
    if (data.id) {
      // Update existing template
      setTemplates((prev) =>
        prev.map((t) => (t.id === data.id ? { ...t, ...data } : t))
      );
    } else {
      // Determine color/icon based on category
      const catColors: Record<string, { color: string; bgColor: string; icon: LucideIcon }> = {
        Comercial: { color: T.accent, bgColor: T.accentLight, icon: Send },
        Logistica: { color: T.teal, bgColor: T.tealBg, icon: Globe },
        Finanzas: { color: T.warning, bgColor: T.warningBg, icon: CreditCard },
        Legal: { color: T.danger, bgColor: T.dangerBg, icon: Shield },
        General: { color: T.violet, bgColor: T.violetBg, icon: BookOpen },
      };
      const catInfo = catColors[data.category || "General"] || catColors.General;

      setTemplates((prev) => [
        ...prev,
        {
          id: generateId(),
          title: data.title || "Sin titulo",
          description: data.description || "",
          category: data.category || "General",
          content: data.content || "",
          icon: catInfo.icon,
          color: catInfo.color,
          bgColor: catInfo.bgColor,
          isFavorite: false,
        },
      ]);
    }
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const saveNote = useCallback((data: Partial<Note> & { id?: string }) => {
    const now = new Date();
    if (data.id) {
      setNotes((prev) =>
        prev.map((n) => (n.id === data.id ? { ...n, ...data, updatedAt: now } : n))
      );
    } else {
      setNotes((prev) => [
        {
          id: generateId(),
          title: data.title || "Sin titulo",
          content: data.content || "",
          color: data.color || NOTE_COLORS[0].value,
          isPinned: false,
          tags: data.tags || [],
          createdAt: now,
          updatedAt: now,
        },
        ...prev,
      ]);
    }
  }, []);

  const toggleNotePin = useCallback((id: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const saveArticle = useCallback((data: Partial<Article> & { id?: string }) => {
    const now = new Date();
    if (data.id) {
      setArticles((prev) =>
        prev.map((a) => (a.id === data.id ? { ...a, ...data, updatedAt: now } : a))
      );
    } else {
      setArticles((prev) => [
        {
          id: generateId(),
          title: data.title || "Sin titulo",
          content: data.content || "",
          category: data.category || "General",
          status: data.status || "draft",
          tags: data.tags || [],
          createdAt: now,
          updatedAt: now,
          readTime: data.readTime || 1,
        },
        ...prev,
      ]);
    }
  }, []);

  const deleteArticle = useCallback((id: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const savePassword = useCallback((data: Partial<PasswordEntry> & { id?: string }) => {
    const now = new Date();
    if (data.id) {
      setPasswords((prev) =>
        prev.map((p) => (p.id === data.id ? { ...p, ...data, lastUpdated: now } : p))
      );
    } else {
      const cat = PASSWORD_CATEGORIES.find((c) => c.name === data.category) || PASSWORD_CATEGORIES[0];
      setPasswords((prev) => [
        {
          id: generateId(),
          title: data.title || "Sin titulo",
          username: data.username || "",
          password: data.password || "",
          url: data.url || "",
          category: data.category || "Plataformas",
          icon: cat.icon,
          color: cat.color,
          notes: data.notes || "",
          lastUpdated: now,
          isFavorite: false,
        },
        ...prev,
      ]);
    }
  }, []);

  const togglePasswordVisibility = useCallback((id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePasswordFav = useCallback((id: string) => {
    setPasswords((prev) => prev.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)));
  }, []);

  const deletePassword = useCallback((id: string) => {
    setPasswords((prev) => prev.filter((p) => p.id !== id));
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const copyToClipboard = useCallback((text: string, _label: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  // ─── Filtered data ──────────────────────────────────

  const filteredTemplates = useMemo(() => {
    let items = templates;
    if (templateFilter !== "Todas") {
      items = items.filter((t) => t.category === templateFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      items = items.filter((t) => t.title.toLowerCase().includes(s) || t.description.toLowerCase().includes(s));
    }
    return items;
  }, [templates, templateFilter, search]);

  const filteredNotes = useMemo(() => {
    let items = [...notes].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (n) => n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s) || n.tags.some((t) => t.includes(s))
      );
    }
    return items;
  }, [notes, search]);

  const filteredArticles = useMemo(() => {
    let items = articles;
    if (articleFilter !== "Todos") {
      const statusMap: Record<string, string> = { Publicados: "published", Borradores: "draft" };
      if (statusMap[articleFilter]) {
        items = items.filter((a) => a.status === statusMap[articleFilter]);
      } else {
        items = items.filter((a) => a.category === articleFilter);
      }
    }
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (a) => a.title.toLowerCase().includes(s) || a.tags.some((t) => t.toLowerCase().includes(s))
      );
    }
    return items;
  }, [articles, articleFilter, search]);

  const filteredPasswords = useMemo(() => {
    let items = [...passwords].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return b.lastUpdated.getTime() - a.lastUpdated.getTime();
    });
    if (passwordFilter !== "Todas") {
      items = items.filter((p) => p.category === passwordFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (p) => p.title.toLowerCase().includes(s) || p.username.toLowerCase().includes(s)
      );
    }
    return items;
  }, [passwords, passwordFilter, search]);

  // ─── Tab config ──────────────────────────────────────
  const tabs: { key: WikiTab; icon: LucideIcon; label: string; count: number }[] = [
    { key: "templates", icon: FileText, label: "Plantillas", count: templates.length },
    { key: "notes", icon: StickyNote, label: "Notas", count: notes.length },
    { key: "articles", icon: BookOpen, label: "Articulos", count: articles.length },
    { key: "passwords", icon: Lock, label: "Credenciales", count: passwords.length },
  ];

  if (!mounted) return null;

  return (
    <>
      <div className="relative min-h-screen pb-10">
        {/* Background orbs */}
        <div className="wiki-orb wiki-orb-1" />
        <div className="wiki-orb wiki-orb-2" />
        <div className="wiki-orb wiki-orb-3" />

        {/* ─── Page Header ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${T.accent}, ${T.violet})`,
                    boxShadow: `0 4px 15px -3px ${T.accent}40`,
                  }}
                >
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: T.ink }}>
                    Wiki
                  </h1>
                  <p className="text-[13px]" style={{ color: T.inkMuted }}>
                    Tu espacio de productividad y conocimiento
                  </p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-3">
              {[
                { label: "Plantillas", value: templates.length, color: T.accent, icon: FileText },
                { label: "Notas", value: notes.length, color: T.warning, icon: StickyNote },
                { label: "Articulos", value: articles.length, color: T.success, icon: BookOpen },
                { label: "Credenciales", value: passwords.length, color: T.violet, icon: Lock },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.borderLight}`,
                    boxShadow: T.shadow,
                  }}
                >
                  <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                  <span className="text-lg font-extrabold" style={{ color: stat.color }}>
                    {stat.value}
                  </span>
                  <span className="text-[12px] font-medium" style={{ color: T.inkLight }}>
                    {stat.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ─── Tab Bar + Search ────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex items-center justify-between mb-6 gap-4"
        >
          <div
            className="flex items-center gap-1 p-1.5 rounded-2xl"
            style={{ background: T.surface, border: `1px solid ${T.borderLight}`, boxShadow: T.shadow }}
          >
            {tabs.map((tab) => (
              <TabButton
                key={tab.key}
                tab={tab.key}
                active={activeTab === tab.key}
                icon={tab.icon}
                label={tab.label}
                count={tab.count}
                onClick={setActiveTab}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: T.inkLight }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-10 pr-4 py-2.5 rounded-xl border text-[14px] w-[240px] outline-none transition-all focus:ring-2 focus:w-[300px]"
                style={{
                  borderColor: T.border,
                  background: T.surface,
                  color: T.ink,
                  boxShadow: T.shadow,
                }}
              />
            </div>

            {/* Create button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (activeTab === "templates") setEditingTemplate("new");
                else if (activeTab === "notes") setEditingNote("new");
                else if (activeTab === "articles") setEditingArticle("new");
                else if (activeTab === "passwords") setEditingPassword("new");
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{
                background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
                boxShadow: `0 4px 15px -3px ${T.accent}40`,
              }}
            >
              <Plus className="h-4 w-4" />
              {activeTab === "templates" && "Nueva plantilla"}
              {activeTab === "notes" && "Nueva nota"}
              {activeTab === "articles" && "Nuevo articulo"}
              {activeTab === "passwords" && "Nueva credencial"}
            </motion.button>
          </div>
        </motion.div>

        {/* ─── Tab Content ─────────────────────────── */}
        <AnimatePresence mode="wait">
          {/* ────── TEMPLATES ────── */}
          {activeTab === "templates" && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Filter bar */}
              <div className="flex items-center gap-2 mb-5">
                {["Todas", ...TEMPLATE_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setTemplateFilter(cat)}
                    className="px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200"
                    style={{
                      background: templateFilter === cat ? T.accent : "transparent",
                      color: templateFilter === cat ? "#fff" : T.inkMuted,
                      boxShadow: templateFilter === cat ? `0 2px 8px ${T.accent}30` : "none",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filteredTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((t, i) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onSelect={setSelectedTemplate}
                      onEdit={(tmpl) => setEditingTemplate(tmpl)}
                      onToggleFav={toggleTemplateFav}
                      onDelete={deleteTemplate}
                      delay={i}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Sin resultados"
                  description="No se encontraron plantillas con los filtros seleccionados."
                  action="Limpiar filtros"
                  onAction={() => {
                    setTemplateFilter("Todas");
                    setSearch("");
                  }}
                />
              )}
            </motion.div>
          )}

          {/* ────── NOTES ────── */}
          {activeTab === "notes" && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {filteredNotes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {filteredNotes.map((n, i) => (
                      <NoteCard
                        key={n.id}
                        note={n}
                        onSelect={(note) => setEditingNote(note)}
                        onPin={toggleNotePin}
                        onDelete={deleteNote}
                        delay={i}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <EmptyState
                  icon={StickyNote}
                  title="Sin notas"
                  description="Crea tu primera nota para empezar a organizar tus ideas."
                  action="Crear nota"
                  onAction={() => setEditingNote("new")}
                />
              )}
            </motion.div>
          )}

          {/* ────── ARTICLES ────── */}
          {activeTab === "articles" && (
            <motion.div
              key="articles"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Filter bar */}
              <div className="flex items-center gap-2 mb-5">
                {["Todos", "Publicados", "Borradores", "Procesos", "Normativas", "Productos", "Logistica", "DLP"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setArticleFilter(cat)}
                    className="px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200"
                    style={{
                      background: articleFilter === cat ? T.accent : "transparent",
                      color: articleFilter === cat ? "#fff" : T.inkMuted,
                      boxShadow: articleFilter === cat ? `0 2px 8px ${T.accent}30` : "none",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filteredArticles.length > 0 ? (
                <div className="space-y-3">
                  {filteredArticles.map((a, i) => (
                    <ArticleRow
                      key={a.id}
                      article={a}
                      onSelect={(article) => setEditingArticle(article)}
                      onDelete={deleteArticle}
                      delay={i}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={BookOpen}
                  title="Sin articulos"
                  description="Crea articulos tipo DLP para documentar procesos y conocimiento."
                  action="Crear articulo"
                  onAction={() => setEditingArticle("new")}
                />
              )}
            </motion.div>
          )}

          {/* ────── PASSWORDS ────── */}
          {activeTab === "passwords" && (
            <motion.div
              key="passwords"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Security banner */}
              <div
                className="flex items-center gap-3 px-5 py-3.5 rounded-xl mb-5"
                style={{
                  background: `linear-gradient(135deg, ${T.accentLight}, ${T.violetBg})`,
                  border: `1px solid ${T.accent}20`,
                }}
              >
                <Shield className="h-5 w-5 flex-shrink-0" style={{ color: T.accent }} />
                <p className="text-[13px] font-medium flex-1" style={{ color: T.accentDark }}>
                  Las credenciales se almacenan de forma segura y encriptada. Solo tu puedes acceder a ellas.
                </p>
                <Lock className="h-4 w-4 flex-shrink-0" style={{ color: T.accent }} />
              </div>

              {/* Filter bar */}
              <div className="flex items-center gap-2 mb-5">
                {["Todas", ...PASSWORD_CATEGORIES.map((c) => c.name)].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPasswordFilter(cat)}
                    className="px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200"
                    style={{
                      background: passwordFilter === cat ? T.accent : "transparent",
                      color: passwordFilter === cat ? "#fff" : T.inkMuted,
                      boxShadow: passwordFilter === cat ? `0 2px 8px ${T.accent}30` : "none",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filteredPasswords.length > 0 ? (
                <div className="space-y-3">
                  {filteredPasswords.map((p, i) => (
                    <PasswordRow
                      key={p.id}
                      entry={p}
                      onCopy={copyToClipboard}
                      onToggleShow={togglePasswordVisibility}
                      showPassword={visiblePasswords.has(p.id)}
                      onToggleFav={togglePasswordFav}
                      onDelete={deletePassword}
                      delay={i}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Lock}
                  title="Sin credenciales"
                  description="Guarda tus credenciales de forma segura en un solo lugar."
                  action="Agregar credencial"
                  onAction={() => setEditingPassword("new")}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Quick Tips Card ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10"
        >
          <div
            className="relative overflow-hidden rounded-2xl p-6"
            style={{
              background: `linear-gradient(135deg, ${T.accent}08, ${T.violet}06, ${T.teal}04)`,
              border: `1px solid ${T.borderLight}`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${T.violet}15` }}
              >
                <Lightbulb className="h-5 w-5" style={{ color: T.violet }} />
              </div>
              <div>
                <h3 className="font-bold text-[15px] mb-1" style={{ color: T.ink }}>
                  Consejos rapidos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  {[
                    {
                      icon: Zap,
                      tip: "Usa plantillas para enviar comunicaciones estandarizadas a tus clientes.",
                      color: T.warning,
                    },
                    {
                      icon: Sparkles,
                      tip: "Las notas fijadas siempre aparecen primero para acceso rapido.",
                      color: T.accent,
                    },
                    {
                      icon: Shield,
                      tip: "Genera contrasenas seguras con el boton de generacion automatica.",
                      color: T.success,
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <item.icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: item.color }} />
                      <p className="text-[13px] leading-relaxed" style={{ color: T.inkMuted }}>
                        {item.tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Modals ──────────────────────────────────── */}
      <AnimatePresence>
        {selectedTemplate && !editingTemplate && (
          <TemplateViewModal
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onEdit={(tmpl) => {
              setSelectedTemplate(null);
              setEditingTemplate(tmpl);
            }}
          />
        )}
        {editingTemplate !== null && (
          <TemplateEditorModal
            template={editingTemplate === "new" ? null : editingTemplate}
            onSave={saveTemplate}
            onClose={() => setEditingTemplate(null)}
          />
        )}
        {editingNote !== null && (
          <NoteEditorModal
            note={editingNote === "new" ? null : editingNote}
            onSave={saveNote}
            onClose={() => setEditingNote(null)}
          />
        )}
        {editingArticle !== null && (
          <ArticleEditorModal
            article={editingArticle === "new" ? null : editingArticle}
            onSave={saveArticle}
            onClose={() => setEditingArticle(null)}
          />
        )}
        {editingPassword !== null && (
          <PasswordModal
            entry={editingPassword === "new" ? null : editingPassword}
            onSave={savePassword}
            onClose={() => setEditingPassword(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
