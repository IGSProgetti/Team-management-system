import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, TrendingUp, TrendingDown, DollarSign, Clock, 
  ChevronRight, AlertCircle, CheckCircle, MinusCircle 
} from 'lucide-react';
import api from '../utils/api';
import ResourceBudgetDrillDownModal from './ResourceBudgetDrillDownModal';
import AssegnaOreModal from './AssegnaOreModal';

const BudgetControlDashboard = () => {
  const [risorse, setRisorse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRisorsa, setSelectedRisorsa] = useState(null);
  const [showAssegnaModal, setShowAssegnaModal] = useState(false);
  const [risorsaPerAssegnazione, setRisorsaPerAssegnazione] = useState(null);

  // Carica dati risorse
  useEffect(() => {
    fetchRisorse();
  }, []);

  const fetchRisorse = async () => {
    try {
      setLoading(true);
      const response = await api.get('/budget-control-resources');
      setRisorse(response.data.risorse);
      setError(null);
    } catch (err) {
      console.error('Errore caricamento risorse:', err);
      setError('Impossibile caricare i dati delle risorse');
    } finally {
      setLoading(false);
    }
  };

  const handleAssegnaOre = (risorsa) => {
    setRisorsaPerAssegnazione(risorsa);
    setShowAssegnaModal(true);
  };

  const handleAssegnaSuccess = () => {
    fetchRisorse(); // Ricarica i dati
    setShowAssegnaModal(false);
    setRisorsaPerAssegnazione(null);
  };

  // Formatta numeri
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatHours = (value) => {
    return `${parseFloat(value).toFixed(2)}h`;
  };

  // Colori status
  const getStatusColor = (status) => {
    switch (status) {
      case 'POSITIVO': return 'text-green-600 bg-green-50';
      case 'NEGATIVO': return 'text-red-600 bg-red-50';
      case 'PAREGGIO': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'POSITIVO': return <TrendingUp className="w-4 h-4" />;
      case 'NEGATIVO': return <TrendingDown className="w-4 h-4" />;
      case 'PAREGGIO': return <MinusCircle className="w-4 h-4" />;
      default: return <MinusCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Budget Control - Gestione Risorse</h1>
            <p className="text-gray-600 mt-1">
              Monitora il monte ore e le performance delle risorse
            </p>
          </div>
          <button
            onClick={fetchRisorse}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Aggiorna Dati
          </button>
        </div>
      </div>

      {/* Statistiche Globali */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Risorse Totali"
          value={risorse.length}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Ore Assegnate"
          value={formatHours(risorse.reduce((sum, r) => sum + parseFloat(r.ore_assegnate_progetti || 0), 0))}
          icon={<Clock className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Budget Totale"
          value={formatCurrency(risorse.reduce((sum, r) => sum + parseFloat(r.budget_assegnato || 0), 0))}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Diff. Totale"
          value={formatCurrency(risorse.reduce((sum, r) => sum + parseFloat(r.diff_euro || 0), 0))}
          icon={<TrendingUp className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Tabella Risorse */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risorsa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monte Ore
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ore Progetti
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tesoretto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget Assegnato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prev vs Eff
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {risorse.map((risorsa) => (
                <RisorsaRow
                  key={risorsa.id}
                  risorsa={risorsa}
                  onViewDetails={() => setSelectedRisorsa(risorsa)}
                  onAssegnaOre={() => handleAssegnaOre(risorsa)}
                  formatCurrency={formatCurrency}
                  formatHours={formatHours}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Drill-Down */}
      {selectedRisorsa && (
        <ResourceBudgetDrillDownModal 
          risorsa={selectedRisorsa}
          onClose={() => setSelectedRisorsa(null)}
        />
      )}

      {/* Modal Assegna Ore */}
      {showAssegnaModal && risorsaPerAssegnazione && (
        <AssegnaOreModal
          risorsa={risorsaPerAssegnazione}
          onClose={() => setShowAssegnaModal(false)}
          onSuccess={handleAssegnaSuccess}
        />
      )}
    </div>
  );
};

// Componente Statistica Card
const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Componente Riga Risorsa
const RisorsaRow = ({ 
  risorsa, 
  onViewDetails,
  onAssegnaOre,
  formatCurrency, 
  formatHours,
  getStatusColor,
  getStatusIcon 
}) => {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Nome Risorsa */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">
              {risorsa.nome.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </span>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{risorsa.nome}</div>
            <div className="text-sm text-gray-500">{risorsa.email}</div>
          </div>
        </div>
      </td>

      {/* Monte Ore */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm">
          <div className="font-semibold text-gray-900">{formatHours(risorsa.ore_annue_totali)}</div>
          <div className="text-gray-500 text-xs">Totali annue</div>
        </div>
      </td>

      {/* Ore Progetti */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm">
          <div className="font-semibold text-gray-900">
            {formatHours(risorsa.ore_assegnate_progetti)} / {formatHours(risorsa.ore_annue_normali)}
          </div>
          <div className={`text-xs ${parseFloat(risorsa.ore_disponibili_progetti) < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {parseFloat(risorsa.ore_disponibili_progetti) >= 0 ? '+' : ''}{formatHours(risorsa.ore_disponibili_progetti)} disp.
          </div>
        </div>
      </td>

      {/* Tesoretto */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-semibold text-gray-900">
          {formatHours(risorsa.ore_disponibili_tesoretto)}
        </div>
      </td>

      {/* Budget Assegnato */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-semibold text-gray-900">
          {formatCurrency(risorsa.budget_assegnato)}
        </div>
      </td>

      {/* Prev vs Eff */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm">
          <div className="text-gray-900">
            {formatHours(risorsa.ore_preventivate)} → {formatHours(risorsa.ore_effettive)}
          </div>
          <div className={`text-xs font-semibold ${parseFloat(risorsa.diff_ore) > 0 ? 'text-green-600' : parseFloat(risorsa.diff_ore) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
            {parseFloat(risorsa.diff_ore) > 0 ? '+' : ''}{formatHours(risorsa.diff_ore)} ({formatCurrency(risorsa.diff_euro)})
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(risorsa.status_diff)}`}>
          {getStatusIcon(risorsa.status_diff)}
          {risorsa.status_diff}
        </span>
      </td>

      {/* Azioni */}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onAssegnaOre}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-medium"
          >
            Assegna Ore
          </button>
          <button
            onClick={onViewDetails}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900 transition-colors"
          >
            Dettaglio
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default BudgetControlDashboard;