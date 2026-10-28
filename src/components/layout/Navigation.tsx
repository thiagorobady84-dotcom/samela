import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
  CalendarClock,
  Truck,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  ShieldCheck,
  Sparkles,
  LogOut,
  LogIn,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, kpis, loadSampleData, products } = useStock();
  const { userProfile, currentUser, signInWithGoogle, signOut, isDemoUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [seedingLoading, setSeedingLoading] = useState(false);

  const handleSeed = async () => {
    if (confirm('Deseja carregar a base de demonstração para testes rápidos (produtos de confeitaria, panificação, descartáveis, lotes e ocorrências de avaria)?')) {
      setSeedingLoading(true);
      await loadSampleData();
      setSeedingLoading(false);
    }
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Painel Inicial',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'products',
      label: 'Produtos',
      icon: Package,
      badge: kpis.lowStockCount > 0 ? `${kpis.lowStockCount} baixos` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    {
      id: 'entries',
      label: 'Entrada de Mercadorias',
      icon: ArrowDownLeft,
      badge: null
    },
    {
      id: 'exits',
      label: 'Saída de Mercadorias',
      icon: ArrowUpRight,
      badge: null
    },
    {
      id: 'damages',
      label: 'Trocas e Avarias',
      icon: AlertTriangle,
      badge: kpis.pendingExchangesCount > 0 ? `${kpis.pendingExchangesCount} pend.` : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    },
    {
      id: 'replacements',
      label: 'Reposições',
      icon: RefreshCw,
      badge: kpis.waitingReplacementsCount > 0 ? `${kpis.waitingReplacementsCount} aguard.` : null,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    {
      id: 'lots',
      label: 'Lotes e Validades',
      icon: CalendarClock,
      badge: kpis.expiredCount > 0 ? `${kpis.expiredCount} vencidos` : (kpis.expiring7DaysCount > 0 ? `${kpis.expiring7DaysCount} a vencer` : null),
      badgeColor: kpis.expiredCount > 0 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    {
      id: 'suppliers',
      label: 'Fornecedores',
      icon: Truck,
      badge: null
    },
    {
      id: 'invoices',
      label: 'Notas Fiscais',
      icon: FileText,
      badge: null
    },
    {
      id: 'reports',
      label: 'Relatórios Físicos',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'settings',
      label: 'Usuários & Auditoria',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <>
      {/* Top Header for Mobile */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-white">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 -ml-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Abrir Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400">
              CE
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">CONTROLE DE ESTOQUE</span>
              <span className="text-[10px] text-amber-400 font-medium block">GESTÃO FÍSICA SEM PREÇOS</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userProfile && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 capitalize">
              {userProfile.role}
            </span>
          )}
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 bg-slate-900 border-r border-slate-800 z-30 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black text-slate-950 text-lg">
              CE
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white leading-tight">CONTROLE DE ESTOQUE</h1>
              <p className="text-[11px] text-slate-400 font-medium">Panificação, Doces & Descartáveis</p>
            </div>
          </div>

          <div className="mt-3 py-1 px-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Controle 100% físico • Sem valores monetários</span>
          </div>
        </div>

        {/* Quick Demo Seeder if empty */}
        {products.length === 0 && (
          <div className="p-3 mx-3 my-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <p className="font-semibold mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Comece com dados de teste
            </p>
            <p className="text-[11px] text-slate-400 mb-2">
              Carregue catálogo de doces, pães, lotes e ocorrências.
            </p>
            <button
              onClick={handleSeed}
              disabled={seedingLoading}
              className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-xs transition"
            >
              {seedingLoading ? 'Carregando...' : 'Carregar Dados Exemplo'}
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                      isActive ? 'bg-slate-950/20 text-slate-950 border-slate-950/30' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile / Status Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {userProfile?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{userProfile?.name}</p>
                <p className="text-[10px] text-amber-400 font-medium capitalize truncate">
                  {userProfile?.role} {isDemoUser && '(Modo Operacional)'}
                </p>
              </div>
            </div>

            {currentUser ? (
              <button
                onClick={signOut}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                title="Sair do Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition"
                title="Conectar com o Google"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Firestore Online
            </span>
            <span className="font-mono text-[10px] text-slate-400">v2.4.0</span>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 flex flex-col h-full shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 font-black text-slate-950 flex items-center justify-center">
                  CE
                </div>
                <div>
                  <h2 className="font-bold text-sm text-white">CONTROLE DE ESTOQUE</h2>
                  <span className="text-[10px] text-slate-400">Mercadorias & Avarias</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-slate-800 bg-slate-950">
              <p className="text-xs font-semibold text-white truncate">{userProfile?.name}</p>
              <p className="text-[11px] text-amber-400 capitalize">{userProfile?.role}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
