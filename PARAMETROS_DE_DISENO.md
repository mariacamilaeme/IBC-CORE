# Parámetros de Diseño — IBC Core

Sistema de diseño completo de la aplicación IBC Core (IBC Steel Group). Este documento contiene **todos** los efectos, animaciones, instrucciones de cómo construir formularios, tarjetas flotantes, modales glassmorphism, KPIs, filtros y cada patrón visual utilizado en la app.

---

## Tabla de Contenido

1. [Colores del Sistema](#1-colores-del-sistema)
2. [Tipografía y Textos](#2-tipografía-y-textos)
3. [Tarjetas Flotantes / Modales Glassmorphism](#3-tarjetas-flotantes--modales-glassmorphism)
4. [Tarjetas KPI Interactivas](#4-tarjetas-kpi-interactivas)
5. [Tarjetas de Contenido (Cards Grid)](#5-tarjetas-de-contenido-cards-grid)
6. [Barra de Filtros Premium (Popover Drill-Down)](#6-barra-de-filtros-premium-popover-drill-down)
7. [Formularios (Forms)](#7-formularios-forms)
8. [Badges y Estados](#8-badges-y-estados)
9. [Animaciones y Transiciones](#9-animaciones-y-transiciones)
10. [Skeletons y Estados Vacíos](#10-skeletons-y-estados-vacíos)
11. [Tablas](#11-tablas)
12. [Sidebar y Header](#12-sidebar-y-header)
13. [Dashboard Header](#13-dashboard-header)
14. [Iconos y Contenedores de Iconos](#14-iconos-y-contenedores-de-iconos)
15. [CSS Variables y Animaciones Globales](#15-css-variables-y-animaciones-globales)
16. [Constantes Exportadas (utils.ts)](#16-constantes-exportadas-utilsts)
17. [Componentes UI Disponibles](#17-componentes-ui-disponibles)

---

## 1. Colores del Sistema

### Colores Principales (Brand)

| Nombre | Hex | Variable CSS | Uso |
|--------|-----|-------------|-----|
| **Primary Navy** | `#1E3A5F` | `--color-steel-primary` | Títulos, CTAs, iconos principales, sidebar |
| **Secondary Slate** | `#64748B` | `--color-steel-secondary` | Textos secundarios |
| **Accent Blue** | `#3B82F6` | `--color-steel-accent` | Acentos, links, hover |
| **Background** | `#F8FAFC` | `--color-steel-bg` | Fondo general de la app |
| **Success Green** | `#10B981` | `--color-steel-success` | Estados positivos, pagado, completado |
| **Warning Amber** | `#F59E0B` | `--color-steel-warning` | Pendiente, en producción |
| **Error Red** | `#EF4444` | `--color-steel-error` | Anulado, error, eliminar |

### Gradientes Principales

```css
/* Navy Principal */
bg-gradient-to-r from-[#1E3A5F] to-blue-600

/* Navy extendido (sidebar, header dashboard) */
bg-gradient-to-r from-[#1E3A5F] via-[#2a4d7a] to-blue-600

/* Status Gradients */
En Tránsito:         from-blue-500 to-cyan-500
En Producción:       from-amber-500 to-orange-500
Pendiente Anticipo:  from-slate-400 to-slate-500
Entregado:           from-emerald-500 to-green-400
Anulado:             from-red-500 to-red-600
Tonelaje:            from-indigo-500 to-violet-500
Saldo Pendiente:     from-rose-500 to-red-500
```

### Colores de Estado (Contratos)

```typescript
const CONTRACT_STATUS_COLORS = {
  "ENTREGADO AL CLIENTE": "bg-green-100 text-green-800 border-green-200",
  "EN TRÁNSITO":          "bg-blue-100 text-blue-800 border-blue-200",
  "EN PRODUCCIÓN":        "bg-amber-100 text-amber-800 border-amber-200",
  "ANULADO":              "bg-red-100 text-red-800 border-red-200",
  "PENDIENTE ANTICIPO":   "bg-gray-100 text-gray-800 border-gray-200",
};
```

### Colores de Punto (Status Dots)

```typescript
const CONTRACT_STATUS_DOT_COLORS = {
  "ENTREGADO AL CLIENTE": "bg-emerald-500",
  "EN TRÁNSITO":          "bg-blue-500",
  "EN PRODUCCIÓN":        "bg-amber-500",
  "ANULADO":              "bg-red-500",
  "PENDIENTE ANTICIPO":   "bg-slate-400",
};
```

### Jerarquía de Colores de Texto

| Nivel | Clase | Uso |
|-------|-------|-----|
| Título principal | `text-[#1E3A5F]` o `text-slate-800` | Headings, valores principales |
| Texto normal | `text-slate-600` a `text-slate-700` | Contenido, nombres |
| Texto secundario | `text-slate-400` a `text-slate-500` | Labels, subtítulos |
| Texto deshabilitado | `text-slate-300` | Placeholders, separadores |
| Texto sobre fondo oscuro | `text-white`, `text-blue-100/70` | Sidebar, header gradient |

---

## 2. Tipografía y Textos

### Fuentes

```
Principal: Geist Sans (--font-geist-sans)
Monoespaciada: Geist Mono (--font-geist-mono)
Rendering: antialiased
```

### Tamaños y Pesos

| Elemento | Clases |
|----------|--------|
| Título de página | `text-2xl font-bold text-[#1E3A5F]` |
| Subtítulo de página | `text-sm text-muted-foreground mt-1` |
| Label KPI | `text-[11px] font-semibold uppercase tracking-wider text-slate-400` |
| Valor KPI | `text-2xl font-bold tabular-nums` |
| Subtítulo KPI | `text-[10px] text-slate-400 mt-0.5` |
| Label de sección | `text-[10px] font-semibold uppercase tracking-wider text-slate-400` |
| Label formulario | `text-xs font-medium text-slate-700` |
| Texto de tarjeta título | `text-sm font-bold text-[#1E3A5F]` |
| Texto de tarjeta subtítulo | `text-[11px] text-slate-400 mt-0.5` |
| Badge texto | `text-[10px] font-semibold` |
| Badge mini | `text-[9px] font-semibold` |
| Stats inline | `text-[11px] text-slate-500` |
| Números tabulares | `tabular-nums` (siempre en valores numéricos) |

---

## 3. Tarjetas Flotantes / Modales Glassmorphism

Este es el patrón principal para diálogos de edición y detalle. Se usa en: **Contratos, Clientes, Embarques, Facturas**.

### Estructura HTML Completa

```tsx
{modalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* Overlay oscuro con blur */}
    <div
      className="absolute inset-0 bg-slate-900/50 backdrop-blur-md transition-opacity duration-300"
      onClick={() => setModalOpen(false)}
    />

    {/* Card principal flotante */}
    <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-white/30 bg-white/85 backdrop-blur-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-300">

      {/* Barra de acento gradient superior */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-[#1E3A5F] via-blue-500 to-cyan-400" />

      {/* Botón cerrar */}
      <button
        onClick={() => setModalOpen(false)}
        className="absolute top-4 right-4 rounded-full p-2 bg-slate-100/80 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all duration-200 hover:scale-110 hover:rotate-90"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header con icono */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <IconComponent className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E3A5F]">Título</h2>
            <p className="text-xs text-slate-400">Subtítulo</p>
          </div>
        </div>
      </div>

      {/* Contenido scrollable */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="px-6 py-4">
          {/* Contenido aquí */}
        </div>
      </ScrollArea>
    </div>
  </div>
)}
```

### Variantes de Tamaño

| Módulo | max-width |
|--------|-----------|
| Contratos | `max-w-3xl` |
| Clientes | `max-w-3xl` |
| Embarques (motonave) | `max-w-5xl` |
| Facturas | `max-w-xl` |

### Color de Barra de Acento por Acción

```css
/* Visualizar */
bg-gradient-to-r from-[#1E3A5F] via-blue-500 to-cyan-400

/* Editar */
Icono container: bg-gradient-to-br from-amber-500 to-orange-500

/* Crear nuevo */
Icono container: bg-gradient-to-br from-emerald-500 to-green-500

/* Por estado (embarques/motonaves) */
EN TRÁNSITO:         from-blue-500 to-cyan-400
EN PRODUCCIÓN:       from-amber-500 to-orange-400
PENDIENTE ANTICIPO:  from-slate-400 to-slate-500
ENTREGADO:           from-emerald-500 to-green-400
```

### Botón Cerrar (Variante alternativa compacta)

```tsx
<button
  onClick={() => setOpen(false)}
  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white/50 text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
>
  <X className="h-4 w-4" />
</button>
```

---

## 4. Tarjetas KPI Interactivas

Patrón usado en: **Dashboard, Contratos, Embarques, Clientes**.

### Grid Layout

```tsx
<div className="grid grid-cols-2 md:grid-cols-5 gap-3">
  {/* 5 KPIs por fila en desktop, 2 en móvil */}
</div>

{/* Alternativa 4 columnas */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
```

### Estructura de Cada KPI Card

```tsx
<div
  onClick={() => handleFilter(kpi.filterKey)}
  className={cn(
    "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer select-none",
    kpi.bg,
    isActive
      ? cn("ring-2 shadow-lg scale-[1.02] -translate-y-0.5 border-transparent", kpi.ring)
      : "border-slate-100/80"
  )}
>
  {/* Barra de acento superior */}
  <div className={cn(
    "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r transition-all",
    kpi.gradient,
    isActive && "h-1.5"
  )} />

  <div className="flex items-center justify-between">
    <div>
      {/* Label */}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
        {kpi.label}
      </p>
      {/* Valor */}
      <p className={cn("text-2xl font-bold tabular-nums", kpi.text)}>
        {kpi.value}
      </p>
      {/* Subtítulo opcional */}
      {kpi.subtitle && (
        <p className="text-[10px] text-slate-400 mt-0.5">{kpi.subtitle}</p>
      )}
    </div>
    {/* Icono */}
    <div className={cn(
      "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br opacity-80 group-hover:opacity-100 transition-opacity shadow-sm text-white",
      kpi.gradient,
      isActive && "opacity-100"
    )}>
      <kpi.icon className="h-4.5 w-4.5" />
    </div>
  </div>
</div>
```

### Configuración de Colores por KPI

```typescript
// Cada KPI se define con estas propiedades:
{
  label: "Nombre",
  value: 123,
  filterKey: "clave_filtro",
  gradient: "from-[#1E3A5F] to-blue-600",   // Barra superior + icono
  bg: "from-blue-50/80 to-white",            // Fondo de la tarjeta
  text: "text-[#1E3A5F]",                    // Color del valor
  icon: Ship,                                 // Componente icono Lucide
  ring: "ring-[#1E3A5F]/50",                 // Ring cuando activo
  isCurrency: true,                           // Opcional: formatear como moneda
  isTonnage: true,                            // Opcional: formatear con "t"
  subtitle: "5 contratos",                    // Opcional: texto debajo del valor
}
```

### Paleta de KPIs Disponibles

| Color | gradient | bg | text | ring |
|-------|----------|-----|------|------|
| Navy | `from-[#1E3A5F] to-blue-600` | `from-blue-50/80 to-white` | `text-[#1E3A5F]` | `ring-[#1E3A5F]/50` |
| Cyan | `from-blue-500 to-cyan-500` | `from-cyan-50/80 to-white` | `text-cyan-700` | `ring-cyan-400` |
| Amber | `from-amber-500 to-orange-500` | `from-amber-50/80 to-white` | `text-amber-700` | `ring-amber-400` |
| Indigo | `from-indigo-500 to-violet-500` | `from-indigo-50/80 to-white` | `text-indigo-700` | `ring-indigo-400` |
| Rose | `from-rose-500 to-red-500` | `from-rose-50/80 to-white` | `text-rose-700` | `ring-rose-400` |
| Emerald | `from-emerald-500 to-green-600` | `from-emerald-50 to-white` | `text-emerald-700` | `ring-emerald-400` |
| Violet | `from-violet-500 to-purple-600` | `from-violet-50 to-white` | `text-violet-700` | `ring-violet-400` |
| Slate | `from-slate-400 to-slate-500` | `from-slate-50 to-white` | `text-slate-600` | `ring-slate-400` |

---

## 5. Tarjetas de Contenido (Cards Grid)

### Grid Layouts

```css
/* Clientes: 3 columnas */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4

/* Motonaves: 2 columnas */
grid grid-cols-1 lg:grid-cols-2 gap-5
```

### Card Container Base

```css
/* Card estándar (clientes) */
group relative rounded-2xl border border-slate-100/80 bg-white shadow-sm
hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5
transition-all duration-300 cursor-pointer overflow-hidden

/* Card con backdrop blur (motonaves) */
group relative rounded-2xl border border-slate-100/80 bg-white/80 backdrop-blur-sm
shadow-sm hover:shadow-xl hover:scale-[1.005]
transition-all duration-300 overflow-hidden cursor-pointer
```

### Barra de Acento Superior (condicional por estado)

```tsx
<div className={cn(
  "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
  status === "EN TRÁNSITO" ? "from-blue-500 to-cyan-400" :
  status === "EN PRODUCCIÓN" ? "from-amber-500 to-orange-400" :
  status === "PENDIENTE ANTICIPO" ? "from-slate-400 to-slate-500" :
  status === "ENTREGADO AL CLIENTE" ? "from-emerald-500 to-green-400" :
  "from-slate-400 to-slate-500"
)} />
```

### Card Header

```tsx
<div className="px-5 pt-5 pb-3">
  <div className="flex items-start justify-between gap-2">
    {/* Icono avatar */}
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A5F] to-blue-600 shadow-sm">
        <Ship className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-[#1E3A5F] group-hover:text-blue-700 transition-colors truncate">
          {titulo}
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitulo}</p>
      </div>
    </div>
    {/* Badges */}
    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
      {/* Status badge, ETA badge, etc. */}
    </div>
  </div>
</div>
```

### Stats Row (debajo del header)

```tsx
<div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500">
  <span className="flex items-center gap-1">
    <FileText className="h-3 w-3" />
    {count} contratos
  </span>
  <span className="flex items-center gap-1">
    <Weight className="h-3 w-3" />
    {tons} t
  </span>
  {pending > 0 && (
    <span className="flex items-center gap-1 text-rose-600 font-medium">
      <DollarSign className="h-3 w-3" />
      {formatCurrency(pending)}
    </span>
  )}
</div>
```

### Divider

```css
mx-5 border-t border-slate-100
```

### Mini-Cards (filas dentro de tarjeta)

```css
rounded-xl border border-slate-100/80 bg-slate-50/50 hover:bg-slate-50 p-3 transition-colors
```

---

## 6. Barra de Filtros Premium (Popover Drill-Down)

### Container de Barra de Filtros

```tsx
<div className="flex flex-wrap gap-2.5 items-center rounded-2xl border border-slate-100/80 bg-gradient-to-r from-white to-slate-50/50 p-3 shadow-sm">
```

### Input de Búsqueda

```tsx
<div className="relative flex-1 min-w-[200px] max-w-sm">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
  <input
    type="text"
    placeholder="Buscar motonave, cliente, contrato..."
    className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-slate-200 bg-white/80 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/30 transition-all"
  />
  {value && (
    <button className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-100 transition-colors">
      <X className="h-3.5 w-3.5 text-slate-400" />
    </button>
  )}
</div>
```

### Botón de Filtros

```tsx
<Button variant="outline" size="sm" className="h-10 gap-1.5 text-sm rounded-xl border-slate-200 hover:border-[#1E3A5F]/30 hover:bg-blue-50/50 transition-all duration-200">
  <SlidersHorizontal className="h-4 w-4" />
  Filtros
  {filterCount > 0 && (
    <Badge className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] bg-gradient-to-r from-[#1E3A5F] to-blue-600 text-white border-0 shadow-sm">
      {filterCount}
    </Badge>
  )}
</Button>
```

### Panel Popover

```tsx
<PopoverContent
  className="w-[420px] max-h-[70vh] p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl shadow-slate-900/10 flex flex-col"
  align="start"
  sideOffset={8}
>
```

### Header del Panel (Nivel 1: Categorías)

```tsx
<div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
  <div className="flex items-center gap-2.5">
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1E3A5F] to-blue-600 shadow-sm">
      <SlidersHorizontal className="h-3.5 w-3.5 text-white" />
    </div>
    <h4 className="text-sm font-bold text-slate-800">Filtros</h4>
    {count > 0 && <Badge className="...">{count}</Badge>}
  </div>
  {count > 0 && (
    <button className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors">
      Limpiar todo
    </button>
  )}
</div>
```

### Botón de Categoría (navegar al panel de checkboxes)

```tsx
<button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-slate-50/50 transition-all duration-150 text-left group">
  <div className="flex items-center gap-2.5">
    <Icon className="h-4 w-4 text-slate-400 group-hover:text-[#1E3A5F] transition-colors" />
    <span className="text-sm text-slate-700">{label}</span>
    {selected.length > 0 && (
      <Badge className="h-4.5 px-1.5 text-[10px] bg-[#1E3A5F] text-white border-0">
        {selected.length}
      </Badge>
    )}
  </div>
  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
</button>
```

### Panel de Checkboxes (Nivel 2: Drill-down)

```tsx
{/* Header con botón atrás */}
<div className="flex items-center gap-2.5 px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-white">
  <button className="p-1 rounded-lg hover:bg-slate-200/70 transition-colors">
    <ChevronLeft className="h-4 w-4 text-slate-500" />
  </button>
  <h4 className="text-sm font-bold text-slate-800">{panelTitle}</h4>
</div>

{/* Búsqueda dentro del panel */}
<div className="px-3 py-2 border-b">
  <Input className="h-8 pl-8 text-xs" placeholder="Buscar..." />
</div>

{/* Seleccionar todo */}
<div className="flex items-center justify-between px-3 py-1.5 border-b bg-slate-50/50">
  <button className="text-xs text-[#1E3A5F] hover:underline font-semibold">
    Seleccionar todo
  </button>
  <button className="text-xs text-red-500 hover:underline">Limpiar</button>
</div>

{/* Items con checkboxes */}
<label className="flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-slate-50 cursor-pointer transition-colors">
  <Checkbox className="h-4 w-4" checked={isSelected} />
  <span className="text-sm text-slate-700 truncate">{option}</span>
</label>
```

### Filtro ETA Jerárquico (Año → Mes → Día)

```tsx
{/* Nivel Año */}
<div className="flex items-center gap-1 px-1 py-1 rounded hover:bg-slate-50">
  <button>{expanded ? <ChevronDown /> : <ChevronRight />}</button>
  <Checkbox checked={allSelected} indeterminate={someSelected} />
  <span className="text-sm font-semibold text-slate-800">{year}</span>
</div>

{/* Nivel Mes (indentado) */}
<div className="flex items-center gap-1 pl-6 pr-1 py-1 rounded hover:bg-slate-50">
  <button>{expanded ? <ChevronDown /> : <ChevronRight />}</button>
  <Checkbox />
  <span className="text-sm text-slate-700">{monthName}</span>
</div>

{/* Nivel Día (doble indentado) */}
<label className="flex items-center gap-2.5 pl-14 pr-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
  <Checkbox className="h-4 w-4" />
  <span className="text-sm text-slate-600">{day}</span>
</label>
```

---

## 7. Formularios (Forms)

### Contenedor del Formulario (dentro del modal glassmorphism)

```tsx
<div className="px-6 py-4 space-y-5">
  {/* Secciones del formulario */}
</div>
```

### Tabs de Sección (Multi-pestaña)

```tsx
<TabsList className="w-full grid grid-cols-4 mb-5 h-11 bg-slate-100/80 rounded-xl p-1 gap-1">
  <TabsTrigger className="text-xs gap-1.5 rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-[#1E3A5F] transition-all duration-200">
    <Icon className="h-3.5 w-3.5" />
    Nombre Tab
  </TabsTrigger>
</TabsList>
```

### Sección de Formulario

```tsx
<div className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-white/60 to-slate-50/40 p-4 space-y-3">
  {/* Header de sección */}
  <div className="flex items-center gap-2 mb-1">
    <div className="h-6 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
      Nombre Sección
    </h3>
  </div>

  {/* Grid de campos */}
  <div className="grid grid-cols-2 gap-3">
    {/* Campos */}
  </div>
</div>
```

### Colores de Sección por Tema

| Sección | Gradient de la barra vertical |
|---------|-------------------------------|
| Personas / General | `from-blue-500 to-blue-600` |
| Contratos / Datos | `from-violet-500 to-violet-600` |
| Logística / Producto | `from-emerald-500 to-emerald-600` |
| Pagos / Estado | `from-amber-500 to-amber-600` |
| Tránsito / Fechas | `from-blue-500 to-blue-600` |
| Entrega | `from-emerald-500 to-emerald-600` |

### Campo de Formulario (Input)

```tsx
<div className="space-y-2">
  <Label className="text-xs font-medium text-slate-700">Nombre Campo</Label>
  <Input placeholder="Placeholder..." />
</div>
```

### Campo Solo Lectura (ReadOnlyField - View Mode)

```tsx
<div className="group relative rounded-xl px-3.5 py-2.5 bg-gradient-to-br border transition-all duration-200 hover:shadow-sm hover:scale-[1.01] from-blue-500/10 to-transparent border-blue-200/40">
  <div className="flex items-start gap-2.5">
    <Icon className="h-3.5 w-3.5 mt-0.5 text-blue-500/70" />
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="text-sm font-medium text-slate-800 truncate">
        {value || <span className="italic text-slate-300">Sin datos</span>}
      </p>
    </div>
  </div>
</div>
```

### Variantes de Color para ReadOnlyField

| Color | border + bg gradient | icon color |
|-------|---------------------|------------|
| blue | `from-blue-500/10 to-transparent border-blue-200/40` | `text-blue-500/70` |
| emerald | `from-emerald-500/10 to-transparent border-emerald-200/40` | `text-emerald-500/70` |
| amber | `from-amber-500/10 to-transparent border-amber-200/40` | `text-amber-500/70` |
| violet | `from-violet-500/10 to-transparent border-violet-200/40` | `text-violet-500/70` |
| rose | `from-rose-500/10 to-transparent border-rose-200/40` | `text-rose-500/70` |
| slate | `from-slate-500/5 to-transparent border-slate-200/40` | `text-slate-400` |

### Botones en Formularios

```tsx
{/* Botón primario (guardar/crear) */}
<Button className="mt-4 rounded-xl bg-gradient-to-r from-[#1E3A5F] to-blue-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg transition-all">
  Guardar
</Button>

{/* Botón secundario (outline) */}
<Button variant="outline" className="h-10 gap-1.5 text-sm rounded-xl border-slate-200 hover:border-[#1E3A5F]/30 hover:bg-blue-50/50 transition-all duration-200">
  Cancelar
</Button>

{/* Botón destructivo (ghost) */}
<Button variant="ghost" className="hover:bg-red-50 hover:text-red-600">
  Eliminar
</Button>
```

### Metadata del Registro (parte inferior del formulario en vista)

```tsx
<div className="rounded-2xl bg-gradient-to-r from-slate-50/80 to-slate-100/50 border border-slate-100/60 p-4">
  <div className="flex items-center gap-4 text-xs text-slate-400">
    <span>Creado: {formatDate(created_at)}</span>
    <span>Modificado: {formatDate(updated_at)}</span>
  </div>
</div>
```

---

## 8. Badges y Estados

### Badge de Estado (con punto de color)

```tsx
<Badge
  variant="outline"
  className={cn(
    "text-[10px] font-semibold gap-1.5 rounded-lg px-2.5 py-1",
    CONTRACT_STATUS_COLORS[status]
  )}
>
  <span className={cn(
    "h-1.5 w-1.5 rounded-full inline-block",
    CONTRACT_STATUS_DOT_COLORS[status]
  )} />
  {CONTRACT_STATUS_LABELS[status]}
</Badge>
```

### Badge Mini (dentro de mini-cards)

```css
text-[9px] font-semibold gap-1 rounded-md px-2 py-0.5
```

### Badge de Fecha/ETA

```css
text-[10px] bg-blue-50 text-blue-700 border-blue-200 gap-1
```

### Badge Contador (filtros)

```css
h-5 min-w-[20px] px-1.5 text-[10px] bg-gradient-to-r from-[#1E3A5F] to-blue-600 text-white border-0 shadow-sm
```

### Badge en Tabla

```css
bg-amber-50 text-amber-700 border-amber-200 text-[10px] rounded-md
```

---

## 9. Animaciones y Transiciones

### Clases de Transición

| Clase | Uso |
|-------|-----|
| `transition-all duration-300` | Cards, modales, elementos principales |
| `transition-all duration-200` | Botones, links, elementos pequeños |
| `transition-all duration-150` | Botones de filtro, micro-interacciones |
| `transition-colors` | Solo cambio de color (links, textos) |
| `transition-opacity` | Fade de iconos y elementos decorativos |

### Hover Effects

```css
/* KPI Cards */
hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5

/* Client Cards */
hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5

/* Vessel Cards */
hover:shadow-xl hover:scale-[1.005]

/* Botón cerrar modal */
hover:scale-110 hover:rotate-90

/* Chevron en filtros */
group-hover:translate-x-0.5

/* Read-only fields */
hover:shadow-sm hover:scale-[1.01]
```

### Animaciones Definidas en CSS

```css
/* Fade In Up (principal para carga de cards) */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
}
/* Uso con delay escalonado: style={{ animationDelay: `${index * 80}ms` }} */

/* Slide In Left */
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}
.animate-slide-in-left { animation: slideInLeft 0.5s ease-out forwards; }

/* Scale In */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
.animate-scale-in { animation: scaleIn 0.4s ease-out forwards; }

/* Shimmer (skeleton loading premium) */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.animate-shimmer {
  background: linear-gradient(90deg, transparent, rgba(59,130,246,0.1), transparent);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

/* Pulse Glow */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 15px rgba(30,58,95,0.2); }
  50% { box-shadow: 0 0 30px rgba(30,58,95,0.4); }
}
.animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }

/* Modal entry (shadcn) */
animate-in fade-in zoom-in-95 duration-300
```

### Sidebar Transition

```css
.sidebar-transition {
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 10. Skeletons y Estados Vacíos

### Skeleton de KPI Grid

```tsx
<div className="grid grid-cols-2 md:grid-cols-5 gap-3">
  {Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="rounded-2xl border border-slate-100/80 bg-gradient-to-br from-slate-50 to-white p-4 animate-pulse">
      <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
      <div className="h-7 w-12 bg-slate-200 rounded" />
    </div>
  ))}
</div>
```

### Skeleton de Card Grid

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  {Array.from({ length: 4 }).map((_, i) => (
    <div key={i} className="rounded-2xl border border-slate-100/80 bg-white/80 p-6 animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 bg-slate-200 rounded-xl" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="h-3 w-24 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-3 w-3/4 bg-slate-100 rounded" />
      </div>
    </div>
  ))}
</div>
```

### Skeleton de Tabla

```tsx
<div className="flex items-center gap-3 py-2 px-2">
  <div className="h-3 w-[15%] bg-slate-200 rounded animate-pulse" />
  <div className="h-3 w-[25%] bg-slate-200 rounded animate-pulse" />
  <div className="h-3 w-[20%] bg-slate-200 rounded animate-pulse" />
  <div className="h-3 w-[15%] bg-slate-200 rounded animate-pulse" />
</div>
```

### Estado Vacío

```tsx
<div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-slate-100/80 bg-white/80 backdrop-blur-sm">
  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-3">
    <Ship className="h-7 w-7 text-slate-300" />
  </div>
  <p className="text-sm font-semibold text-slate-500">No hay datos disponibles</p>
  <p className="text-xs text-slate-400 mt-1">Los datos aparecerán aquí cuando estén disponibles</p>
</div>
```

### Estado Vacío con Filtros

```tsx
<div className="flex flex-col items-center justify-center h-40 rounded-2xl border border-dashed border-slate-200 bg-white/50">
  <Ship className="h-8 w-8 text-slate-300 mb-2" />
  <p className="text-sm text-slate-400">No hay resultados para el filtro seleccionado</p>
  <button className="mt-2 text-sm text-[#1E3A5F] hover:underline font-medium">
    Ver todos
  </button>
</div>
```

---

## 11. Tablas

### Table Header

```css
bg-gradient-to-r from-slate-50 to-transparent

TableHead: text-xs font-bold text-slate-500
```

### Table Row

```css
hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent transition-colors
```

### Table Cell

```css
/* Texto normal */
text-sm text-slate-700

/* Título resaltado */
font-bold text-[#1E3A5F]

/* Números */
text-right tabular-nums

/* Con hover en row */
group-hover/row:text-blue-700
```

---

## 12. Sidebar y Header

### Sidebar

```css
/* Container */
Gradient: from-[#1E3A5F] via-[#1a3355] to-[#152a47]
Expanded: w-[260px]
Collapsed: w-[72px]
Shadow: shadow-[4px_0_24px_-4px_rgba(0,0,0,0.2)]
Transition: sidebar-transition (cubic-bezier)

/* Link */
rounded-xl text-sm font-medium transition-all duration-200
text-blue-100/60 hover:text-white hover:bg-white/8

/* Link activo */
bg-white/15 ring-1 ring-white/10 shadow-lg shadow-black/10 text-white font-bold

/* Divider */
bg-gradient-to-r from-transparent via-white/15 to-transparent
```

### Header

```css
/* Container */
h-16 bg-white/80 backdrop-blur-xl border-b border-slate-100
shadow-[0_1px_3px_rgba(0,0,0,0.04)] sticky top-0 z-30

/* Search */
w-64 h-9 pl-9 bg-slate-50/80 border-slate-200/80 rounded-xl
focus:bg-white transition-colors

/* Notification badge */
absolute -top-0.5 -right-0.5 h-4.5 min-w-[18px]
bg-gradient-to-r from-red-500 to-rose-500 text-white border-2 border-white
```

---

## 13. Dashboard Header

```tsx
<div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E3A5F] via-[#2a4d7a] to-blue-600 p-6 shadow-xl shadow-blue-900/10">
  {/* Patrón SVG decorativo como background */}
  <div className="absolute inset-0 opacity-50" style={{ backgroundImage: `url("data:image/svg+xml,...")` }} />

  <div className="relative">
    <h1 className="text-2xl font-bold text-white tracking-tight">
      Buenos días, {nombre}
    </h1>
    <p className="text-sm text-blue-100/70 mt-1">
      {formatDate en español}
    </p>
  </div>
</div>
```

---

## 14. Iconos y Contenedores de Iconos

### Tamaños de Avatar/Contenedor de Icono

| Tamaño | Clases | Uso |
|--------|--------|-----|
| XS (7×7) | `h-7 w-7 rounded-lg` | Filtros, paneles |
| SM (9×9) | `h-9 w-9 rounded-xl` | KPIs, quick actions |
| MD (11×11) | `h-11 w-11 rounded-xl` | Cards, headers de tarjeta |
| LG (12×12) | `h-12 w-12 rounded-2xl` | Headers de modal |

### Estilo Base

```css
flex items-center justify-center bg-gradient-to-br from-[color] to-[color] shadow-sm text-white
```

### Tamaños de Icono

| Tamaño | Uso |
|--------|-----|
| `h-3 w-3` | Stats inline, mini indicadores |
| `h-3.5 w-3.5` | Botones pequeños, tabs |
| `h-4 w-4` | Botones, filtros, badges |
| `h-4.5 w-4.5` | KPI icons |
| `h-5 w-5` | Card headers |
| `h-6 w-6` | Modal headers |
| `h-7 w-7` | Empty states |
| `h-8 w-8` | Spinner, empty states grandes |

---

## 15. CSS Variables y Animaciones Globales

Definidas en `src/app/globals.css`:

```css
:root {
  --radius: 0.625rem;
  --color-steel-primary: #1E3A5F;
  --color-steel-secondary: #64748B;
  --color-steel-accent: #3B82F6;
  --color-steel-bg: #F8FAFC;
  --color-steel-success: #10B981;
  --color-steel-warning: #F59E0B;
  --color-steel-error: #EF4444;
}

/* Scrollbar personalizado */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
```

---

## 16. Constantes Exportadas (utils.ts)

Ubicación: `src/lib/utils.ts`

### Funciones de Formato

```typescript
cn(...inputs)           // Merge de clases Tailwind (clsx + twMerge)
formatDate(date)        // "dd/MM/yyyy" en español. Retorna "—" si null
formatDateTime(date)    // "dd/MM/yyyy HH:mm"
formatRelativeDate(date) // "hace 2 horas" (español)
formatCurrency(amount, currency = "USD") // Intl.NumberFormat es-CO
formatNumber(num)       // Intl.NumberFormat es-CO
```

### Todas las Constantes de Labels

```typescript
CONTRACT_STATUS_LABELS    // Estados de contrato
CONTRACT_STATUS_COLORS    // Clases CSS por estado de contrato
SHIPMENT_STATUS_LABELS    // Estados de embarque
QUOTATION_STATUS_LABELS   // Estados de cotización
PAYMENT_STATUS_LABELS     // Estados de pago
PRODUCT_LINE_LABELS       // Líneas de producto
CLIENT_TYPE_LABELS        // Tipos de cliente
ROLE_LABELS               // Roles de usuario
PRIORITY_LABELS           // Prioridades
REMINDER_TYPE_LABELS      // Tipos de recordatorio
```

---

## 17. Componentes UI Disponibles

Ubicación: `src/components/ui/`

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| Badge | `badge.tsx` | Etiquetas de estado con variantes |
| Button | `button.tsx` | Botones con variantes y tamaños |
| Calendar | `calendar.tsx` | Selector de fecha |
| Card | `card.tsx` | Contenedor con header/content/footer |
| Checkbox | `checkbox.tsx` | Casilla de verificación |
| Dialog | `dialog.tsx` | Diálogo modal |
| Input | `input.tsx` | Campo de texto |
| Label | `label.tsx` | Etiqueta de formulario |
| Popover | `popover.tsx` | Popup flotante |
| ScrollArea | `scroll-area.tsx` | Área scrollable personalizada |
| Select | `select.tsx` | Selector dropdown |
| Sheet | `sheet.tsx` | Panel lateral deslizable |
| Skeleton | `skeleton.tsx` | Placeholder de carga |
| Switch | `switch.tsx` | Toggle |
| Table | `table.tsx` | Tabla de datos |
| Tabs | `tabs.tsx` | Pestañas |
| Textarea | `textarea.tsx` | Área de texto multi-línea |
| Tooltip | `tooltip.tsx` | Tooltip informativo |

Todos basados en **Radix UI** + **Shadcn/ui** + **Class Variance Authority (CVA)**.

---

## Resumen Rápido de Patrones

| Qué necesitas | Patrón |
|---------------|--------|
| Modal/Editor | Glassmorphism flotante (sección 3) |
| KPIs arriba | Grid 5 cols + cards interactivas (sección 4) |
| Grid de tarjetas | Cards con accent bar + mini-cards (sección 5) |
| Filtros avanzados | Popover drill-down 2 niveles (sección 6) |
| Formulario | Secciones con barra vertical + grid 2 cols (sección 7) |
| Estado/Badge | Badge outline + dot de color (sección 8) |
| Loading | animate-pulse skeletons (sección 10) |
| Buscar | Input con icono Search a la izquierda (sección 6) |
