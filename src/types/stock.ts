/**
 * CONTROLE DE ESTOQUE - Domain Types
 * REGRA ABSOLUTA: NÃO INCLUIR VALORES MONETÁRIOS.
 */

export type UnitOfMeasure = 'un' | 'pct' | 'cx' | 'fd' | 'kg' | 'L';

export type ProductCategory =
  | 'Doces & Sobremesas'
  | 'Pães & Panificação'
  | 'Biscoitos & Bolachas'
  | 'Chocolates & Coberturas'
  | 'Balas, Gomas & Pirulitos'
  | 'Descartáveis & Embalagens'
  | 'Farinhas & Ingredientes'
  | 'Bebidas & Sucos'
  | 'Outros';

export type UserRole = 'admin' | 'supervisor' | 'operador';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  photoUrl?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  code: string; // SKU / Código Interno
  barcode?: string; // Código de Barras EAN
  name: string;
  category: ProductCategory;
  brand?: string;
  supplierId: string;
  supplierName: string;
  unit: UnitOfMeasure;
  minStock: number;
  currentStock: number; // Calculado pelo sistema via movimentações
  lotControlled: boolean;
  mfgDate?: string;
  expiryDate?: string; // Menor data de validade atual
  notes?: string;
  photoUrl?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface StockEntryItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: UnitOfMeasure;
  lotNumber?: string;
  mfgDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface StockEntry {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  receivedDate: string;
  invoicePhotoUrl?: string;
  items: StockEntryItem[];
  itemsCount: number;
  totalUnits: number;
  notes?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
}

export type ExitReason =
  | 'VENDA_OPERACAO'
  | 'CONSUMO_INTERNO'
  | 'PRODUTO_AVARIADO'
  | 'PRODUTO_VENCIDO'
  | 'PERDA'
  | 'OUTROS';

export interface StockExit {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: UnitOfMeasure;
  reason: ExitReason;
  lotNumber?: string;
  requestedBy?: string;
  notes?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
}

export type MovementType = 'ENTRADA' | 'SAIDA' | 'AVARIA' | 'REPOSICAO' | 'AJUSTE';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number; // Positivo para acréscimo, negativo para decréscimo
  previousStock: number;
  newStock: number;
  unit: UnitOfMeasure;
  lotNumber?: string;
  documentRef?: string; // Número da NF ou Doc
  occurrenceRef?: string; // Código da ocorrência de avaria/troca
  createdByUserId: string;
  createdByName: string;
  notes?: string;
  createdAt: string;
}

export interface StockLot {
  id: string;
  productId: string;
  productName: string;
  lotNumber: string;
  initialQuantity: number;
  currentQuantity: number;
  unit: UnitOfMeasure;
  mfgDate?: string;
  expiryDate: string;
  supplierId: string;
  supplierName: string;
  status: 'active' | 'depleted' | 'expired';
  createdAt: string;
}

export type DamageReason =
  | 'MOFO'
  | 'EMBALAGEM_DANIFICADA'
  | 'PRODUTO_VENCIDO'
  | 'PRODUTO_ESTRAGADO'
  | 'RECEBIDO_DANIFICADO'
  | 'OUTROS';

export type DamageStatus =
  | 'REGISTRADA'
  | 'SOLICITACAO_ENVIADA'
  | 'AGUARDANDO_ANALISE'
  | 'TROCA_AUTORIZADA'
  | 'AGUARDANDO_REPOSICAO'
  | 'PARCIALMENTE_REPOSTA'
  | 'CONCLUIDA'
  | 'RECUSADA';

export interface DamageReport {
  id: string;
  reportNumber: string; // Ex: AV-2026-001
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  damagedQuantity: number;
  replacedQuantity: number;
  remainingQuantity: number;
  unit: UnitOfMeasure;
  lotNumber?: string;
  expiryDate?: string;
  identifiedDate: string;
  reason: DamageReason;
  status: DamageStatus;
  damagePhotoUrl?: string;
  invoicePhotoUrl?: string;
  description: string;
  notes?: string;
  supplierFeedback?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReplacementReceipt {
  id: string;
  damageReportId: string;
  reportNumber: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  requestedQuantity: number;
  receivedQuantity: number;
  unit: UnitOfMeasure;
  receivedDate: string;
  documentNumber?: string;
  documentPhotoUrl?: string;
  lotNumber?: string;
  expiryDate?: string;
  notes?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  receiptDate: string;
  photoUrl?: string;
  itemsSummary: string;
  totalUnits: number;
  createdByUserId: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  performedByUserId: string;
  performedByName: string;
  createdAt: string;
}

export interface StoredImage {
  id: string;
  title: string;
  category: 'invoice' | 'damage' | 'product' | 'replacement';
  mimeType: string;
  dataUrl: string;
  createdAt: string;
}
