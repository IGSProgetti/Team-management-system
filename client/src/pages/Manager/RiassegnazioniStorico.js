import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft,
  Eye,
  X,
  Calendar,
  User,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Download,
  RefreshCw,
  Search,
  DollarSign,
  TrendingUp,
  BarChart3,
  AlertCircle,
  Award,
  FileText
} from 'lucide-react';

const RiassegnazioniStorico = () => {
  const [bonusStorico, setBonusStorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tipo: '',
    stato_gestione: '',
    risorsa_id: '',
    gestito_da: '',
    data_inizio: '',
    data_fine: ''
  });
  
  const [selectedBonus, setSelectedBonus] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalBonus, setTotalBonus] = useState(0);

  // Dropdown data
  const [risorse, setRisorse] = useState([]);
  const [managers, setManagers] = useState([]);

  // Fetch risorse per filtro
  useEffect(() => {
    const fetchRisorse = async () => {
      try {
        const response = await api.get('/users', { params: { ruolo: 'risorsa' } });
        setRisorse(response.data.users || []);
      } catch (error) {
        console.error('Error fetching risorse:', error);
      }
    };

    const fetchManagers = async () => {
      try {
        const response = await api.get('/users', { params: { ruolo: 'manager' } });
        setManagers(response.data.users || []);
      } catch (error) {
        console.error('Error fetching managers:', error);
      }
    };

    fetchRisorse();
    fetchManagers();
  }, []);

  // Fetch storico bonus
  const fetchStorico = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        limit: 20,
        offset: (page - 1) * 20,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };

      const response = await api.get('/bonus/storico-gestione', { params });
      
      if (response.data.success) {
        setBonusStorico(response.data.bonus);
        setTotalPages(Math.ceil(response.data.total / 20));
        setHasMore(response.data.has_more);
        setTotalBonus(response.data.total);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching storico bonus:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorico(1);
  }, [filters]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get badge color based on tipo
  const getTipoBadge = (tipo) => {
    switch(tipo) {
      case 'positivo':
        return 'bg-green-100 text-green-800';
      case 'negativo':
        return 'bg-red-100 text-red-800';
      case 'zero':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get badge text based on tipo
  const getTipoLabel = (tipo) => {
    switch(tipo) {
      case 'positivo':
        return '✅ Bonus';
      case 'negativo':
        return '❌ Penalità';
      case 'zero':
        return '🎯 Perfetto';
      default:
        return tipo;
    }
  };

  // Get action badge color
  const getAzioneBadge = (stato_gestione) => {
    switch(stato_gestione) {
      case 'pagato':
        return 'bg-green-100 text-green-800';
      case 'convertito_ore':
        return 'bg-blue-100 text-blue-800';
      case 'task_creata':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Storico Gestione Bonus</h1>
          <p className="text-gray-600 mt-1">
            Visualizza tutti i bonus e penalità gestiti ({totalBonus} totali)
          </p>
        </div>
        <button
          onClick={() => fetchStorico(currentPage)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Aggiorna
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtri</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={filters.tipo}
              onChange={(e) => setFilters({...filters, tipo: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutti</option>
              <option value="positivo">Bonus</option>
              <option value="negativo">Penalità</option>
              <option value="zero">Perfetto</option>
            </select>
          </div>

          {/* Stato Gestione */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Azione
            </label>
            <select
              value={filters.stato_gestione}
              onChange={(e) => setFilters({...filters, stato_gestione: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutte</option>
              <option value="pagato">Pagato</option>
              <option value="convertito_ore">Convertito Ore</option>
              <option value="task_creata">Task Recupero</option>
            </select>
          </div>

          {/* Risorsa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Risorsa
            </label>
            <select
              value={filters.risorsa_id}
              onChange={(e) => setFilters({...filters, risorsa_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutte</option>
              {risorse.map(risorsa => (
                <option key={risorsa.id} value={risorsa.id}>
                  {risorsa.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gestito Da
            </label>
            <select
              value={filters.gestito_da}
              onChange={(e) => setFilters({...filters, gestito_da: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutti</option>
              {managers.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {manager.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Data Inizio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Da
            </label>
            <input
              type="date"
              value={filters.data_inizio}
              onChange={(e) => setFilters({...filters, data_inizio: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Data Fine */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              A
            </label>
            <input
              type="date"
              value={filters.data_fine}
              onChange={(e) => setFilters({...filters, data_fine: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Reset Filters */}
        {Object.values(filters).some(v => v !== '') && (
          <div className="mt-4">
            <button
              onClick={() => setFilters({
                tipo: '',
                stato_gestione: '',
                risorsa_id: '',
                gestito_da: '',
                data_inizio: '',
                data_fine: ''
              })}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Azzera Filtri
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bonusStorico.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-600 mb-2">Nessun Bonus Gestito</h4>
            <p className="text-gray-500">Non ci sono bonus che corrispondono ai filtri selezionati.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Gestione
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risorsa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ore
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Importo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azione
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gestito Da
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bonusStorico.map((bonus, index) => (
                  <motion.tr
                    key={bonus.bonus_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    {/* Data Gestione */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        {formatDate(bonus.data_gestione)}
                      </div>
                    </td>

                    {/* Risorsa */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {bonus.risorsa.nome}
                          </div>
                          <div className="text-xs text-gray-500">
                            {bonus.cliente.nome}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Task */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {bonus.task.nome}
                      </div>
                      <div className="text-xs text-gray-500">
                        {bonus.progetto.nome}
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTipoBadge(bonus.tipo)}`}>
                        {getTipoLabel(bonus.tipo)}
                      </span>
                    </td>

                    {/* Ore */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>Est: {bonus.ore_stimate_ore}h</div>
                        <div>Eff: {bonus.ore_effettive_ore}h</div>
                        <div className={`font-medium ${
                          parseFloat(bonus.differenza_ore_ore) > 0 ? 'text-green-600' : 
                          parseFloat(bonus.differenza_ore_ore) < 0 ? 'text-red-600' : 
                          'text-gray-600'
                        }`}>
                          Δ {bonus.differenza_ore_ore}h
                        </div>
                      </div>
                    </td>

                    {/* Importo */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-bold ${
                        bonus.importo_bonus > 0 ? 'text-green-600' : 
                        bonus.importo_bonus < 0 ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {formatCurrency(bonus.importo_bonus)}
                      </div>
                      {bonus.percentuale_bonus > 0 && (
                        <div className="text-xs text-gray-500">
                          {bonus.percentuale_bonus}%
                        </div>
                      )}
                    </td>

                    {/* Azione */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAzioneBadge(bonus.stato_gestione)}`}>
                        {bonus.azione_descrizione}
                      </span>
                    </td>

                    {/* Gestito Da */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {bonus.manager ? bonus.manager.nome : '-'}
                      </div>
                    </td>

                    {/* Azioni */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => {
                          setSelectedBonus(bonus);
                          setShowDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Pagina {currentPage} di {totalPages} ({totalBonus} totali)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchStorico(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Precedente
              </button>
              <button
                onClick={() => fetchStorico(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Successiva
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dettagli */}
      <AnimatePresence>
        {showDetails && selectedBonus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Dettagli Bonus</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Informazioni Risorsa */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Risorsa</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Nome:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBonus.risorsa.nome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBonus.risorsa.email}</span>
                    </div>
                  </div>
                </div>

                {/* Informazioni Task */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Task Originale</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Nome:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBonus.task.nome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cliente:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBonus.cliente.nome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Progetto:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBonus.progetto.nome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Attività:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBonus.attivita.nome}</span>
                    </div>
                  </div>
                </div>

                {/* Calcoli Ore */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Calcoli Ore</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Ore Stimate:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBonus.ore_stimate_ore}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Ore Effettive:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBonus.ore_effettive_ore}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Differenza:</span>
                      <span className={`text-sm font-bold ${
                        parseFloat(selectedBonus.differenza_ore_ore) > 0 ? 'text-green-600' : 
                        parseFloat(selectedBonus.differenza_ore_ore) < 0 ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {selectedBonus.differenza_ore_ore}h
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calcoli Economici */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Calcoli Economici</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tipo:</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTipoBadge(selectedBonus.tipo)}`}>
                        {getTipoLabel(selectedBonus.tipo)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Percentuale Bonus:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBonus.percentuale_bonus}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Costo Orario Base:</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedBonus.costo_orario_base)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Costo Orario Finale:</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedBonus.costo_orario_finale)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">Importo Bonus:</span>
                      <span className={`text-lg font-bold ${
                        selectedBonus.importo_bonus > 0 ? 'text-green-600' : 
                        selectedBonus.importo_bonus < 0 ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {formatCurrency(selectedBonus.importo_bonus)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gestione */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Gestione</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Azione:</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAzioneBadge(selectedBonus.stato_gestione)}`}>
                        {selectedBonus.azione_descrizione}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Data Gestione:</span>
                      <span className="text-sm font-medium text-gray-900">{formatDate(selectedBonus.data_gestione)}</span>
                    </div>
                    {selectedBonus.manager && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Gestito Da:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedBonus.manager.nome}</span>
                      </div>
                    )}
                    {selectedBonus.note_gestione && (
                      <div className="pt-2 border-t border-gray-200">
                        <span className="text-sm text-gray-600">Note:</span>
                        <p className="text-sm text-gray-900 mt-1">{selectedBonus.note_gestione}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Task di Recupero (se presente) */}
                {selectedBonus.task_recupero && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Task di Recupero</h4>
                    <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Nome:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedBonus.task_recupero.nome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Stato:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedBonus.task_recupero.stato}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Timeline</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Creazione:</span>
                      <span className="text-sm font-medium text-gray-900">{formatDate(selectedBonus.data_creazione)}</span>
                    </div>
                    {selectedBonus.data_approvazione && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Approvazione:</span>
                        <span className="text-sm font-medium text-gray-900">{formatDate(selectedBonus.data_approvazione)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Gestione:</span>
                      <span className="text-sm font-medium text-gray-900">{formatDate(selectedBonus.data_gestione)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
                >
                  Chiudi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RiassegnazioniStorico;