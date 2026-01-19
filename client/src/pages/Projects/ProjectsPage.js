import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  DollarSign, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Plus,
  BarChart3,
  Target,
  Activity,
  Search
} from 'lucide-react';
import CreateProjectModal from './CreateProjectModal';
import ProjectDetailsModal from './ProjectDetailsModal';

// Utility functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount || 0);
};

const formatHours = (minutes) => {
  if (!minutes) return '0h';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('it-IT');
};

// Componente Overview Statistiche Globali
const ProjectsOverview = ({ overview, loading, onCardClick, activeFilter }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
            <div className="flex items-center">
              <div className="p-2 bg-gray-200 rounded-lg w-12 h-12"></div>
              <div className="ml-4 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-12"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Progetti Attivi */}
      <div 
        onClick={() => onCardClick('attivi')}
        className={`rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1 ${
          activeFilter === 'attivi' 
            ? 'bg-blue-100 border-2 border-blue-400 shadow-lg' 
            : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-blue-900">
              {overview.progetti_totali || 0}
            </div>
            <div className="text-sm text-blue-600">Progetti Attivi</div>
          </div>
        </div>
        {activeFilter === 'attivi' && (
          <div className="mt-2 text-xs text-blue-700 font-medium">
            ✓ Filtro attivo
          </div>
        )}
      </div>

      {/* Progetti Completati */}
      <div 
        onClick={() => onCardClick('completati')}
        className={`rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1 ${
          activeFilter === 'completati' 
            ? 'bg-green-100 border-2 border-green-400 shadow-lg' 
            : 'bg-green-50 border border-green-200 hover:bg-green-100'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-green-900">
              {overview.progetti_completati || 0}
            </div>
            <div className="text-sm text-green-600">Completati</div>
          </div>
        </div>
        {activeFilter === 'completati' && (
          <div className="mt-2 text-xs text-green-700 font-medium">
            ✓ Filtro attivo
          </div>
        )}
      </div>

      {/* Progetti in Ritardo */}
      <div 
        onClick={() => onCardClick('in_ritardo')}
        className={`rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1 ${
          activeFilter === 'in_ritardo' 
            ? 'bg-orange-100 border-2 border-orange-400 shadow-lg' 
            : 'bg-orange-50 border border-orange-200 hover:bg-orange-100'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2 bg-orange-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-orange-900">
              {overview.progetti_in_ritardo || 0}
            </div>
            <div className="text-sm text-orange-600">In Ritardo</div>
          </div>
        </div>
        {activeFilter === 'in_ritardo' && (
          <div className="mt-2 text-xs text-orange-700 font-medium">
            ✓ Filtro attivo
          </div>
        )}
      </div>

      {/* Budget Totale - NON cliccabile */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 rounded-lg">
            <DollarSign className="w-6 h-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(overview.budget_totale)}
            </div>
            <div className="text-sm text-purple-600">Budget Totale</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente Card Progetto Avanzata
const ProjectCard = ({ project, onCreateActivity, onProjectClick }) => {
  const getStatusColor = (indicators) => {
    if (indicators.completato) return 'bg-green-500';
    if (indicators.in_ritardo) return 'bg-red-500';
    if (indicators.over_budget) return 'bg-orange-500';
    if (indicators.in_corso) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getStatusText = (indicators) => {
    if (indicators.completato) return 'Completato';
    if (indicators.in_ritardo) return 'In Ritardo';
    if (indicators.over_budget) return 'Over Budget';
    if (indicators.in_corso) return 'In Corso';
    return 'Pianificato';
  };

  return (
    <div 
      onClick={() => onProjectClick(project)}
      className="bg-white rounded-xl shadow-sm border hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer group"
    >
      {/* Header con Status */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
              {project.nome}
            </h3>
            <p className="text-sm text-gray-500">{project.cliente_nome}</p>
          </div>
          <div className="flex items-center">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(project.status_indicators)}`}>
              {getStatusText(project.status_indicators)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso</span>
            <span className="text-sm text-gray-500">{project.progresso_completamento}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                project.progresso_completamento >= 100 ? 'bg-green-500' :
                project.progresso_completamento >= 75 ? 'bg-blue-500' :
                project.progresso_completamento >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${project.progresso_completamento}%` }}
            ></div>
          </div>
        </div>

        {/* Budget Section */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <DollarSign className="w-4 h-4 text-blue-600 mr-1" />
              <span className="text-sm text-blue-600">Budget</span>
            </div>
            <div className="font-semibold text-blue-900">
              {formatCurrency(project.budget_assegnato)}
            </div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-sm text-green-600">Speso</span>
            </div>
            <div className="font-semibold text-green-900">
              {formatCurrency(project.costo_sostenuto)}
            </div>
          </div>
        </div>

        {/* Metriche Attività e Task */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{project.numero_attivita}</div>
            <div className="text-xs text-gray-500">Attività</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{project.numero_task}</div>
            <div className="text-xs text-gray-500">Task</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{project.risorse_assegnate?.length || 0}</div>
            <div className="text-xs text-gray-500">Risorse</div>
          </div>
        </div>
      </div>

      {/* Sezione Prossimi Passi Personali */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-3">🎯 I Miei Prossimi Passi</h4>
        {project.mie_task_prossime && project.mie_task_prossime.length > 0 ? (
          <div className="space-y-2">
            {project.mie_task_prossime.slice(0, 3).map((task, index) => (
              <div key={index} className={`flex items-center justify-between p-2 rounded ${task.in_ritardo ? 'bg-red-50 border border-red-200' : 'bg-white'}`}>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{task.nome}</div>
                  <div className="text-xs text-gray-500">{task.attivita_nome}</div>
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(task.scadenza)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">Nessuna task assegnata</p>
        )}
      </div>

      {/* Sezione Stato Team */}
      <div className="px-6 py-4 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-3">👥 Stato Team</h4>
        {project.stato_team && project.stato_team.length > 0 ? (
          <div className="space-y-2">
            {project.stato_team.slice(0, 3).map((teamItem, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-gray-900">{teamItem.utente_nome}</div>
                  <div className="text-xs text-gray-500">{teamItem.task_nome}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  teamItem.task_stato === 'in_esecuzione' ? 'bg-blue-100 text-blue-700' :
                  teamItem.task_stato === 'completata' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {teamItem.task_stato}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">Nessuna attività in corso</p>
        )}
      </div>

      {/* Actions Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation(); // Previene l'apertura del modal
              onCreateActivity(project.id, project.nome);
            }}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuova Attività
          </button>
          
          <button 
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          
          <button 
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
        
        {/* Indicatore click */}
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
            Click sulla card per vedere dettagli
          </span>
        </div>
      </div>
    </div>
  );
};

// Componente Principale Projects Dashboard
const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [overview, setOverview] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // AGGIUNGI:
  const [filters, setFilters] = useState({ 
  status: 'all', // 'all', 'attivi', 'completati', 'in_ritardo'
  search: '' 
  });

  // Fetch dati dashboard
  const fetchDashboard = async () => {
    try {
      setLoading(true);
      
      // Ottieni il token dall'auth storage
      const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
      const token = authData.state?.token;

      if (!token) {
        throw new Error('Token non trovato - effettua il login');
      }

      const response = await fetch('/api/projects/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Errore API: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      
      setProjects(data.projects || []);
      setOverview(data.overview || {});
      setError(null);

    } catch (err) {
      console.error('Errore fetch dashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Handler per creare nuova attività
  const handleCreateActivity = (projectId, projectName) => {
    console.log(`Apertura form attività per progetto: ${projectName} (${projectId})`);
    
    // Salva il progetto selezionato nello storage per la pagina attività
    localStorage.setItem('selected_project', JSON.stringify({
      id: projectId,
      nome: projectName
    }));
    
    // Reindirizza alla pagina attività
    window.location.href = '/activities';
  };

  // Handler per progetto creato con successo
  const handleProjectCreated = (newProject) => {
    console.log('Progetto creato:', newProject);
    // Refresh della dashboard per mostrare il nuovo progetto
    fetchDashboard();
  };

  // Handler per aprire dettagli progetto
  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setShowDetailsModal(true);
  };

  // DOPO la funzione handleProjectClick esistente, AGGIUNGI:
const handleStatsCardClick = (filterType) => {
  setFilters(prev => ({ ...prev, status: filterType }));
};

const handleSearchChange = (searchTerm) => {
   setFilters(prev => ({ ...prev, search: searchTerm }));
};

// AGGIUNGI questa funzione dopo handleSearchChange:
const getFilteredProjects = () => {
  let filtered = projects;

  // Filtro per stato
  if (filters.status !== 'all') {
    filtered = filtered.filter(project => {
      switch (filters.status) {
        case 'attivi':
          return project.status_indicators?.in_corso || 
                 (!project.status_indicators?.completato && 
                  !project.status_indicators?.in_ritardo);
        case 'completati':
          return project.status_indicators?.completato;
        case 'in_ritardo':
          return project.status_indicators?.in_ritardo;
        default:
          return true;
      }
    });
  }

  // Filtro per ricerca (nome progetto o cliente)
  if (filters.search.trim()) {
    const searchLower = filters.search.toLowerCase().trim();
    filtered = filtered.filter(project =>
      project.nome?.toLowerCase().includes(searchLower) ||
      project.cliente_nome?.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
};

  // Handler per chiudere modal dettagli
  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedProject(null);
  };

  // Render error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Progetti</h1>
            <p className="text-gray-500 mt-1">Centro di controllo per gestione progetti</p>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Errore caricamento dati</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchDashboard}
                className="mt-3 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Riprova
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Progetti</h1>
          <p className="text-gray-500 mt-1">Centro di controllo per gestione progetti e attività</p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Progetto
        </button>
      </div>

      {/* AGGIUNGI QUESTA SEZIONE: Barra di Ricerca e Filtri */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cerca per nome progetto o cliente..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Reset Filtri */}
        {(filters.status !== 'all' || filters.search) && (
          <button
            onClick={() => setFilters({ status: 'all', search: '' })}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancella filtri
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <ProjectsOverview 
      overview={overview} 
      loading={loading} 
      onCardClick={handleStatsCardClick}
      activeFilter={filters.status}
      />

      {/* Progetti Grid */}
      {loading ? (
        // Loading skeleton
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border animate-pulse">
              <div className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : projects.length > 0 ? (
  (() => {
    const filteredProjects = getFilteredProjects();
    
    return filteredProjects.length > 0 ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            onCreateActivity={handleCreateActivity}
            onProjectClick={handleProjectClick}
          />
        ))}
      </div>
    ) : (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nessun progetto trovato
        </h3>
        <p className="text-gray-500 mb-4">
          {filters.search ? 
            `Nessun progetto corrisponde a "${filters.search}"` :
            `Nessun progetto ${filters.status === 'attivi' ? 'attivo' : 
                              filters.status === 'completati' ? 'completato' : 
                              'in ritardo'}`
          }
        </p>
        <button
          onClick={() => setFilters({ status: 'all', search: '' })}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Cancella filtri
        </button>
      </div>
    );
  })()
      ) : (
        // Empty state
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun progetto trovato</h3>
          <p className="text-gray-500 mb-6">
            Crea il tuo primo progetto per iniziare a gestire attività e task
          </p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crea Primo Progetto
          </button>
        </div>
      )}

      {/* Modal Creazione Progetto */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProjectCreated={handleProjectCreated}
      />

      {/* Modal Dettagli Progetto */}
      <ProjectDetailsModal
        project={selectedProject}
        isOpen={showDetailsModal}
        onClose={handleCloseDetails}
        onCreateActivity={handleCreateActivity}
      />
    </div>
  );
};

export default ProjectsPage;