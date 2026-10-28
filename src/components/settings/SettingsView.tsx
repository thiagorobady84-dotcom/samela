import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  User,
  Users,
  Database,
  Trash2,
  Sparkles,
  RefreshCw,
  LogIn,
  LogOut,
  History,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStock } from '../../context/StockContext';
import { UserRole } from '../../types/stock';
import { purgeAllSampleData, seedInitialSampleData } from '../../utils/seedData';
import { testConnection } from '../../firebase/config';

export const SettingsView: React.FC = () => {
  const { userProfile, currentUser, signInWithGoogle, signOut, setDemoRole, isDemoUser } = useAuth();
  const { auditLogs, loadSampleData } = useStock();

  const [dbLoading, setDbLoading] = useState(false);
  const [dbMessage, setDbMessage] = useState('');
  const [connStatus, setConnStatus] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setConnStatus('Testando conexão com o Firestore...');
    const ok = await testConnection();
    if (ok) {
      setConnStatus('Conexão ativa e sincronizada com o Firebase Cloud Firestore!');
    } else {
      setConnStatus('Conexão ativa em modo híbrido / sincronização local.');
    }
  };

  const handleSeed = async () => {
    if (confirm('Carregar catálogo de doces, pães, chocolates, embalagens e ocorrências de teste?')) {
      setDbLoading(true);
      setDbMessage('');
      try {
        await seedInitialSampleData(userProfile?.id || 'usr_init', userProfile?.name || 'Administrador');
        setDbMessage('Dados de demonstração carregados com sucesso!');
      } catch (err: any) {
        setDbMessage('Erro ao carregar dados: ' + err.message);
      } finally {
        setDbLoading(false);
      }
    }
  };

  const handlePurge = async () => {
    if (confirm('ATENÇÃO: Deseja apagar TODOS os dados do sistema para iniciar com uma base limpa de produção? Esta ação não pode ser desfeita.')) {
      setDbLoading(true);
      setDbMessage('');
      try {
        await purgeAllSampleData();
        setDbMessage('Base limpa com sucesso! O sistema está pronto para cadastros reais.');
      } catch (err: any) {
        setDbMessage('Erro ao limpar base: ' + err.message);
      } finally {
        setDbLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-400" />
          Usuários, Auditoria & Configurações do Sistema
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Gestão de permissões, livro-razão de auditoria e manutenção de banco de dados
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile & Role Switcher */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              Perfil do Usuário Atual
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold uppercase">
              {userProfile?.role}
            </span>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="w-12 h-12 rounded-full bg-amber-500 font-black text-slate-950 flex items-center justify-center text-lg">
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate">{userProfile?.name}</h4>
              <p className="text-xs text-slate-400 truncate">{userProfile?.email}</p>
              <span className="text-[11px] text-amber-400 font-medium block mt-0.5">
                Nível de Acesso: {userProfile?.role === 'admin' ? 'Administrador Pleno' : userProfile?.role === 'supervisor' ? 'Supervisor de Estoque' : 'Operador'}
              </span>
            </div>
          </div>

          {/* Role Switcher */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Alternar Nível de Acesso para Testes de Permissões:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['operador', 'supervisor', 'admin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setDemoRole(role)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition border ${
                    userProfile?.role === role
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Auth Action */}
          <div className="pt-2 flex items-center justify-between">
            {currentUser ? (
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold border border-slate-700 transition"
              >
                <LogOut className="w-4 h-4" /> Desconectar do Google
              </button>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20"
              >
                <LogIn className="w-4 h-4" /> Conectar com Conta Google
              </button>
            )}

            <button
              onClick={handleTestConnection}
              className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Testar Firestore
            </button>
          </div>

          {connStatus && (
            <p className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-emerald-400 font-medium">
              {connStatus}
            </p>
          )}
        </div>

        {/* Database & Production Seeding Tools */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Gestão da Base de Dados
            </h3>
            <span className="text-[10px] text-slate-400">Firebase Cloud Firestore</span>
          </div>

          <p className="text-xs text-slate-300">
            Conforme especificado, você pode carregar dados de exemplo identificados para exploração das regras de estoque e trocas, ou limpar a base inteira para uso real na empresa.
          </p>

          {dbMessage && (
            <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{dbMessage}</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleSeed}
              disabled={dbLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-400 font-bold text-xs border border-slate-700 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Carregar Dados de Demonstração (Doces, Pães, Avarias)</span>
            </button>

            <button
              onClick={handlePurge}
              disabled={dbLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 font-bold text-xs border border-red-500/40 transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Limpar Todos os Dados (Iniciar Base Limpa Real)</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Garantia de Regras de Integridade:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400">
              <li>Valores monetários e custos estritamente proibidos e inexistentes no banco.</li>
              <li>Avarias sempre deduzem estoque físico disponível na criação.</li>
              <li>Reposições não são computadas como compras comuns.</li>
              <li>Lotes ordenados por prioridade FEFO.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* System Audit Log Trail */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Trilha Imutável de Auditoria (Audit Log)
          </h3>
          <span className="text-xs text-slate-400">{auditLogs.length} eventos registrados</span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            Nenhum evento registrado na trilha de auditoria até o momento.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Ação</th>
                  <th className="py-2.5 px-3">Entidade</th>
                  <th className="py-2.5 px-3">Detalhes da Operação</th>
                  <th className="py-2.5 px-3">Usuário Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {auditLogs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-amber-400">{log.action}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{log.entityType}</td>
                    <td className="py-2.5 px-3 text-slate-200">{log.details}</td>
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{log.performedByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
