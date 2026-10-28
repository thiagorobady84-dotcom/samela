import { doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Product,
  Supplier,
  StockMovement,
  StockLot,
  DamageReport,
  StockEntry,
  Invoice
} from '../types/stock';

export async function seedInitialSampleData(userId: string, userName: string): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Helper for dates relative to today
  const addDays = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // 1. Suppliers
  const suppliers: Supplier[] = [
    {
      id: 'sup_demo_docesabor',
      name: 'Distribuidora Doce Sabor Ltda',
      contactName: 'Carlos Eduardo Mendes',
      phone: '(11) 98765-4321',
      email: 'pedidos@docesabor.com.br',
      notes: 'Fornecedor principal de doces, confeitos e coberturas.',
      status: 'active',
      createdAt: now.toISOString()
    },
    {
      id: 'sup_demo_panif',
      name: 'Moageira & Panificação Paulista',
      contactName: 'Marcos Vinícius Silveira',
      phone: '(11) 97654-3210',
      email: 'contato@panificacaopaulista.com.br',
      notes: 'Pães artesanais congelados e farinhas especiais.',
      status: 'active',
      createdAt: now.toISOString()
    },
    {
      id: 'sup_demo_cacau',
      name: 'Cacau Imperial Chocolateria',
      contactName: 'Fernanda Albuquerque',
      phone: '(11) 96543-2109',
      email: 'sac@cacauimperial.com.br',
      notes: 'Chocolates nobres em barras de 1kg, gotas e pós de cacau.',
      status: 'active',
      createdAt: now.toISOString()
    },
    {
      id: 'sup_demo_embalagens',
      name: 'Embalagens & Descartáveis Brasil',
      contactName: 'Renato Siqueira',
      phone: '(11) 95432-1098',
      email: 'vendas@embalagensbrasil.com.br',
      notes: 'Caixas de transporte, forminhas para doces, sacolas kraft e marmitex.',
      status: 'active',
      createdAt: now.toISOString()
    }
  ];

  suppliers.forEach((s) => batch.set(doc(db, 'suppliers', s.id), s));

  // 2. Products (Purely physical quantities, zero monetary values)
  const products: Product[] = [
    {
      id: 'prod_demo_brigadeiro',
      code: 'DOC-001',
      barcode: '7891000100015',
      name: 'Massa para Brigadeiro Gourmet 1kg',
      category: 'Doces & Sobremesas',
      brand: 'Doce Nobre',
      supplierId: 'sup_demo_docesabor',
      supplierName: 'Distribuidora Doce Sabor Ltda',
      unit: 'pct',
      minStock: 25,
      currentStock: 45,
      lotControlled: true,
      mfgDate: addDays(-40),
      expiryDate: addDays(45),
      notes: 'Armazenar em local seco e arejado',
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'prod_demo_paofrances',
      code: 'PAN-002',
      barcode: '7891000200022',
      name: 'Pão Francês Tradicional Congelado',
      category: 'Pães & Panificação',
      brand: 'Pão Paulista',
      supplierId: 'sup_demo_panif',
      supplierName: 'Moageira & Panificação Paulista',
      unit: 'cx',
      minStock: 30,
      currentStock: 18, // Estoque baixo!
      lotControlled: true,
      mfgDate: addDays(-10),
      expiryDate: addDays(12), // Vence em 12 dias (<= 15 dias)
      notes: 'Manter a -18°C no freezer de estocagem',
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'prod_demo_biscoito_choco',
      code: 'BIS-003',
      barcode: '7891000300039',
      name: 'Biscoito Recheado Chocolate Suíço 140g',
      category: 'Biscoitos & Bolachas',
      brand: 'ChocoCroc',
      supplierId: 'sup_demo_docesabor',
      supplierName: 'Distribuidora Doce Sabor Ltda',
      unit: 'cx',
      minStock: 20,
      currentStock: 62,
      lotControlled: true,
      mfgDate: addDays(-90),
      expiryDate: addDays(180),
      notes: 'Caixa com 24 pacotes',
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'prod_demo_chocobarra',
      code: 'CHO-004',
      barcode: '7891000400046',
      name: 'Chocolate Meio Amargo em Barra 1.05kg',
      category: 'Chocolates & Coberturas',
      brand: 'Cacau Imperial',
      supplierId: 'sup_demo_cacau',
      supplierName: 'Cacau Imperial Chocolateria',
      unit: 'un',
      minStock: 40,
      currentStock: 32, // Próximo do mínimo
      lotControlled: true,
      mfgDate: addDays(-60),
      expiryDate: addDays(4), // Vence em 4 dias! (<= 7 dias)
      notes: 'Proteger contra umidade e calor acima de 24°C',
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'prod_demo_balagoma',
      code: 'BAL-005',
      barcode: '7891000500053',
      name: 'Bala de Goma Sortida Frutas Tropicais 500g',
      category: 'Balas, Gomas & Pirulitos',
      brand: 'Gomita',
      supplierId: 'sup_demo_docesabor',
      supplierName: 'Distribuidora Doce Sabor Ltda',
      unit: 'pct',
      minStock: 50,
      currentStock: 80,
      lotControlled: true,
      mfgDate: addDays(-180),
      expiryDate: addDays(-2), // VENCIDO!
      notes: 'Lote com vencimento recente precisando de segregação',
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'prod_demo_forminhas',
      code: 'DES-006',
      barcode: '7891000600060',
      name: 'Forminha nº 4 para Doces e Brigadeiros (cx c/ 1000 un)',
      category: 'Descartáveis & Embalagens',
      brand: 'DocePack',
      supplierId: 'sup_demo_embalagens',
      supplierName: 'Embalagens & Descartáveis Brasil',
      unit: 'cx',
      minStock: 15,
      currentStock: 12, // Estoque baixo!
      lotControlled: false,
      notes: 'Papel impermeável antiaderente',
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'prod_demo_marmitex',
      code: 'DES-007',
      barcode: '7891000700077',
      name: 'Embalagem Térmica Descartável 500ml (fardo c/ 100 un)',
      category: 'Descartáveis & Embalagens',
      brand: 'ThermoPack',
      supplierId: 'sup_demo_embalagens',
      supplierName: 'Embalagens & Descartáveis Brasil',
      unit: 'fd',
      minStock: 10,
      currentStock: 25,
      lotControlled: false,
      notes: 'Tampa com vedação hermética',
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'prod_demo_croissant',
      code: 'PAN-008',
      barcode: '7891000800084',
      name: 'Croissant Manteiga Congelado 80g',
      category: 'Pães & Panificação',
      brand: 'Pão Paulista',
      supplierId: 'sup_demo_panif',
      supplierName: 'Moageira & Panificação Paulista',
      unit: 'cx',
      minStock: 20,
      currentStock: 35,
      lotControlled: true,
      mfgDate: addDays(-15),
      expiryDate: addDays(25), // Vence em 25 dias (<= 30 dias)
      notes: 'Caixa com 60 unidades ultracongeladas',
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
  ];

  products.forEach((p) => batch.set(doc(db, 'products', p.id), p));

  // 3. Stock Lots
  const lots: StockLot[] = [
    {
      id: 'lot_demo_paofrances_01',
      productId: 'prod_demo_paofrances',
      productName: 'Pão Francês Tradicional Congelado',
      lotNumber: 'LT-PAN-8812',
      initialQuantity: 30,
      currentQuantity: 18,
      unit: 'cx',
      mfgDate: addDays(-10),
      expiryDate: addDays(12),
      supplierId: 'sup_demo_panif',
      supplierName: 'Moageira & Panificação Paulista',
      status: 'active',
      createdAt: now.toISOString()
    },
    {
      id: 'lot_demo_chocobarra_01',
      productId: 'prod_demo_chocobarra',
      productName: 'Chocolate Meio Amargo em Barra 1.05kg',
      lotNumber: 'LT-CACAU-2026A',
      initialQuantity: 50,
      currentQuantity: 32,
      unit: 'un',
      mfgDate: addDays(-60),
      expiryDate: addDays(4), // Vence em 4 dias
      supplierId: 'sup_demo_cacau',
      supplierName: 'Cacau Imperial Chocolateria',
      status: 'active',
      createdAt: now.toISOString()
    },
    {
      id: 'lot_demo_balagoma_01',
      productId: 'prod_demo_balagoma',
      productName: 'Bala de Goma Sortida Frutas Tropicais 500g',
      lotNumber: 'LT-GOM-1102',
      initialQuantity: 80,
      currentQuantity: 80,
      unit: 'pct',
      mfgDate: addDays(-180),
      expiryDate: addDays(-2), // Vencido
      supplierId: 'sup_demo_docesabor',
      supplierName: 'Distribuidora Doce Sabor Ltda',
      status: 'expired',
      createdAt: now.toISOString()
    },
    {
      id: 'lot_demo_croissant_01',
      productId: 'prod_demo_croissant',
      productName: 'Croissant Manteiga Congelado 80g',
      lotNumber: 'LT-CRO-4409',
      initialQuantity: 40,
      currentQuantity: 35,
      unit: 'cx',
      mfgDate: addDays(-15),
      expiryDate: addDays(25),
      supplierId: 'sup_demo_panif',
      supplierName: 'Moageira & Panificação Paulista',
      status: 'active',
      createdAt: now.toISOString()
    }
  ];

  lots.forEach((l) => batch.set(doc(db, 'stockLots', l.id), l));

  // 4. Damage and Mold Reports (Trocas e Avarias)
  const damageReports: DamageReport[] = [
    {
      id: 'av_demo_mofo_croissant',
      reportNumber: 'AV-2026-1044',
      productId: 'prod_demo_croissant',
      productName: 'Croissant Manteiga Congelado 80g',
      supplierId: 'sup_demo_panif',
      supplierName: 'Moageira & Panificação Paulista',
      damagedQuantity: 5,
      replacedQuantity: 0,
      remainingQuantity: 5,
      unit: 'cx',
      lotNumber: 'LT-CRO-4409',
      expiryDate: addDays(25),
      identifiedDate: addDays(-3),
      reason: 'MOFO',
      status: 'AGUARDANDO_REPOSICAO',
      description: 'Presença de fungos e mofo superficial em 5 caixas ao inspecionar a abertura do lote.',
      notes: 'Fornecedor aprovou troca por e-mail no dia 26. Aguardando entrega de reposição com novo lote.',
      createdByUserId: userId,
      createdByName: userName,
      createdAt: addDays(-3),
      updatedAt: addDays(-1)
    },
    {
      id: 'av_demo_embalagem_biscoito',
      reportNumber: 'AV-2026-1021',
      productId: 'prod_demo_biscoito_choco',
      productName: 'Biscoito Recheado Chocolate Suíço 140g',
      supplierId: 'sup_demo_docesabor',
      supplierName: 'Distribuidora Doce Sabor Ltda',
      damagedQuantity: 8,
      replacedQuantity: 4,
      remainingQuantity: 4,
      unit: 'cx',
      lotNumber: 'LT-BIS-7720',
      expiryDate: addDays(180),
      identifiedDate: addDays(-7),
      reason: 'EMBALAGEM_DANIFICADA',
      status: 'PARCIALMENTE_REPOSTA',
      description: 'Caixas de papelão amassadas no transporte pela transportadora parceira.',
      notes: 'Recebidas 4 caixas repurgadas na entrega de ontem. Faltam 4 caixas a entregar.',
      createdByUserId: userId,
      createdByName: userName,
      createdAt: addDays(-7),
      updatedAt: addDays(-1)
    },
    {
      id: 'av_demo_vencido_goma',
      reportNumber: 'AV-2026-0988',
      productId: 'prod_demo_balagoma',
      productName: 'Bala de Goma Sortida Frutas Tropicais 500g',
      supplierId: 'sup_demo_docesabor',
      supplierName: 'Distribuidora Doce Sabor Ltda',
      damagedQuantity: 15,
      replacedQuantity: 15,
      remainingQuantity: 0,
      unit: 'pct',
      lotNumber: 'LT-GOM-1090',
      expiryDate: addDays(-15),
      identifiedDate: addDays(-14),
      reason: 'PRODUTO_VENCIDO',
      status: 'CONCLUIDA',
      description: 'Lote residual vencido na gôndola recolhido para política de troca semestral.',
      notes: 'Reposição 100% recebida e concluída pelo fornecedor com novo lote.',
      createdByUserId: userId,
      createdByName: userName,
      createdAt: addDays(-14),
      updatedAt: addDays(-5)
    }
  ];

  damageReports.forEach((d) => batch.set(doc(db, 'damageReports', d.id), d));

  // 5. Sample Stock Entries & Invoices
  const sampleEntry: StockEntry = {
    id: 'ent_demo_01',
    supplierId: 'sup_demo_docesabor',
    supplierName: 'Distribuidora Doce Sabor Ltda',
    invoiceNumber: 'NF-89214',
    receivedDate: addDays(-5),
    items: [
      {
        productId: 'prod_demo_brigadeiro',
        productName: 'Massa para Brigadeiro Gourmet 1kg',
        quantity: 20,
        unit: 'pct',
        lotNumber: 'LT-DOC-5501',
        expiryDate: addDays(60)
      },
      {
        productId: 'prod_demo_biscoito_choco',
        productName: 'Biscoito Recheado Chocolate Suíço 140g',
        quantity: 30,
        unit: 'cx',
        lotNumber: 'LT-BIS-7720',
        expiryDate: addDays(180)
      }
    ],
    itemsCount: 2,
    totalUnits: 50,
    notes: 'Recebimento de rotina quinzenal. Mercadorias conferidas.',
    createdByUserId: userId,
    createdByName: userName,
    createdAt: addDays(-5)
  };
  batch.set(doc(db, 'stockEntries', sampleEntry.id), sampleEntry);

  const sampleInvoice: Invoice = {
    id: 'inv_demo_89214',
    invoiceNumber: 'NF-89214',
    supplierId: 'sup_demo_docesabor',
    supplierName: 'Distribuidora Doce Sabor Ltda',
    receiptDate: addDays(-5),
    itemsSummary: 'Massa Brigadeiro (20 pct), Biscoito Recheado (30 cx)',
    totalUnits: 50,
    createdByUserId: userId,
    createdAt: addDays(-5)
  };
  batch.set(doc(db, 'invoices', sampleInvoice.id), sampleInvoice);

  // 6. Movements History
  const sampleMovements: StockMovement[] = [
    {
      id: 'mov_demo_01',
      productId: 'prod_demo_brigadeiro',
      productName: 'Massa para Brigadeiro Gourmet 1kg',
      type: 'ENTRADA',
      quantity: 20,
      previousStock: 25,
      newStock: 45,
      unit: 'pct',
      lotNumber: 'LT-DOC-5501',
      documentRef: 'NF-89214',
      createdByUserId: userId,
      createdByName: userName,
      notes: 'Recebimento de mercadorias NF 89214',
      createdAt: addDays(-5)
    },
    {
      id: 'mov_demo_02',
      productId: 'prod_demo_croissant',
      productName: 'Croissant Manteiga Congelado 80g',
      type: 'AVARIA',
      quantity: -5,
      previousStock: 40,
      newStock: 35,
      unit: 'cx',
      lotNumber: 'LT-CRO-4409',
      documentRef: 'AV-2026-1044',
      occurrenceRef: 'AV-2026-1044',
      createdByUserId: userId,
      createdByName: userName,
      notes: 'Retirada de avaria por mofo identificado',
      createdAt: addDays(-3)
    },
    {
      id: 'mov_demo_03',
      productId: 'prod_demo_paofrances',
      productName: 'Pão Francês Tradicional Congelado',
      type: 'SAIDA',
      quantity: -12,
      previousStock: 30,
      newStock: 18,
      unit: 'cx',
      lotNumber: 'LT-PAN-8812',
      documentRef: 'SAIDA-OP-01',
      createdByUserId: userId,
      createdByName: userName,
      notes: 'Retirada para produção e fornada matutina',
      createdAt: addDays(-1)
    }
  ];

  sampleMovements.forEach((m) => batch.set(doc(db, 'stockMovements', m.id), m));

  await batch.commit();
}

/**
 * Purges demo data cleanly so users can start on a clean slate.
 */
export async function purgeAllSampleData(): Promise<void> {
  const collectionsToClean = [
    'products',
    'suppliers',
    'stockLots',
    'damageReports',
    'stockEntries',
    'stockExits',
    'stockMovements',
    'replacementReceipts',
    'invoices',
    'auditLogs'
  ];

  for (const colName of collectionsToClean) {
    const snap = await getDocs(collection(db, colName));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    if (snap.docs.length > 0) {
      await batch.commit();
    }
  }
}
