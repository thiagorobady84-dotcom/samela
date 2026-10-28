import React, { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { StockProvider, useStock } from './context/StockContext';
import { Navigation } from './components/layout/Navigation';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductsView } from './components/products/ProductsView';
import { StockEntryView } from './components/entries/StockEntryView';
import { StockExitView } from './components/exits/StockExitView';
import { DamageExchangeView } from './components/damages/DamageExchangeView';
import { ReplacementsView } from './components/replacements/ReplacementsView';
import { LotsExpiryView } from './components/lots/LotsExpiryView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';

const AppContent: React.FC = () => {
  const { activeTab, products, loading, loadSampleData } = useStock();

  // If database is completely empty on initial cold boot, seed automatically
  // with production sample catalog of sweets, bread, biscuits, chocolates, and disposables
  useEffect(() => {
    if (!loading && products.length === 0) {
      loadSampleData().catch((err) => console.log('Auto-seed check complete:', err));
    }
  }, [loading, products.length]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'products':
        return <ProductsView />;
      case 'entries':
        return <StockEntryView />;
      case 'exits':
        return <StockExitView />;
      case 'damages':
        return <DamageExchangeView />;
      case 'replacements':
        return <ReplacementsView />;
      case 'lots':
        return <LotsExpiryView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'invoices':
        return <InvoicesView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Navigation />

      {/* Main Content Pane */}
      <main className="lg:pl-64 flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-150">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StockProvider>
        <AppContent />
      </StockProvider>
    </AuthProvider>
  );
}
