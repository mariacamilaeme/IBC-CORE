// =====================================================
// IBC CORE - TypeScript Type Definitions
// Complete type system matching the Supabase database schema
// =====================================================

// =====================================================
// Enums & Literal Types
// =====================================================

export type UserRole = 'admin' | 'directora' | 'analista' | 'comercial';

export type ClientType = 'nacional' | 'internacional' | 'distribuidor' | 'usuario_final';

export type ProductLine = 'agro' | 'mp' | 'maquinas' | 'otro';

export type QuotationStatus =
  | 'pendiente'
  | 'en_proceso'
  | 'enviada_cliente'
  | 'aprobada'
  | 'rechazada'
  | 'contrato'
  | 'vencida';

export type PaymentStatus = 'pendiente' | 'parcial' | 'pagada' | 'vencida' | 'anulada';

export type ShipmentStatus =
  | 'reservado'
  | 'en_puerto_origen'
  | 'en_transito'
  | 'en_puerto_destino'
  | 'en_aduana'
  | 'nacionalizado'
  | 'entregado'
  | 'con_novedad';

export type ReminderType =
  | 'pago'
  | 'contrato'
  | 'anticipo'
  | 'liberacion'
  | 'motonave'
  | 'produccion'
  | 'custom';

export type ReminderPriority = 'baja' | 'media' | 'alta' | 'urgente';

export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'login'
  | 'logout'
  | 'export'
  | 'generate_document'
  | 'send_email';

// =====================================================
// Helper / Embedded Types
// =====================================================

export interface StatusHistoryEntry {
  status: string;
  date: string;
  user_id: string;
  user_name: string;
  notes: string;
}

export interface PartialPayment {
  amount: number;
  date: string;
  reference: string;
  method: string;
  notes: string;
}

export interface ShippingAddress {
  label: string;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  notes?: string;
}

export interface AdditionalContact {
  name: string;
  position: string;
  email: string;
  phone: string;
}

export interface QuotationItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface PackingListItem {
  description: string;
  quantity: number;
  packages: number;
  gross_weight: number;
  net_weight: number;
  dimensions: string;
}

export interface ShipmentDocument {
  name: string;
  type: string;
  url: string;
  uploaded_at: string;
}

export interface ShipmentIncident {
  date: string;
  description: string;
  resolution: string;
  reported_by: string;
}

// =====================================================
// Main Entity Interfaces
// =====================================================

// ----- 1. Profile -----
export interface Profile {
  id?: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  last_login_at: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

// ----- 2. SystemConfig -----
export interface SystemConfig {
  id?: string;
  company_name: string | null;
  company_tax_id: string | null;
  company_address: string | null;
  company_city: string | null;
  company_country: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_logo_url: string | null;
  default_currency: string | null;
  exchange_rate_usd_cop: number | null;
  invoice_prefix: string | null;
  invoice_next_number: number | null;
  quotation_prefix: string | null;
  quotation_next_number: number | null;
  packing_list_prefix: string | null;
  packing_list_next_number: number | null;
  shipment_prefix: string | null;
  shipment_next_number: number | null;
  fiscal_data: Record<string, unknown> | null;
  document_templates: Record<string, unknown> | null;
  email_settings: Record<string, unknown> | null;
  notes: string | null;
  updated_at?: string;
  updated_by: string | null;
}

// ----- 3. Client -----
export interface Client {
  id?: string;
  company_name: string;
  trade_name: string | null;
  contact_name: string | null;
  contact_position: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  postal_code: string | null;
  tax_id: string | null;
  tax_regime: string | null;
  assigned_commercial_id: string | null;
  client_type: ClientType | null;
  industry_sector: string | null;
  payment_terms: string | null;
  credit_limit: number | null;
  preferred_currency: string | null;
  shipping_addresses: ShippingAddress[] | null;
  additional_contacts: AdditionalContact[] | null;
  tags: string[] | null;
  source: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  created_by: string | null;
  updated_by: string | null;
}

// ----- 4. Quotation -----
export interface Quotation {
  id?: string;
  quotation_number: string;
  client_id: string;
  commercial_id: string;
  product_line: ProductLine | null;
  material: string | null;
  material_specs: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  total_value_usd: number | null;
  total_value_cop: number | null;
  exchange_rate_at_quotation: number | null;
  status: QuotationStatus | null;
  status_history: StatusHistoryEntry[] | null;
  china_request_date: string | null;
  china_response_date: string | null;
  china_response_time_days: number | null;
  client_sent_date: string | null;
  client_response_date: string | null;
  validity_days: number | null;
  expiration_date: string | null;
  incoterm: string | null;
  port_of_origin: string | null;
  port_of_destination: string | null;
  payment_conditions: string | null;
  delivery_time_days: number | null;
  rejection_reason: string | null;
  items: QuotationItem[] | null;
  attachments: Record<string, unknown>[] | null;
  linked_invoice_id: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  created_by: string | null;
  updated_by: string | null;
}

// ----- 5. Invoice -----
export interface Invoice {
  id?: string;
  invoice_number: string;
  quotation_id: string | null;
  client_id: string;
  commercial_id: string;
  issue_date: string;
  due_date: string;
  currency: string | null;
  exchange_rate: number | null;
  subtotal: number;
  tax_percentage: number | null;
  tax_amount: number | null;
  total_amount: number;
  total_amount_cop: number | null;
  payment_status: PaymentStatus | null;
  payment_method: string | null;
  payment_date: string | null;
  payment_reference: string | null;
  partial_payments: PartialPayment[] | null;
  items: InvoiceItem[] | null;
  incoterm: string | null;
  port_of_origin: string | null;
  port_of_destination: string | null;
  vessel_id: string | null;
  shipping_id: string | null;
  payment_conditions: string | null;
  bank_details: Record<string, unknown> | null;
  document_url: string | null;
  status_history: StatusHistoryEntry[] | null;
  is_active: boolean | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  created_by: string | null;
  updated_by: string | null;
}

// ----- 6. PackingList -----
export interface PackingList {
  id?: string;
  pl_number: string;
  invoice_id: string;
  client_id: string;
  issue_date: string;
  items: PackingListItem[] | null;
  total_packages: number | null;
  total_gross_weight: number | null;
  total_net_weight: number | null;
  weight_unit: string | null;
  total_volume: number | null;
  container_type: string | null;
  container_number: string | null;
  seal_number: string | null;
  shipping_marks: string | null;
  document_url: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  created_by: string | null;
  updated_by: string | null;
}

// ----- 7. Vessel -----
export interface Vessel {
  id?: string;
  vessel_name: string;
  imo_number: string | null;
  flag: string | null;
  shipping_line: string | null;
  vessel_type: string | null;
  capacity_tons: number | null;
  is_active: boolean | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

// ----- 8. Shipment -----
export interface Shipment {
  id?: string;
  shipment_number: string;
  vessel_id: string;
  client_id: string;
  commercial_id: string;
  invoice_id: string | null;
  bl_number: string | null;
  booking_number: string | null;
  container_numbers: string[] | null;
  container_type: string | null;
  container_quantity: number | null;
  seal_numbers: string[] | null;
  port_of_loading: string;
  port_of_discharge: string;
  port_of_final_destination: string | null;
  etd: string;
  atd: string | null;
  eta: string;
  ata: string | null;
  eta_final_destination: string | null;
  customs_clearance_date: string | null;
  delivery_date: string | null;
  cargo_description: string | null;
  cargo_weight_tons: number | null;
  cargo_volume_m3: number | null;
  incoterm: string | null;
  freight_cost: number | null;
  freight_currency: string | null;
  insurance_cost: number | null;
  status: ShipmentStatus | null;
  status_history: StatusHistoryEntry[] | null;
  current_location: string | null;
  tracking_url: string | null;
  documents: ShipmentDocument[] | null;
  incidents: ShipmentIncident[] | null;
  is_active: boolean | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  created_by: string | null;
  updated_by: string | null;
}

// ----- 9. ProductionReport -----
export interface ProductionReport {
  id?: string;
  report_number: string;
  report_type: string | null;
  criteria: Record<string, unknown> | null;
  data_snapshot: Record<string, unknown> | null;
  generated_by: string;
  sent_to_china: boolean | null;
  sent_date: string | null;
  sent_to_email: string | null;
  recipient_name: string | null;
  document_url: string | null;
  response_received: boolean | null;
  response_date: string | null;
  response_notes: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  created_by: string | null;
  updated_by: string | null;
}

// ----- 10. Reminder -----
export interface Reminder {
  id?: string;
  title: string;
  description: string | null;
  type: ReminderType | null;
  priority: ReminderPriority | null;
  due_date: string;
  remind_at: string;
  frequency: ReminderFrequency | null;
  is_completed: boolean | null;
  completed_at: string | null;
  completed_by: string | null;
  send_email: boolean | null;
  email_recipient: string | null;
  email_sent: boolean | null;
  email_sent_at: string | null;
  assigned_to: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  created_by: string | null;
  updated_by: string | null;
}

// ----- 11. AuditLog -----
export interface AuditLog {
  id?: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  action: AuditAction | null;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at?: string;
}

// =====================================================
// Utility Types for Forms & Operations
// =====================================================

/** Insert type: makes id and timestamps truly optional (excluded) */
export type InsertProfile = Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
export type InsertClient = Omit<Client, 'id' | 'created_at' | 'updated_at'>;
export type InsertQuotation = Omit<Quotation, 'id' | 'created_at' | 'updated_at'>;
export type InsertInvoice = Omit<Invoice, 'id' | 'created_at' | 'updated_at'>;
export type InsertPackingList = Omit<PackingList, 'id' | 'created_at' | 'updated_at'>;
export type InsertVessel = Omit<Vessel, 'id' | 'created_at' | 'updated_at'>;
export type InsertShipment = Omit<Shipment, 'id' | 'created_at' | 'updated_at'>;
export type InsertProductionReport = Omit<ProductionReport, 'id' | 'created_at' | 'updated_at'>;
export type InsertReminder = Omit<Reminder, 'id' | 'created_at' | 'updated_at'>;
export type InsertAuditLog = Omit<AuditLog, 'id' | 'created_at'>;

/** Update type: all fields optional except id */
export type UpdateProfile = Partial<Profile> & { id: string };
export type UpdateClient = Partial<Client> & { id: string };
export type UpdateQuotation = Partial<Quotation> & { id: string };
export type UpdateInvoice = Partial<Invoice> & { id: string };
export type UpdatePackingList = Partial<PackingList> & { id: string };
export type UpdateVessel = Partial<Vessel> & { id: string };
export type UpdateShipment = Partial<Shipment> & { id: string };
export type UpdateProductionReport = Partial<ProductionReport> & { id: string };
export type UpdateReminder = Partial<Reminder> & { id: string };

// =====================================================
// Types with Joined/Expanded Relations
// =====================================================

/** Quotation with expanded relations for list/detail views */
export interface QuotationWithRelations extends Quotation {
  client?: Client;
  commercial?: Profile;
  linked_invoice?: Invoice;
}

/** Invoice with expanded relations */
export interface InvoiceWithRelations extends Invoice {
  client?: Client;
  commercial?: Profile;
  quotation?: Quotation;
  vessel?: Vessel;
  shipment?: Shipment;
}

/** Shipment with expanded relations */
export interface ShipmentWithRelations extends Shipment {
  client?: Client;
  commercial?: Profile;
  vessel?: Vessel;
  invoice?: Invoice;
}

/** PackingList with expanded relations */
export interface PackingListWithRelations extends PackingList {
  client?: Client;
  invoice?: Invoice;
}

/** Reminder with expanded relations */
export interface ReminderWithRelations extends Reminder {
  assigned_to_profile?: Profile;
  created_by_profile?: Profile;
}

/** Client with expanded relations */
export interface ClientWithRelations extends Client {
  assigned_commercial?: Profile;
  quotations?: Quotation[];
  invoices?: Invoice[];
  shipments?: Shipment[];
}

// ----- 12. Contract (migrated from Excel STATUS sheet) -----
export type ContractStatus =
  | 'ENTREGADO AL CLIENTE'
  | 'EN TRÁNSITO'
  | 'EN PRODUCCIÓN'
  | 'ANULADO'
  | 'PENDIENTE ANTICIPO';

export interface Contract {
  id?: string;
  commercial_name: string;
  client_name: string;
  client_contract: string | null;
  china_contract: string | null;
  contract_date: string | null;
  issue_month: string | null;
  country: string | null;
  incoterm: string | null;
  detail: string | null;
  tons_agreed: number | null;
  advance_paid: string | null;
  balance_paid: string | null;
  status: ContractStatus | null;
  notes: string | null;
  production_time_days: number | null;
  advance_payment_date: string | null;
  delivery_date_pcc: string | null;
  exw_date: string | null;
  etd: string | null;
  eta_initial: string | null;
  eta_final: string | null;
  days_difference: number | null;
  delivery_month: string | null;
  delivery_year: string | null;
  exw_compliance: string | null;
  vessel_name: string | null;
  shipping_company: string | null;
  bl_number: string | null;
  arrival_port: string | null;
  shipment_type: string | null;
  tons_shipped: number | null;
  tons_difference: number | null;
  tons_compliance: string | null;
  bl_released: string | null;
  documents_sent: string | null;
  documents_pending: string | null;
  physical_docs_sent: string | null;
  pending_client_amount: number | null;
  product_type: string | null;
  is_active: boolean | null;
  created_at?: string;
  updated_at?: string;
}

// ----- 13. ContractInvoice (migrated from Excel FACTURAS sheet) -----
export interface ContractInvoice {
  id?: string;
  invoice_date: string;
  customer_name: string | null;
  china_invoice_number: string | null;
  china_invoice_value: number | null;
  customer_contract: string | null;
  customer_invoice_value: number | null;
  approved: boolean | null;
  notes: string | null;
  is_active: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export type InsertContract = Omit<Contract, 'id' | 'created_at' | 'updated_at'>;
export type UpdateContract = Partial<Contract> & { id: string };
export type InsertContractInvoice = Omit<ContractInvoice, 'id' | 'created_at' | 'updated_at'>;
export type UpdateContractInvoice = Partial<ContractInvoice> & { id: string };

// ----- 14. War Room Task -----
export type TaskCategory =
  | 'seguimiento_pago'
  | 'firma_contrato'
  | 'anticipo_pendiente'
  | 'liberacion'
  | 'logistica'
  | 'documentos'
  | 'produccion'
  | 'general'
  | 'otro'
  | (string & {});

export interface WarRoomTask {
  id?: string;
  title: string;
  description: string | null;
  priority: ReminderPriority | null;
  category: TaskCategory | null;
  due_date: string | null;
  is_completed: boolean | null;
  completed_at: string | null;
  completed_by: string | null;
  assigned_to: string;
  related_contract_id: string | null;
  related_client_name: string | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at?: string;
  updated_at?: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface WarRoomTaskWithRelations extends WarRoomTask {
  assigned_to_profile?: Profile;
}

// ----- 15. War Room Note -----
export type NoteColor = 'default' | 'blue' | 'green' | 'amber' | 'red' | 'violet';

export interface WarRoomNote {
  id?: string;
  content: string;
  color: NoteColor | null;
  pinned: boolean | null;
  linked_date: string | null;
  is_active: boolean | null;
  created_at?: string;
  updated_at?: string;
  created_by: string | null;
}

export type InsertWarRoomTask = Omit<WarRoomTask, 'id' | 'created_at' | 'updated_at'>;
export type UpdateWarRoomTask = Partial<WarRoomTask> & { id: string };
export type InsertWarRoomNote = Omit<WarRoomNote, 'id' | 'created_at' | 'updated_at'>;
export type UpdateWarRoomNote = Partial<WarRoomNote> & { id: string };

// ----- 16. War Room Metrics -----
export interface WarRoomMetrics {
  tasks_today: number;
  completed_this_week: number;
  overdue_count: number;
  active_reminders: number;
  active_notes: number;
  weekly_completions: number[];
  monthly_completion_rate: number;
  category_distribution: { category: string; count: number }[];
}

// =====================================================
// Dashboard & Aggregation Types
// =====================================================

export interface DashboardStats {
  total_clients: number;
  active_quotations: number;
  pending_invoices: number;
  active_shipments: number;
  total_revenue_usd: number;
  pending_payments_usd: number;
  overdue_invoices: number;
  upcoming_reminders: number;
}

export interface QuotationsByStatus {
  status: QuotationStatus;
  count: number;
}

export interface InvoicesByStatus {
  payment_status: PaymentStatus;
  count: number;
  total_amount: number;
}

export interface ShipmentsByStatus {
  status: ShipmentStatus;
  count: number;
}
