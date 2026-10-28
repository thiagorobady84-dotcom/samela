import {
  collection,
  doc,
  runTransaction,
  setDoc,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import {
  Product,
  StockEntry,
  StockEntryItem,
  StockExit,
  StockMovement,
  StockLot,
  DamageReport,
  ReplacementReceipt,
  AuditLog,
  Invoice,
  DamageStatus,
  Supplier
} from '../types/stock';

/**
 * Creates a new Product in the catalog.
 * Initial currentStock is set to 0. Stock must be incremented exclusively
 * through confirmed entries or inventory adjustments.
 */
export async function createProductRecord(
  productData: Omit<Product, 'id' | 'currentStock' | 'createdAt' | 'updatedAt'>,
  initialStock: number,
  userId: string,
  userName: string
): Promise<string> {
  const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  try {
    const product: Product = {
      ...productData,
      id: productId,
      currentStock: initialStock > 0 ? initialStock : 0,
      createdAt: now,
      updatedAt: now
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'products', productId), product);

    // If initial stock was registered, create an immutable movement record
    if (initialStock > 0) {
      const movementId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const movement: StockMovement = {
        id: movementId,
        productId,
        productName: product.name,
        type: 'AJUSTE',
        quantity: initialStock,
        previousStock: 0,
        newStock: initialStock,
        unit: product.unit,
        lotNumber: productData.expiryDate ? 'LOTE-INICIAL' : undefined,
        documentRef: 'CADASTRO-INICIAL',
        createdByUserId: userId,
        createdByName: userName,
        notes: 'Saldo físico inicial cadastrado na criação do produto',
        createdAt: now
      };
      batch.set(doc(db, 'stockMovements', movementId), movement);

      if (productData.lotControlled && productData.expiryDate) {
        const lotId = `lot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const lot: StockLot = {
          id: lotId,
          productId,
          productName: product.name,
          lotNumber: 'LOTE-INICIAL',
          initialQuantity: initialStock,
          currentQuantity: initialStock,
          unit: product.unit,
          mfgDate: productData.mfgDate,
          expiryDate: productData.expiryDate,
          supplierId: productData.supplierId,
          supplierName: productData.supplierName,
          status: 'active',
          createdAt: now
        };
        batch.set(doc(db, 'stockLots', lotId), lot);
      }
    }

    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const audit: AuditLog = {
      id: auditId,
      action: 'CRIAR_PRODUTO',
      entityType: 'Product',
      entityId: productId,
      details: `Produto cadastrado: ${product.name} (${product.code}). Saldo inicial: ${initialStock} ${product.unit}`,
      performedByUserId: userId,
      performedByName: userName,
      createdAt: now
    };
    batch.set(doc(db, 'auditLogs', auditId), audit);

    await batch.commit();
    return productId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'products');
  }
}

/**
 * Updates product details. Note: currentStock CANNOT be updated via this function,
 * protecting physical inventory integrity from arbitrary modifications.
 */
export async function updateProductRecord(
  productId: string,
  updates: Partial<Omit<Product, 'id' | 'currentStock' | 'createdAt'>>,
  userId: string,
  userName: string
): Promise<void> {
  const path = `products/${productId}`;
  try {
    const productRef = doc(db, 'products', productId);
    const snap = await getDoc(productRef);
    if (!snap.exists()) {
      throw new Error('Produto não encontrado');
    }

    const { currentStock, ...safeUpdates } = updates as any;
    const finalUpdates = {
      ...safeUpdates,
      updatedAt: new Date().toISOString()
    };

    await setDoc(productRef, finalUpdates, { merge: true });

    await setDoc(doc(db, 'auditLogs', `audit_${Date.now()}`), {
      id: `audit_${Date.now()}`,
      action: 'ATUALIZAR_PRODUTO',
      entityType: 'Product',
      entityId: productId,
      details: `Dados cadastrais atualizados para o produto ${productId}`,
      performedByUserId: userId,
      performedByName: userName,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Atomic Receipt of Goods (Entrada de Mercadorias).
 * Supports multi-item receipts with invoices, updating product stock,
 * creating lot records and recording immutable movements.
 */
export async function processStockEntry(
  entryData: {
    supplierId: string;
    supplierName: string;
    invoiceNumber: string;
    receivedDate: string;
    invoicePhotoUrl?: string;
    notes?: string;
    items: StockEntryItem[];
    userId: string;
    userName: string;
  }
): Promise<string> {
  const entryId = `ent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const totalUnits = entryData.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Fetch all product documents first
      const productDocs: { ref: any; data: Product; item: StockEntryItem }[] = [];
      for (const item of entryData.items) {
        const prodRef = doc(db, 'products', item.productId);
        const prodSnap = await transaction.get(prodRef);
        if (!prodSnap.exists()) {
          throw new Error(`Produto não encontrado: ${item.productName} (${item.productId})`);
        }
        productDocs.push({
          ref: prodRef,
          data: prodSnap.data() as Product,
          item
        });
      }

      // 2. Perform updates atomically
      for (const { ref, data: prodData, item } of productDocs) {
        const qty = Number(item.quantity);
        const previousStock = Number(prodData.currentStock || 0);
        const newStock = previousStock + qty;

        // Update product balance and nearest expiry date
        const updatedExpiry = item.expiryDate
          ? (!prodData.expiryDate || item.expiryDate < prodData.expiryDate ? item.expiryDate : prodData.expiryDate)
          : prodData.expiryDate;

        transaction.update(ref, {
          currentStock: newStock,
          expiryDate: updatedExpiry,
          updatedAt: now
        });

        // Create immutable movement
        const movId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const movDoc: StockMovement = {
          id: movId,
          productId: item.productId,
          productName: item.productName,
          type: 'ENTRADA',
          quantity: qty,
          previousStock,
          newStock,
          unit: item.unit,
          lotNumber: item.lotNumber,
          documentRef: `NF-${entryData.invoiceNumber}`,
          createdByUserId: entryData.userId,
          createdByName: entryData.userName,
          notes: item.notes || `Entrada via NF ${entryData.invoiceNumber}`,
          createdAt: now
        };
        transaction.set(doc(db, 'stockMovements', movId), movDoc);

        // Register lot if lotNumber and expiryDate provided
        if (item.lotNumber && item.expiryDate) {
          const lotId = `lot_${item.productId}_${item.lotNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const lotDoc: StockLot = {
            id: lotId,
            productId: item.productId,
            productName: item.productName,
            lotNumber: item.lotNumber,
            initialQuantity: qty,
            currentQuantity: qty,
            unit: item.unit,
            mfgDate: item.mfgDate,
            expiryDate: item.expiryDate,
            supplierId: entryData.supplierId,
            supplierName: entryData.supplierName,
            status: 'active',
            createdAt: now
          };
          transaction.set(doc(db, 'stockLots', lotId), lotDoc);
        }
      }

      // 3. Record stock entry
      const entryDoc: StockEntry = {
        id: entryId,
        supplierId: entryData.supplierId,
        supplierName: entryData.supplierName,
        invoiceNumber: entryData.invoiceNumber,
        receivedDate: entryData.receivedDate,
        invoicePhotoUrl: entryData.invoicePhotoUrl,
        items: entryData.items,
        itemsCount: entryData.items.length,
        totalUnits,
        notes: entryData.notes,
        createdByUserId: entryData.userId,
        createdByName: entryData.userName,
        createdAt: now
      };
      transaction.set(doc(db, 'stockEntries', entryId), entryDoc);

      // 4. Archive invoice record
      const invoiceId = `inv_${Date.now()}_${entryData.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const invoiceDoc: Invoice = {
        id: invoiceId,
        invoiceNumber: entryData.invoiceNumber,
        supplierId: entryData.supplierId,
        supplierName: entryData.supplierName,
        receiptDate: entryData.receivedDate,
        photoUrl: entryData.invoicePhotoUrl,
        itemsSummary: entryData.items.map(i => `${i.productName} (${i.quantity} ${i.unit})`).join(', '),
        totalUnits,
        createdByUserId: entryData.userId,
        createdAt: now
      };
      transaction.set(doc(db, 'invoices', invoiceId), invoiceDoc);

      // 5. Audit log
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const auditDoc: AuditLog = {
        id: auditId,
        action: 'ENTRADA_MERCADORIA',
        entityType: 'StockEntry',
        entityId: entryId,
        details: `Recebimento NF ${entryData.invoiceNumber} do fornecedor ${entryData.supplierName}. Itens: ${entryData.items.length}. Total unidades: ${totalUnits}`,
        performedByUserId: entryData.userId,
        performedByName: entryData.userName,
        createdAt: now
      };
      transaction.set(doc(db, 'auditLogs', auditId), auditDoc);
    });

    return entryId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'stockEntries');
  }
}

/**
 * Atomic Goods Exit (Saída de Mercadorias).
 * Strictly validates that requested quantity does NOT exceed available stock.
 * Decrements lot quantity if lot specified.
 */
export async function processStockExit(
  exitData: {
    productId: string;
    productName: string;
    quantity: number;
    unit: any;
    reason: any;
    lotNumber?: string;
    requestedBy?: string;
    notes?: string;
    userId: string;
    userName: string;
  }
): Promise<string> {
  const exitId = `exit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const qty = Number(exitData.quantity);

  if (qty <= 0) {
    throw new Error('A quantidade de saída deve ser maior que zero.');
  }

  try {
    await runTransaction(db, async (transaction) => {
      const prodRef = doc(db, 'products', exitData.productId);
      const prodSnap = await transaction.get(prodRef);

      if (!prodSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      const prod = prodSnap.data() as Product;
      const currentStock = Number(prod.currentStock || 0);

      if (currentStock < qty) {
        throw new Error(
          `Saldo insuficiente! Disponível: ${currentStock} ${prod.unit}, Solicitado: ${qty} ${prod.unit}. Não é permitido saldo negativo.`
        );
      }

      const newStock = currentStock - qty;

      // If lot is selected, check and deduct lot quantity
      if (exitData.lotNumber) {
        const lotId = `lot_${exitData.productId}_${exitData.lotNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const lotRef = doc(db, 'stockLots', lotId);
        const lotSnap = await transaction.get(lotRef);

        if (lotSnap.exists()) {
          const lotData = lotSnap.data() as StockLot;
          const lotQty = Number(lotData.currentQuantity || 0);
          if (lotQty < qty) {
            throw new Error(
              `Saldo insuficiente no lote ${exitData.lotNumber}! Disponível no lote: ${lotQty} ${lotData.unit}, Solicitado: ${qty} ${lotData.unit}.`
            );
          }
          const newLotQty = lotQty - qty;
          transaction.update(lotRef, {
            currentQuantity: newLotQty,
            status: newLotQty === 0 ? 'depleted' : 'active'
          });
        }
      }

      // Update product balance
      transaction.update(prodRef, {
        currentStock: newStock,
        updatedAt: now
      });

      // Record immutable movement
      const movId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const movDoc: StockMovement = {
        id: movId,
        productId: exitData.productId,
        productName: exitData.productName,
        type: 'SAIDA',
        quantity: -qty,
        previousStock: currentStock,
        newStock,
        unit: exitData.unit,
        lotNumber: exitData.lotNumber,
        documentRef: `SAIDA-${exitId.slice(-6)}`,
        createdByUserId: exitData.userId,
        createdByName: exitData.userName,
        notes: `Motivo: ${exitData.reason}. ${exitData.notes || ''}`.trim(),
        createdAt: now
      };
      transaction.set(doc(db, 'stockMovements', movId), movDoc);

      // Record exit document
      const exitDoc: StockExit = {
        id: exitId,
        productId: exitData.productId,
        productName: exitData.productName,
        quantity: qty,
        unit: exitData.unit,
        reason: exitData.reason,
        lotNumber: exitData.lotNumber,
        requestedBy: exitData.requestedBy,
        notes: exitData.notes,
        createdByUserId: exitData.userId,
        createdByName: exitData.userName,
        createdAt: now
      };
      transaction.set(doc(db, 'stockExits', exitId), exitDoc);

      // Audit log
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      transaction.set(doc(db, 'auditLogs', auditId), {
        id: auditId,
        action: 'SAIDA_ESTOQUE',
        entityType: 'StockExit',
        entityId: exitId,
        details: `Saída de ${qty} ${exitData.unit} do produto ${exitData.productName}. Motivo: ${exitData.reason}. Saldo restante: ${newStock}`,
        performedByUserId: exitData.userId,
        performedByName: exitData.userName,
        createdAt: now
      });
    });

    return exitId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'stockExits');
  }
}

/**
 * Atomic Registration of Damaged / Moldy Goods (Módulo Trocas e Avarias).
 * Withdrew affected quantity from available stock immediately.
 * Registers occurrence with status 'REGISTRADA'.
 * Guarantees no double discounting!
 */
export async function registerDamageReport(
  damageData: {
    productId: string;
    productName: string;
    supplierId: string;
    supplierName: string;
    damagedQuantity: number;
    unit: any;
    lotNumber?: string;
    expiryDate?: string;
    identifiedDate: string;
    reason: any;
    damagePhotoUrl?: string;
    invoicePhotoUrl?: string;
    description: string;
    notes?: string;
    userId: string;
    userName: string;
  }
): Promise<string> {
  const reportId = `av_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const reportNumber = `AV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  const damagedQty = Number(damageData.damagedQuantity);

  if (damagedQty <= 0) {
    throw new Error('A quantidade avariada deve ser maior que zero.');
  }

  try {
    await runTransaction(db, async (transaction) => {
      const prodRef = doc(db, 'products', damageData.productId);
      const prodSnap = await transaction.get(prodRef);

      if (!prodSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      const prod = prodSnap.data() as Product;
      const currentStock = Number(prod.currentStock || 0);

      if (currentStock < damagedQty) {
        throw new Error(
          `Saldo insuficiente para baixa de avaria! Estoque disponível: ${currentStock} ${prod.unit}, Avariado declarado: ${damagedQty} ${prod.unit}.`
        );
      }

      const newStock = currentStock - damagedQty;

      // Deduct from lot if specified
      if (damageData.lotNumber) {
        const lotId = `lot_${damageData.productId}_${damageData.lotNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const lotRef = doc(db, 'stockLots', lotId);
        const lotSnap = await transaction.get(lotRef);

        if (lotSnap.exists()) {
          const lotData = lotSnap.data() as StockLot;
          const lotQty = Number(lotData.currentQuantity || 0);
          const newLotQty = Math.max(0, lotQty - damagedQty);
          transaction.update(lotRef, {
            currentQuantity: newLotQty,
            status: newLotQty === 0 ? 'depleted' : 'active'
          });
        }
      }

      // Deduct from product available stock
      transaction.update(prodRef, {
        currentStock: newStock,
        updatedAt: now
      });

      // Immutable movement ledger entry for damage withdrawal
      const movId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const movDoc: StockMovement = {
        id: movId,
        productId: damageData.productId,
        productName: damageData.productName,
        type: 'AVARIA',
        quantity: -damagedQty,
        previousStock: currentStock,
        newStock,
        unit: damageData.unit,
        lotNumber: damageData.lotNumber,
        documentRef: reportNumber,
        occurrenceRef: reportNumber,
        createdByUserId: damageData.userId,
        createdByName: damageData.userName,
        notes: `Retirada de avaria: ${damageData.reason}. ${damageData.description}`,
        createdAt: now
      };
      transaction.set(doc(db, 'stockMovements', movId), movDoc);

      // Create Damage Report record
      const reportDoc: DamageReport = {
        id: reportId,
        reportNumber,
        productId: damageData.productId,
        productName: damageData.productName,
        supplierId: damageData.supplierId,
        supplierName: damageData.supplierName,
        damagedQuantity: damagedQty,
        replacedQuantity: 0,
        remainingQuantity: damagedQty,
        unit: damageData.unit,
        lotNumber: damageData.lotNumber,
        expiryDate: damageData.expiryDate,
        identifiedDate: damageData.identifiedDate,
        reason: damageData.reason,
        status: 'REGISTRADA',
        damagePhotoUrl: damageData.damagePhotoUrl,
        invoicePhotoUrl: damageData.invoicePhotoUrl,
        description: damageData.description,
        notes: damageData.notes,
        createdByUserId: damageData.userId,
        createdByName: damageData.userName,
        createdAt: now,
        updatedAt: now
      };
      transaction.set(doc(db, 'damageReports', reportId), reportDoc);

      // Audit log
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      transaction.set(doc(db, 'auditLogs', auditId), {
        id: auditId,
        action: 'REGISTRAR_AVARIA',
        entityType: 'DamageReport',
        entityId: reportId,
        details: `Ocorrência ${reportNumber} registrada. Baixa de ${damagedQty} ${damageData.unit} do produto ${damageData.productName} por ${damageData.reason}.`,
        performedByUserId: damageData.userId,
        performedByName: damageData.userName,
        createdAt: now
      });
    });

    return reportId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'damageReports');
  }
}

/**
 * Updates status of a Damage Report (Trocas e Avarias pipeline).
 * Status transitions do NOT alter available stock (stock was already deducted upon damage registration).
 */
export async function updateDamageReportStatus(
  reportId: string,
  newStatus: DamageStatus,
  supplierFeedback?: string,
  userId?: string,
  userName?: string
): Promise<void> {
  const path = `damageReports/${reportId}`;
  const now = new Date().toISOString();

  try {
    const reportRef = doc(db, 'damageReports', reportId);
    const snap = await getDoc(reportRef);
    if (!snap.exists()) {
      throw new Error('Ocorrência não encontrada');
    }

    const currentData = snap.data() as DamageReport;
    const updates: Partial<DamageReport> = {
      status: newStatus,
      updatedAt: now
    };

    if (supplierFeedback) {
      updates.supplierFeedback = supplierFeedback;
    }

    await setDoc(reportRef, updates, { merge: true });

    await setDoc(doc(db, 'auditLogs', `audit_${Date.now()}`), {
      id: `audit_${Date.now()}`,
      action: 'ATUALIZAR_STATUS_AVARIA',
      entityType: 'DamageReport',
      entityId: reportId,
      details: `Ocorrência ${currentData.reportNumber} teve status alterado de ${currentData.status} para ${newStatus}`,
      performedByUserId: userId || 'system',
      performedByName: userName || 'Sistema',
      createdAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Atomic Supplier Replacement Receipt (Controle das Reposições).
 * Receives items sent by supplier to replace previously damaged goods.
 * Supports partial replacements.
 * Updates stock exclusively for the amount actually received and accepted.
 * Keeps strict link to the original damage occurrence.
 */
export async function processReplacementReceipt(
  data: {
    damageReportId: string;
    receivedQuantity: number;
    receivedDate: string;
    documentNumber?: string;
    documentPhotoUrl?: string;
    lotNumber?: string;
    expiryDate?: string;
    notes?: string;
    userId: string;
    userName: string;
  }
): Promise<string> {
  const receiptId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const receivedQty = Number(data.receivedQuantity);

  if (receivedQty <= 0) {
    throw new Error('A quantidade recebida deve ser maior que zero.');
  }

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Get original Damage Report
      const reportRef = doc(db, 'damageReports', data.damageReportId);
      const reportSnap = await transaction.get(reportRef);

      if (!reportSnap.exists()) {
        throw new Error('Ocorrência de avaria original não encontrada.');
      }

      const report = reportSnap.data() as DamageReport;
      const currentRemaining = Number(report.remainingQuantity);

      if (receivedQty > currentRemaining) {
        throw new Error(
          `Quantidade recebida (${receivedQty} ${report.unit}) excede a pendência de reposição desta ocorrência (${currentRemaining} ${report.unit})!`
        );
      }

      // 2. Get Product and update stock
      const prodRef = doc(db, 'products', report.productId);
      const prodSnap = await transaction.get(prodRef);

      if (!prodSnap.exists()) {
        throw new Error('Produto vinculado à reposição não encontrado.');
      }

      const prod = prodSnap.data() as Product;
      const previousStock = Number(prod.currentStock || 0);
      const newStock = previousStock + receivedQty;

      transaction.update(prodRef, {
        currentStock: newStock,
        updatedAt: now
      });

      // 3. Update Damage Report state
      const newReplacedQty = Number(report.replacedQuantity || 0) + receivedQty;
      const newRemainingQty = Number(report.damagedQuantity) - newReplacedQty;
      const newStatus: DamageStatus = newRemainingQty <= 0 ? 'CONCLUIDA' : 'PARCIALMENTE_REPOSTA';

      transaction.update(reportRef, {
        replacedQuantity: newReplacedQty,
        remainingQuantity: newRemainingQty,
        status: newStatus,
        updatedAt: now
      });

      // 4. Record immutable stock movement (type: REPOSICAO)
      const movId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const movDoc: StockMovement = {
        id: movId,
        productId: report.productId,
        productName: report.productName,
        type: 'REPOSICAO',
        quantity: receivedQty,
        previousStock,
        newStock,
        unit: report.unit,
        lotNumber: data.lotNumber || report.lotNumber,
        documentRef: data.documentNumber ? `TROCA-${data.documentNumber}` : `REP-${report.reportNumber}`,
        occurrenceRef: report.reportNumber,
        createdByUserId: data.userId,
        createdByName: data.userName,
        notes: `Reposição de troca recebida (Ocorrência ${report.reportNumber}). ${data.notes || ''}`.trim(),
        createdAt: now
      };
      transaction.set(doc(db, 'stockMovements', movId), movDoc);

      // 5. Update or create lot if lotNumber and expiryDate provided
      if (data.lotNumber && data.expiryDate) {
        const lotId = `lot_${report.productId}_${data.lotNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const lotRef = doc(db, 'stockLots', lotId);
        const lotSnap = await transaction.get(lotRef);

        if (lotSnap.exists()) {
          const existingLot = lotSnap.data() as StockLot;
          transaction.update(lotRef, {
            currentQuantity: Number(existingLot.currentQuantity || 0) + receivedQty,
            status: 'active'
          });
        } else {
          const lotDoc: StockLot = {
            id: lotId,
            productId: report.productId,
            productName: report.productName,
            lotNumber: data.lotNumber,
            initialQuantity: receivedQty,
            currentQuantity: receivedQty,
            unit: report.unit,
            expiryDate: data.expiryDate,
            supplierId: report.supplierId,
            supplierName: report.supplierName,
            status: 'active',
            createdAt: now
          };
          transaction.set(lotRef, lotDoc);
        }
      }

      // 6. Record Replacement Receipt
      const receiptDoc: ReplacementReceipt = {
        id: receiptId,
        damageReportId: data.damageReportId,
        reportNumber: report.reportNumber,
        supplierId: report.supplierId,
        supplierName: report.supplierName,
        productId: report.productId,
        productName: report.productName,
        requestedQuantity: report.damagedQuantity,
        receivedQuantity: receivedQty,
        unit: report.unit,
        receivedDate: data.receivedDate,
        documentNumber: data.documentNumber,
        documentPhotoUrl: data.documentPhotoUrl,
        lotNumber: data.lotNumber,
        expiryDate: data.expiryDate,
        notes: data.notes,
        createdByUserId: data.userId,
        createdByName: data.userName,
        createdAt: now
      };
      transaction.set(doc(db, 'replacementReceipts', receiptId), receiptDoc);

      // 7. Audit log
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      transaction.set(doc(db, 'auditLogs', auditId), {
        id: auditId,
        action: 'RECEBER_REPOSICAO',
        entityType: 'ReplacementReceipt',
        entityId: receiptId,
        details: `Recebida reposição de ${receivedQty} ${report.unit} para ocorrência ${report.reportNumber}. Pendente: ${newRemainingQty} ${report.unit}.`,
        performedByUserId: data.userId,
        performedByName: data.userName,
        createdAt: now
      });
    });

    return receiptId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'replacementReceipts');
  }
}

/**
 * Stock Adjustment with Justification (Inventário Físico / Correção de Balanço).
 * Records previous balance, new physical balance, difference, justification, and responsible user.
 */
export async function performStockAdjustment(
  productId: string,
  newPhysicalQuantity: number,
  justification: string,
  userId: string,
  userName: string
): Promise<void> {
  const now = new Date().toISOString();

  if (!justification || justification.trim().length < 5) {
    throw new Error('Justificativa obrigatória (mínimo 5 caracteres) para ajuste de estoque.');
  }

  try {
    await runTransaction(db, async (transaction) => {
      const prodRef = doc(db, 'products', productId);
      const prodSnap = await transaction.get(prodRef);

      if (!prodSnap.exists()) {
        throw new Error('Produto não encontrado');
      }

      const prod = prodSnap.data() as Product;
      const previousStock = Number(prod.currentStock || 0);
      const diff = newPhysicalQuantity - previousStock;

      if (diff === 0) {
        return; // No change needed
      }

      transaction.update(prodRef, {
        currentStock: newPhysicalQuantity,
        updatedAt: now
      });

      const movId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const movDoc: StockMovement = {
        id: movId,
        productId,
        productName: prod.name,
        type: 'AJUSTE',
        quantity: diff,
        previousStock,
        newStock: newPhysicalQuantity,
        unit: prod.unit,
        documentRef: 'AJUSTE-INVENTARIO',
        createdByUserId: userId,
        createdByName: userName,
        notes: `Ajuste de inventário: ${justification}`,
        createdAt: now
      };
      transaction.set(doc(db, 'stockMovements', movId), movDoc);

      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      transaction.set(doc(db, 'auditLogs', auditId), {
        id: auditId,
        action: 'AJUSTE_INVENTARIO',
        entityType: 'Product',
        entityId: productId,
        details: `Ajuste manual de ${previousStock} para ${newPhysicalQuantity} ${prod.unit} (${diff > 0 ? '+' : ''}${diff}). Motivo: ${justification}`,
        performedByUserId: userId,
        performedByName: userName,
        createdAt: now
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'stockMovements');
  }
}

/**
 * Supplier Management Operations
 */
export async function createSupplierRecord(
  data: Omit<Supplier, 'id' | 'createdAt'>,
  userId: string,
  userName: string
): Promise<string> {
  const id = `sup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  try {
    const supplier: Supplier = {
      ...data,
      id,
      createdAt: now
    };
    await setDoc(doc(db, 'suppliers', id), supplier);

    await setDoc(doc(db, 'auditLogs', `audit_${Date.now()}`), {
      id: `audit_${Date.now()}`,
      action: 'CRIAR_FORNECEDOR',
      entityType: 'Supplier',
      entityId: id,
      details: `Fornecedor cadastrado: ${supplier.name}`,
      performedByUserId: userId,
      performedByName: userName,
      createdAt: now
    });

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'suppliers');
  }
}

export async function updateSupplierRecord(
  supplierId: string,
  updates: Partial<Omit<Supplier, 'id' | 'createdAt'>>,
  userId: string,
  userName: string
): Promise<void> {
  try {
    await setDoc(doc(db, 'suppliers', supplierId), updates, { merge: true });

    await setDoc(doc(db, 'auditLogs', `audit_${Date.now()}`), {
      id: `audit_${Date.now()}`,
      action: 'ATUALIZAR_FORNECEDOR',
      entityType: 'Supplier',
      entityId: supplierId,
      details: `Fornecedor ${supplierId} atualizado`,
      performedByUserId: userId,
      performedByName: userName,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `suppliers/${supplierId}`);
  }
}
