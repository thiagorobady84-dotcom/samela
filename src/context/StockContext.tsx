import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode
} from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  Product,
  Supplier,
  StockLot,
  DamageReport,
  StockMovement,
  StockEntry,
  ReplacementReceipt,
  Invoice,
  AuditLog,
  UnitOfMeasure
} from '../types/stock';
import { seedInitialSampleData } from '../utils/seedData';
import { useAuth } from './AuthContext';

interface StockSummaryKPIs {
  totalProductsCount: number;
  totalAvailableUnits: number;
  lowStockCount: number;
  expiredCount: number;
  expiring7DaysCount: number;
  expiring15DaysCount: number;
  expiring30DaysCount: number;
  moldAndDamageCount: number;
  pendingExchangesCount: number;
  waitingReplacementsCount: number;
  completedExchangesCount: number;
  totalDamageQuantity: number;
  totalReplacedQuantity: number;
  stockByUnit: Record<UnitOfMeasure, number>;
}

interface StockContextType {
  products: Product[];
  suppliers: Supplier[];
  stockLots: StockLot[];
  damageReports: DamageReport[];
  stockMovements: StockMovement[];
  stockEntries: StockEntry[];
  replacementReceipts: ReplacementReceipt[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  loading: boolean;
  kpis: StockSummaryKPIs;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedProductForDetail: Product | null;
  setSelectedProductForDetail: (p: Product | null) => void;
  loadSampleData: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockLots, setStockLots] = useState<StockLot[]>([]);
  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [replacementReceipts, setReplacementReceipts] = useState<ReplacementReceipt[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Subscribe to Firestore Collections
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    try {
      // Products
      const unsubProducts = onSnapshot(
        collection(db, 'products'),
        (snapshot) => {
          const list: Product[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as Product));
          setProducts(list);
          setLoading(false);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'products')
      );
      unsubs.push(unsubProducts);

      // Suppliers
      const unsubSuppliers = onSnapshot(
        collection(db, 'suppliers'),
        (snapshot) => {
          const list: Supplier[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as Supplier));
          setSuppliers(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'suppliers')
      );
      unsubs.push(unsubSuppliers);

      // Lots
      const unsubLots = onSnapshot(
        collection(db, 'stockLots'),
        (snapshot) => {
          const list: StockLot[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as StockLot));
          setStockLots(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'stockLots')
      );
      unsubs.push(unsubLots);

      // Damage Reports
      const unsubDamages = onSnapshot(
        collection(db, 'damageReports'),
        (snapshot) => {
          const list: DamageReport[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as DamageReport));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setDamageReports(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'damageReports')
      );
      unsubs.push(unsubDamages);

      // Stock Movements
      const unsubMovements = onSnapshot(
        collection(db, 'stockMovements'),
        (snapshot) => {
          const list: StockMovement[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as StockMovement));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setStockMovements(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'stockMovements')
      );
      unsubs.push(unsubMovements);

      // Stock Entries
      const unsubEntries = onSnapshot(
        collection(db, 'stockEntries'),
        (snapshot) => {
          const list: StockEntry[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as StockEntry));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setStockEntries(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'stockEntries')
      );
      unsubs.push(unsubEntries);

      // Replacement Receipts
      const unsubReplacements = onSnapshot(
        collection(db, 'replacementReceipts'),
        (snapshot) => {
          const list: ReplacementReceipt[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as ReplacementReceipt));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setReplacementReceipts(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'replacementReceipts')
      );
      unsubs.push(unsubReplacements);

      // Invoices
      const unsubInvoices = onSnapshot(
        collection(db, 'invoices'),
        (snapshot) => {
          const list: Invoice[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as Invoice));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setInvoices(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'invoices')
      );
      unsubs.push(unsubInvoices);

      // Audit Logs
      const unsubAudits = onSnapshot(
        collection(db, 'auditLogs'),
        (snapshot) => {
          const list: AuditLog[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as AuditLog));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setAuditLogs(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
      );
      unsubs.push(unsubAudits);
    } catch (err) {
      console.error('Subscription error:', err);
      setLoading(false);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  // Compute KPIs with memoization
  const kpis: StockSummaryKPIs = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const day7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const day15 = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    const day30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const stockByUnit: Record<UnitOfMeasure, number> = {
      un: 0,
      pct: 0,
      cx: 0,
      fd: 0,
      kg: 0,
      L: 0
    };

    let totalAvailableUnits = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      if (p.status === 'active') {
        const qty = Number(p.currentStock || 0);
        totalAvailableUnits += qty;
        if (stockByUnit[p.unit] !== undefined) {
          stockByUnit[p.unit] += qty;
        }
        if (qty <= Number(p.minStock || 0)) {
          lowStockCount++;
        }
      }
    });

    // Lot expiry calculations
    let expiredCount = 0;
    let expiring7DaysCount = 0;
    let expiring15DaysCount = 0;
    let expiring30DaysCount = 0;

    // Check products with expiryDate
    products.forEach((p) => {
      if (p.expiryDate && p.currentStock > 0) {
        if (p.expiryDate < today) {
          expiredCount++;
        } else if (p.expiryDate <= day7) {
          expiring7DaysCount++;
        } else if (p.expiryDate <= day15) {
          expiring15DaysCount++;
        } else if (p.expiryDate <= day30) {
          expiring30DaysCount++;
        }
      }
    });

    // Also check stockLots for precision
    stockLots.forEach((l) => {
      if (l.currentQuantity > 0 && l.expiryDate) {
        if (l.expiryDate < today && !products.some(p => p.id === l.productId && p.expiryDate === l.expiryDate)) {
          expiredCount++;
        }
      }
    });

    // Damaged / Mold products count
    let moldAndDamageCount = 0;
    let pendingExchangesCount = 0;
    let waitingReplacementsCount = 0;
    let completedExchangesCount = 0;
    let totalDamageQuantity = 0;
    let totalReplacedQuantity = 0;

    damageReports.forEach((d) => {
      totalDamageQuantity += Number(d.damagedQuantity || 0);
      totalReplacedQuantity += Number(d.replacedQuantity || 0);

      if (d.reason === 'MOFO' || d.reason === 'PRODUTO_ESTRAGADO') {
        moldAndDamageCount++;
      }

      if (
        d.status === 'REGISTRADA' ||
        d.status === 'SOLICITACAO_ENVIADA' ||
        d.status === 'AGUARDANDO_ANALISE'
      ) {
        pendingExchangesCount++;
      } else if (
        d.status === 'TROCA_AUTORIZADA' ||
        d.status === 'AGUARDANDO_REPOSICAO' ||
        d.status === 'PARCIALMENTE_REPOSTA'
      ) {
        waitingReplacementsCount++;
      } else if (d.status === 'CONCLUIDA') {
        completedExchangesCount++;
      }
    });

    return {
      totalProductsCount: products.length,
      totalAvailableUnits,
      lowStockCount,
      expiredCount,
      expiring7DaysCount,
      expiring15DaysCount,
      expiring30DaysCount,
      moldAndDamageCount,
      pendingExchangesCount,
      waitingReplacementsCount,
      completedExchangesCount,
      totalDamageQuantity,
      totalReplacedQuantity,
      stockByUnit
    };
  }, [products, stockLots, damageReports]);

  // Load sample data trigger
  const loadSampleData = async () => {
    try {
      setLoading(true);
      await seedInitialSampleData(
        userProfile?.id || 'usr_init',
        userProfile?.name || 'Administrador'
      );
    } catch (error) {
      console.error('Failed to seed sample data:', error);
      alert('Erro ao carregar dados de demonstração: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <StockContext.Provider
      value={{
        products,
        suppliers,
        stockLots,
        damageReports,
        stockMovements,
        stockEntries,
        replacementReceipts,
        invoices,
        auditLogs,
        loading,
        kpis,
        activeTab,
        setActiveTab,
        selectedProductForDetail,
        setSelectedProductForDetail,
        loadSampleData,
        searchQuery,
        setSearchQuery
      }}
    >
      {children}
    </StockContext.Provider>
  );
};

export function useStock() {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error('useStock must be used within a StockProvider');
  }
  return context;
}
