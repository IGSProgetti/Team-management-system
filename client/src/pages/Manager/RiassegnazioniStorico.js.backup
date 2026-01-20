import React, { useState, useEffect } from 'react';
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
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  BarChart3,
  AlertCircle
} from 'lucide-react';

const RiassegnazioniStorico = () => {
  const [riassegnazioni, setRiassegnazioni] = useState([]);
  const [statistiche, setStatistiche] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    stato: '',
    risorsa_id: '',
    progetto_id: '',
    data_inizio: '',
    data_fine: '',
    search: ''
  });
  
  const [selectedRiassegnazione, setSelectedRiassegnazione] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAnnullaModal, setShowAnnullaModal] = useState(false);
  const [motivoAnnullamento, setMotivoAnnullamento] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const getToken = () => {
    const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    return authData.state?.token;
  };

  // Fetch statistiche
  const fetchStatistiche = async () => {
    try {
      const response = await fetch('/api/riassegnazioni/statistiche', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        setStatistiche(data.statistiche);
      }
    } catch (error) {
      console.error('Error fetching statistiche:', error);
    }
  };

  // Fetch storico riassegnazioni
  const fetchStorico = async (page = 1) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        limit: '20',
        offset: ((page - 1) * 20).toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await fetch(`/api/riassegnazioni/storico?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setRiassegnazioni(data.riassegnazioni);
        setTotalPages(Math.ceil(data.total / 20));
        setHasMore(data.has_more);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching storico:', error);
    } finally {
      setLoading(false);
    }
  };

  // Annulla riassegnazione
  const annullaRiassegnazione = async (id) => {
    try {
      const response = await fetch(`/api/riassegnazioni/${id}/annulla`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ motivo_annullamento: motivoAnnullamento })
      });

      if (response.ok) {
        setShowAnnullaModal(false);
        setMotivoAnnullamento('');
        fetchStorico(currentPage);
        fetchStatistiche();
        // TODO: Show success toast
      }
    } catch (error) {
      console.error('Error annulling riassegnazione:', error);
    }
  };

  useEffect(() => {
    fetchStorico();
    fetchStatistiche();
  }, []);

  useEffect(() => {
    fetchStorico(1);
  }, [filters]);

  // Format time
  const formatTime = (minutes) => {
    if (!minutes) return '0min';
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(Math.abs(amount || 0));
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <ArrowRightLeft className="w-8 h-8 text-green-600" />
            Storico Riassegnazioni Ore
          </h1>
          <p className="text-gray-600">
            Visualizza e gestisci tutte le riassegnazioni ore del team
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchStorico(currentPage)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Aggiorna
          </button>
          <button className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
            <Download size={18} />
            Esporta
          </button>
        </div>
      </div>

      {/* Statistiche Overview */}
      {statistiche && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Riassegnazioni Attive</p>
                <p className="text-3xl font-bold text-green-600">
                  {statistiche.riassegnazioni.attive}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Ore Riassegnate</p>
                <p className="text-3xl font-bold text-blue-600">
                  {statistiche.minuti.ore_riassegnate_attive}h
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Crediti Disponibili</p>
                <p className="text-3xl font-bold text-purple-600">
                  {statistiche.crediti.ore_disponibili}h
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">% Compensazione</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {statistiche.compensazione.percentuale_possibile}%
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtri di Ricerca
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stato</label>
            <select
              value={filters.stato}
              onChange={(e) => setFilters({...filters, stato: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutti</option>
              <option value="attiva">Attive</option>
              <option value="annullata">Annullate</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Inizio</label>
            <input
              type="date"
              value={filters.data_inizio}
              onChange={(e) => setFilters({...filters, data_inizio: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Fine</label>
            <input
              type="date"
              value={filters.data_fine}
              onChange={(e) => setFilters({...filters, data_fine: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cerca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Task, risorsa, progetto..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setFilters({
              stato: '', risorsa_id: '', progetto_id: '', data_inizio: '', data_fine: '', search: ''
            })}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm"
          >
            Reset Filtri
          </button>
        </div>
      </div>

      {/* Riassegnazioni Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Riassegnazioni ({riassegnazioni.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : riassegnazioni.length === 0 ? (
          <div className="text-center py-12">
            <ArrowRightLeft className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-600 mb-2">Nessuna Riassegnazione</h4>
            <p className="text-gray-500">Non ci sono riassegnazioni che corrispondono ai filtri selezionati.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Da Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    A Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ore
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valore
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {riassegnazioni.map((riassegnazione, index) => (
                  <motion.tr
                    key={riassegnazione.riassegnazione_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar size={14} className="text-gray-400 mr-2" />
                        {formatDate(riassegnazione.data_riassegnazione)}
                      </div>
                    </td>
                    
                    {/* MODIFICATA: Colonna Da Task con Badge Cliente BLU */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{riassegnazione.task_sorgente_nome}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-md">
                            {riassegnazione.cliente_sorgente_nome}
                          </span>
                          <span className="text-xs text-gray-500">
                            {riassegnazione.risorsa_sorgente_nome} • {riassegnazione.progetto_sorgente_nome}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* MODIFICATA: Colonna A Task con Badge Cliente VERDE */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">
                          {riassegnazione.task_destinazione_nome || 'Nuova Task'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-md">
                            {riassegnazione.cliente_destinazione_nome}
                          </span>
                          <span className="text-xs text-gray-500">
                            {riassegnazione.risorsa_destinazione_nome || '—'} • {riassegnazione.progetto_destinazione_nome}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center text-blue-600">
                        <ArrowRightLeft size={14} className="mr-1" />
                        {formatTime(riassegnazione.minuti_assegnati)}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(riassegnazione.valore_riassegnazione || 0)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {riassegnazione.stato === 'attiva' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle size={12} className="mr-1" />
                          Attiva
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle size={12} className="mr-1" />
                          Annullata
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <User size={14} className="text-gray-400 mr-2" />
                        {riassegnazione.manager_nome}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedRiassegnazione(riassegnazione);
                            setShowDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {riassegnazione.stato === 'attiva' && (
                          <button
                            onClick={() => {
                              setSelectedRiassegnazione(riassegnazione);
                              setShowAnnullaModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
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
              Pagina {currentPage} di {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchStorico(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Precedente
              </button>
              <button
                onClick={() => fetchStorico(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Successiva
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetails && selectedRiassegnazione && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Dettagli Riassegnazione</h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Timeline */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 p-3 bg-green-100 rounded-lg">
                        <p className="text-sm text-gray-600">DA:</p>
                        <p className="font-semibold">{selectedRiassegnazione.task_sorgente_nome}</p>
                        <p className="text-sm text-green-600">-{formatTime(selectedRiassegnazione.minuti_prelevati)}</p>
                      </div>
                      
                      <ArrowRightLeft className="w-6 h-6 text-gray-400" />
                      
                      <div className="flex-1 p-3 bg-blue-100 rounded-lg">
                        <p className="text-sm text-gray-600">A:</p>
                        <p className="font-semibold">
                          {selectedRiassegnazione.task_destinazione_nome || 'Nuova Task'}
                        </p>
                        <p className="text-sm text-blue-600">+{formatTime(selectedRiassegnazione.minuti_assegnati)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Data Riassegnazione:</p>
                      <p className="font-medium">{formatDate(selectedRiassegnazione.data_riassegnazione)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Manager:</p>
                      <p className="font-medium">{selectedRiassegnazione.manager_nome}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Stato:</p>
                      <p className={`font-medium ${
                        selectedRiassegnazione.stato === 'attiva' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedRiassegnazione.stato === 'attiva' ? 'Attiva' : 'Annullata'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Valore:</p>
                      <p className="font-medium text-green-600">
                        {formatCurrency(selectedRiassegnazione.valore_riassegnazione || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Motivo */}
                  <div>
                    <p className="text-gray-500 mb-2">Motivo:</p>
                    <p className="bg-gray-50 p-3 rounded-lg text-sm">
                      {selectedRiassegnazione.motivo || 'Nessun motivo specificato'}
                    </p>
                  </div>

                  {/* Annullamento info */}
                  {selectedRiassegnazione.stato === 'annullata' && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-900 mb-2">Informazioni Annullamento</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="text-red-700">Data:</span> {formatDate(selectedRiassegnazione.data_annullamento)}</p>
                        <p><span className="text-red-700">Annullata da:</span> {selectedRiassegnazione.annullato_da_nome}</p>
                        <p><span className="text-red-700">Motivo:</span> {selectedRiassegnazione.motivo_annullamento}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Annulla Modal */}
      <AnimatePresence>
        {showAnnullaModal && selectedRiassegnazione && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAnnullaModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <h3 className="text-lg font-bold text-gray-900">Annulla Riassegnazione</h3>
                </div>

                <p className="text-gray-600 mb-4">
                  Sei sicuro di voler annullare questa riassegnazione? Questa azione non può essere annullata.
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo annullamento:
                  </label>
                  <textarea
                    value={motivoAnnullamento}
                    onChange={(e) => setMotivoAnnullamento(e.target.value)}
                    placeholder="Inserisci il motivo dell'annullamento..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    rows={3}
                    required
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowAnnullaModal(false);
                      setMotivoAnnullamento('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => annullaRiassegnazione(selectedRiassegnazione.riassegnazione_id)}
                    disabled={!motivoAnnullamento.trim()}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:bg-gray-400"
                  >
                    Conferma Annullamento
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RiassegnazioniStorico;