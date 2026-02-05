import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Search,
  Filter,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Loader,
  ArrowLeft,
  BarChart3
} from 'lucide-react';
import * as api from '../../utils/api';
import CreateAreaModal from '../../components/CreateAreaModal';
import AreaDrillDownModal from '../../components/AreaDrillDownModal'; // 🆕 IMPORT

// ============================================
// COMPONENTE: Card Area
// ============================================
const AreaCard = ({ area, onClick, onDelete }) => {
  const getStatoColor = (stato) => {
    switch (stato) {
      case 'completata': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_corso': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pianificata': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatoLabel = (stato) => {
    switch (stato) {
      case 'completata': return 'Completata';
      case 'in_corso': return 'In Corso';
      case 'pianificata': return 'Pianificata';
      default: return 'N/D';
    }
  };

  // Calcola percentuale completamento
  const percentualeCompletamento = area.numero_task > 0 
    ? Math.round((area.task_completate / area.numero_task) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
            <Building2 className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-1">
              {area.nome}
            </h3>
            {area.descrizione && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{area.descrizione}</p>
            )}
          </div>
        </div>

        {/* Badge Stato */}
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatoColor(area.stato)}`}>
          {getStatoLabel(area.stato)}
        </span>
      </div>

      {/* Breadcrumb Progetto */}
      <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
        <span className="truncate">{area.cliente_nome}</span>
        <span>›</span>
        <span className="truncate font-medium">{area.progetto_nome}</span>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">Attività</div>
          <div className="text-lg font-bold text-gray-900">{area.numero_attivita || 0}</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">Task</div>
          <div className="text-lg font-bold text-gray-900">{area.numero_task || 0}</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">Completate</div>
          <div className="text-lg font-bold text-green-600">{area.task_completate || 0}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-600">Progresso</span>
          <span className="text-xs font-medium text-gray-900">{percentualeCompletamento}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentualeCompletamento}%` }}
          />
        </div>
      </div>

      {/* Info Bottom */}
      <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100">
        <div className="flex items-center text-gray-600">
          <Users className="w-4 h-4 mr-1" />
          <span className="text-xs">
            {area.coordinatore_nome || 'Nessun coordinatore'}
          </span>
        </div>

        {/* Pulsante Elimina */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(area);
          }}
          className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Elimina
        </button>
      </div>
    </motion.div>
  );
};

// ============================================
// COMPONENTE PRINCIPALE: AreasPage
// ============================================
const AreasPage = () => {
  const navigate = useNavigate();
  const { progettoId } = useParams(); // Opzionale: /areas/:progettoId per vista contestuale

  // State
  const [aree, setAree] = useState([]);
  const [progetti, setProgetti] = useState([]);
  const [coordinatori, setCoordinatori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProjectForCreate, setSelectedProjectForCreate] = useState(null);

  // 🆕 STATE PER DRILL-DOWN MODAL
  const [showDrillDownModal, setShowDrillDownModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);

  // Filtri
  const [filters, setFilters] = useState({
    search: '',
    progetto_id: progettoId || '',
    coordinatore_id: '',
    stato: ''
  });

  // Statistiche
  const [stats, setStats] = useState({
    totale: 0,
    pianificate: 0,
    in_corso: 0,
    completate: 0
  });

  // Carica dati iniziali
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAree(),
        loadProgetti(),
        loadCoordinatori()
      ]);
    } catch (err) {
      console.error('Errore caricamento dati:', err);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  // Carica aree
  const loadAree = async () => {
    try {
      const params = {};
      if (progettoId) params.progetto_id = progettoId;

      const response = await api.areeAPI.getAll(params);
      const areeData = response.data.aree || [];
      setAree(areeData);

      // Calcola statistiche
      const stats = {
        totale: areeData.length,
        pianificate: areeData.filter(a => a.stato === 'pianificata').length,
        in_corso: areeData.filter(a => a.stato === 'in_corso').length,
        completate: areeData.filter(a => a.stato === 'completata').length
      };
      setStats(stats);

    } catch (err) {
      console.error('Errore caricamento aree:', err);
      throw err;
    }
  };

  // Carica progetti per filtro
  const loadProgetti = async () => {
    try {
      const response = await api.projectsAPI.getProjects();
      setProgetti(response.data.projects || []);
    } catch (err) {
      console.error('Errore caricamento progetti:', err);
    }
  };

  // Carica coordinatori per filtro
  const loadCoordinatori = async () => {
    try {
      const response = await api.usersAPI.getUsers({ ruolo: 'coordinatore' });
      setCoordinatori(response.data.users || []);
    } catch (err) {
      console.error('Errore caricamento coordinatori:', err);
    }
  };

  // Filtra aree
  const getFilteredAree = () => {
    return aree.filter(area => {
      // Filtro search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchNome = area.nome.toLowerCase().includes(searchLower);
        const matchDescrizione = area.descrizione?.toLowerCase().includes(searchLower);
        if (!matchNome && !matchDescrizione) return false;
      }

      // Filtro progetto
      if (filters.progetto_id && area.progetto_id !== filters.progetto_id) return false;

      // Filtro coordinatore
      if (filters.coordinatore_id && area.coordinatore_id !== filters.coordinatore_id) return false;

      // Filtro stato
      if (filters.stato && area.stato !== filters.stato) return false;

      return true;
    });
  };

  // Reset filtri
  const resetFilters = () => {
    setFilters({
      search: '',
      progetto_id: progettoId || '',
      coordinatore_id: '',
      stato: ''
    });
  };

  // 🆕 Click su area - Apre Drill-Down Modal
  const handleAreaClick = (area) => {
    console.log('🔍 Area selezionata:', area);
    setSelectedArea(area);
    setShowDrillDownModal(true);
  };

  // Elimina area (PATTERN CLIENTE)
  const handleDelete = async (area) => {
    // Prima conferma
    const conferma = window.confirm(
      `⚠️ ATTENZIONE!\n\n` +
      `Stai per eliminare l'area "${area.nome}" e TUTTI i dati associati:\n\n` +
      `• Tutte le attività dell'area\n` +
      `• Tutte le task\n` +
      `• Tutte le assegnazioni\n\n` +
      `Questa operazione è IRREVERSIBILE!\n\n` +
      `Sei sicuro di voler procedere?`
    );

    if (!conferma) return;

    // Doppia conferma per sicurezza
    const doppiaConferma = window.confirm(
      `🚨 ULTIMA CONFERMA!\n\n` +
      `Confermi di voler eliminare definitivamente "${area.nome}"?\n\n` +
      `QUESTA AZIONE NON PUÒ ESSERE ANNULLATA!`
    );

    if (!doppiaConferma) return;

    try {
      setLoading(true);

      const response = await api.areeAPI.delete(area.id);

      console.log('✅ Area eliminata:', response.data);

      // Mostra messaggio successo
      alert(
        `✅ AREA ELIMINATA\n\n` +
        `Area: ${area.nome}\n` +
        `Attività eliminate: ${response.data.deleted?.attivita || 0}\n` +
        `Task eliminate: ${response.data.deleted?.task || 0}\n\n` +
        `Le ore assegnate sono tornate disponibili nel progetto.`
      );

      // Ricarica la lista aree
      await loadAree();

    } catch (err) {
      console.error('❌ Errore eliminazione area:', err);

      const errorMsg = err.response?.data?.details ||
                       err.response?.data?.error ||
                       'Impossibile eliminare l\'area';

      alert(`❌ ERRORE\n\n${errorMsg}`);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Apri modal creazione
  const handleOpenCreateModal = () => {
    // Se c'è un progetto filtrato, pre-selezionalo
    if (filters.progetto_id) {
      const progetto = progetti.find(p => p.id === filters.progetto_id);
      setSelectedProjectForCreate(progetto);
    } else {
      setSelectedProjectForCreate(null);
    }
    setShowCreateModal(true);
  };

  // Success creazione area
  const handleCreateSuccess = () => {
    loadAree();
    setShowCreateModal(false);
    setSelectedProjectForCreate(null);
  };

  const areeFiltered = getFilteredAree();
  const hasActiveFilters = filters.search || filters.progetto_id || filters.coordinatore_id || filters.stato;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            {progettoId && (
              <button
                onClick={() => navigate('/projects')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-purple-600" />
              Aree
            </h1>
          </div>
          <p className="text-gray-600 mt-1">
            {progettoId ? 'Aree del progetto selezionato' : 'Gestisci tutte le aree dei tuoi progetti'}
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg 
                   hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nuova Area
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-blue-600 font-medium">Totale Aree</div>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-900">{stats.totale}</div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-yellow-600 font-medium">Pianificate</div>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold text-yellow-900">{stats.pianificate}</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-blue-600 font-medium">In Corso</div>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-900">{stats.in_corso}</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-green-600 font-medium">Completate</div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-900">{stats.completate}</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filtri</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca area..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Progetto */}
          {!progettoId && (
            <select
              value={filters.progetto_id}
              onChange={(e) => setFilters({ ...filters, progetto_id: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Tutti i progetti</option>
              {progetti.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          )}

          {/* Coordinatore */}
          <select
            value={filters.coordinatore_id}
            onChange={(e) => setFilters({ ...filters, coordinatore_id: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Tutti i coordinatori</option>
            {coordinatori.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          {/* Stato */}
          <select
            value={filters.stato}
            onChange={(e) => setFilters({ ...filters, stato: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Tutti gli stati</option>
            <option value="pianificata">Pianificata</option>
            <option value="in_corso">In Corso</option>
            <option value="completata">Completata</option>
          </select>
        </div>

        {/* Reset filtri */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="mt-3 text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Reset filtri
          </button>
        )}
      </div>

      {/* Contatore risultati */}
      <div className="text-sm text-gray-600">
        Trovate <span className="font-semibold text-gray-900">{areeFiltered.length}</span> aree
        {areeFiltered.length !== aree.length && (
          <span> su {aree.length} totali</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-800 font-semibold">Errore</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      )}

      {/* Lista Aree */}
      {!loading && areeFiltered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            {aree.length === 0 ? 'Nessuna area trovata' : 'Nessun risultato per i filtri selezionati'}
          </p>
          {aree.length === 0 && (
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Crea la prima area
            </button>
          )}
        </motion.div>
      )}

      {!loading && areeFiltered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {areeFiltered.map(area => (
              <AreaCard
                key={area.id}
                area={area}
                onClick={() => handleAreaClick(area)}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal Creazione Area */}
      <CreateAreaModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedProjectForCreate(null);
        }}
        progettoId={selectedProjectForCreate?.id}
        progettoNome={selectedProjectForCreate?.nome}
        onSuccess={handleCreateSuccess}
      />

      {/* 🆕 Modal Drill-Down Area */}
      <AreaDrillDownModal
        isOpen={showDrillDownModal}
        onClose={() => {
          setShowDrillDownModal(false);
          setSelectedArea(null);
        }}
        area={selectedArea}
        progettoNome={selectedArea?.progetto_nome}
        clienteNome={selectedArea?.cliente_nome}
      />
    </div>
  );
};

export default AreasPage;