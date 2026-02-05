import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
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
  BarChart3,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import * as api from '../../utils/api';
import CreateProjectModal from '../../components/CreateProjectModal';
import ProjectDrillDownModal from '../../components/ProjectDrillDownModal';

// ============================================
// COMPONENTE: Card Progetto
// ============================================
const ProjectCard = ({ project, onClick, onDelete }) => {
  const getStatoColor = (stato) => {
    switch (stato) {
      case 'approvata': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rifiutata': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatoLabel = (stato) => {
    switch (stato) {
      case 'approvata': return 'Approvata';
      case 'pending_approval': return 'In Attesa';
      case 'rifiutata': return 'Rifiutata';
      default: return 'N/D';
    }
  };

  // Calcola percentuali
  const budgetTotale = parseFloat(project.budget_assegnato || 0);
  const budgetUtilizzato = parseFloat(project.budget_utilizzato || 0);
  const percentualeBudget = budgetTotale > 0 
    ? Math.min(100, (budgetUtilizzato / budgetTotale) * 100) 
    : 0;

  const getBudgetColor = () => {
    if (percentualeBudget >= 100) return 'bg-red-500';
    if (percentualeBudget >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

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
          <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
            <FolderOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
              {project.nome}
            </h3>
            {project.descrizione && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.descrizione}</p>
            )}
          </div>
        </div>

        {/* Badge Stato */}
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatoColor(project.stato_approvazione)}`}>
          {getStatoLabel(project.stato_approvazione)}
        </span>
      </div>

      {/* Cliente */}
      <div className="text-xs text-gray-500 mb-3">
        Cliente: <span className="font-medium text-gray-700">{project.cliente_nome}</span>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">Aree</div>
          <div className="text-lg font-bold text-gray-900">{project.numero_aree || 0}</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">Attività</div>
          <div className="text-lg font-bold text-gray-900">{project.numero_attivita || 0}</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">Task</div>
          <div className="text-lg font-bold text-gray-900">{project.numero_task || 0}</div>
        </div>
      </div>

      {/* Progress Bar Budget */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-600">Budget</span>
          <span className="text-xs font-medium text-gray-900">
            €{budgetUtilizzato.toFixed(0)} / €{budgetTotale.toFixed(0)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getBudgetColor()}`}
            style={{ width: `${percentualeBudget}%` }}
          />
        </div>
      </div>

      {/* Info Bottom */}
      <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100">
        <div className="flex items-center text-gray-600">
          <Users className="w-4 h-4 mr-1" />
          <span className="text-xs">{project.numero_risorse || 0} risorse</span>
        </div>

        {/* Pulsante Elimina */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(project);
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
// COMPONENTE PRINCIPALE: ProjectsPage
// ============================================
const ProjectsPage = () => {
  const navigate = useNavigate();

  // State
  const [projects, setProjects] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClientForCreate, setSelectedClientForCreate] = useState(null);

  // 🆕 STATE PER DRILL-DOWN MODAL
  const [showDrillDownModal, setShowDrillDownModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Filtri
  const [filters, setFilters] = useState({
    search: '',
    cliente_id: '',
    stato_approvazione: ''
  });

  // Statistiche
  const [stats, setStats] = useState({
    totale: 0,
    approvati: 0,
    in_attesa: 0,
    rifiutati: 0
  });

  // Carica dati iniziali
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProjects(),
        loadClienti()
      ]);
    } catch (err) {
      console.error('Errore caricamento dati:', err);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  // Carica progetti
  const loadProjects = async () => {
    try {
      const response = await api.projectsAPI.getProjects();
      const projectsData = response.data.projects || [];
      setProjects(projectsData);

      // Calcola statistiche
      const stats = {
        totale: projectsData.length,
        approvati: projectsData.filter(p => p.stato_approvazione === 'approvata').length,
        in_attesa: projectsData.filter(p => p.stato_approvazione === 'pending_approval').length,
        rifiutati: projectsData.filter(p => p.stato_approvazione === 'rifiutata').length
      };
      setStats(stats);

    } catch (err) {
      console.error('Errore caricamento progetti:', err);
      throw err;
    }
  };

  // Carica clienti per filtro
  const loadClienti = async () => {
    try {
      const response = await api.clientsAPI.getClients();
      setClienti(response.data.clients || []);
    } catch (err) {
      console.error('Errore caricamento clienti:', err);
    }
  };

  // Filtra progetti
  const getFilteredProjects = () => {
    return projects.filter(project => {
      // Filtro search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchNome = project.nome.toLowerCase().includes(searchLower);
        const matchDescrizione = project.descrizione?.toLowerCase().includes(searchLower);
        const matchCliente = project.cliente_nome?.toLowerCase().includes(searchLower);
        if (!matchNome && !matchDescrizione && !matchCliente) return false;
      }

      // Filtro cliente
      if (filters.cliente_id && project.cliente_id !== filters.cliente_id) return false;

      // Filtro stato
      if (filters.stato_approvazione && project.stato_approvazione !== filters.stato_approvazione) return false;

      return true;
    });
  };

  // Reset filtri
  const resetFilters = () => {
    setFilters({
      search: '',
      cliente_id: '',
      stato_approvazione: ''
    });
  };

  // Click su progetto - Apre Drill-Down Modal
  const handleProjectClick = (project) => {
    console.log('🔍 Progetto selezionato:', project);
    setSelectedProject(project);
    setShowDrillDownModal(true);
  };

  // Elimina progetto (PATTERN CLIENTE/AREA)
  const handleDelete = async (project) => {
    // Prima conferma
    const conferma = window.confirm(
      `⚠️ ATTENZIONE!\n\n` +
      `Stai per eliminare il progetto "${project.nome}" e TUTTI i dati associati:\n\n` +
      `• Tutte le aree del progetto\n` +
      `• Tutte le attività\n` +
      `• Tutte le task\n` +
      `• Tutte le assegnazioni\n\n` +
      `Questa operazione è IRREVERSIBILE!\n\n` +
      `Sei sicuro di voler procedere?`
    );

    if (!conferma) return;

    // Doppia conferma per sicurezza
    const doppiaConferma = window.confirm(
      `🚨 ULTIMA CONFERMA!\n\n` +
      `Confermi di voler eliminare definitivamente "${project.nome}"?\n\n` +
      `QUESTA AZIONE NON PUÒ ESSERE ANNULLATA!`
    );

    if (!doppiaConferma) return;

    try {
      setLoading(true);

      const response = await api.projectsAPI.delete(project.id);

      console.log('✅ Progetto eliminato:', response.data);

      // Mostra messaggio successo
      alert(
        `✅ PROGETTO ELIMINATO\n\n` +
        `Progetto: ${project.nome}\n` +
        `Aree eliminate: ${response.data.deleted?.aree || 0}\n` +
        `Attività eliminate: ${response.data.deleted?.attivita || 0}\n` +
        `Task eliminate: ${response.data.deleted?.task || 0}\n\n` +
        `Il budget è stato restituito al cliente.`
      );

      // Ricarica la lista progetti
      await loadProjects();

    } catch (err) {
      console.error('❌ Errore eliminazione progetto:', err);

      const errorMsg = err.response?.data?.details ||
                       err.response?.data?.error ||
                       'Impossibile eliminare il progetto';

      alert(`❌ ERRORE\n\n${errorMsg}`);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Apri modal creazione
  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  // Success creazione progetto
  const handleCreateSuccess = () => {
    loadProjects();
    setShowCreateModal(false);
  };

  const projectsFiltered = getFilteredProjects();
  const hasActiveFilters = filters.search || filters.cliente_id || filters.stato_approvazione;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-blue-600" />
            Progetti
          </h1>
          <p className="text-gray-600 mt-1">
            Gestisci tutti i progetti dei tuoi clienti
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg 
                   hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nuovo Progetto
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-blue-600 font-medium">Totale Progetti</div>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-900">{stats.totale}</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-green-600 font-medium">Approvati</div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-900">{stats.approvati}</div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-yellow-600 font-medium">In Attesa</div>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold text-yellow-900">{stats.in_attesa}</div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-red-600 font-medium">Rifiutati</div>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-900">{stats.rifiutati}</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filtri</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca progetto..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Cliente */}
          <select
            value={filters.cliente_id}
            onChange={(e) => setFilters({ ...filters, cliente_id: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti i clienti</option>
            {clienti.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          {/* Stato */}
          <select
            value={filters.stato_approvazione}
            onChange={(e) => setFilters({ ...filters, stato_approvazione: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti gli stati</option>
            <option value="approvata">Approvata</option>
            <option value="pending_approval">In Attesa</option>
            <option value="rifiutata">Rifiutata</option>
          </select>
        </div>

        {/* Reset filtri */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Reset filtri
          </button>
        )}
      </div>

      {/* Contatore risultati */}
      <div className="text-sm text-gray-600">
        Trovati <span className="font-semibold text-gray-900">{projectsFiltered.length}</span> progetti
        {projectsFiltered.length !== projects.length && (
          <span> su {projects.length} totali</span>
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
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Lista Progetti */}
      {!loading && projectsFiltered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            {projects.length === 0 ? 'Nessun progetto trovato' : 'Nessun risultato per i filtri selezionati'}
          </p>
          {projects.length === 0 && (
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crea il primo progetto
            </button>
          )}
        </motion.div>
      )}

      {!loading && projectsFiltered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {projectsFiltered.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project)}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal Creazione Progetto */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedClientForCreate(null);
        }}
        clienteId={selectedClientForCreate?.id}
        clienteNome={selectedClientForCreate?.nome}
        onSuccess={handleCreateSuccess}
      />

      {/* Modal Drill-Down Progetto */}
      <ProjectDrillDownModal
        isOpen={showDrillDownModal}
        onClose={() => {
          setShowDrillDownModal(false);
          setSelectedProject(null);
        }}
        progetto={selectedProject}
        clienteId={selectedProject?.cliente_id}
        clienteNome={selectedProject?.cliente_nome}
      />
    </div>
  );
};

export default ProjectsPage;