import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  X, 
  Loader2, 
  Calendar, 
  Users, 
  CheckCircle,
  Briefcase,
  Layers,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Target,
  PlayCircle,
  Timer,
  User,
  Zap,
  BarChart3,
  Filter,
  Search
} from 'lucide-react';
import * as api from '../../utils/api';
import { useAuth } from '../../hooks';

// ========================================
// UTILITY FUNCTIONS
// ========================================
const formatMinutesToHours = (minutes) => {
  if (!minutes || minutes === 0) return '0h';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const calculateProgress = (activity) => {
  if (!activity.numero_task || activity.numero_task === 0) return 0;
  return Math.round((activity.task_completate / activity.numero_task) * 100);
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'completata':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'in_esecuzione':
      return <PlayCircle className="w-4 h-4 text-blue-600" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'completata':
      return 'bg-green-100 text-green-800';
    case 'in_esecuzione':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// ========================================
// MAIN COMPONENT
// ========================================
const ActivitiesPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // State
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [preselectedProject, setPreselectedProject] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);        // ✅ NUOVO
  const [activityToEdit, setActivityToEdit] = useState(null);       // ✅ NUOVO
  const [filters, setFilters] = useState({
    search: '',
    progetto_id: '',
    stato: ''
  });

  const isManager = user?.ruolo === 'manager';

  // ========================================
  // LOAD DATA
  // ========================================
  useEffect(() => {
    loadData();
  }, []);

  // Controlla progetto pre-selezionato
  useEffect(() => {
    if (location.state?.openCreateModal && location.state?.project) {
      setPreselectedProject(location.state.project);
      setShowCreateModal(true);
    }
  }, [location.state]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carica attività
      const activitiesResponse = await api.activitiesAPI.getActivities();
      setActivities(activitiesResponse.data.activities || []);
      
      // Carica progetti (per filtri)
      const projectsResponse = await api.projectsAPI.getProjects();
      setProjects(projectsResponse.data.projects || []);
      
    } catch (error) {
      console.error('Errore caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // HANDLERS
  // ========================================
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setPreselectedProject(null);
    navigate(location.pathname, { replace: true, state: {} });
  };

  const handleActivityCreated = () => {
    handleCloseModal();
    loadData(); // Ricarica lista
  };

  const handleCreateTask = (activityId, activityName) => {
    setSelectedActivity({ id: activityId, nome: activityName });
    setShowCreateTaskModal(true);
  };

  const handleTaskCreated = () => {
    setShowCreateTaskModal(false);
    setSelectedActivity(null);
    loadData(); // Ricarica lista
  };

  const handleActivityStatusChange = async (activityId, newStatus) => {
    try {
      await api.activitiesAPI.updateActivity(activityId, { stato: newStatus });
      loadData();
    } catch (error) {
      console.error('Errore cambio stato:', error);
      alert('Errore durante il cambio di stato dell\'attività');
    }
  };

  // ✅ NUOVO: Handler per modifica attività
const handleEditActivity = (activity) => {
  setActivityToEdit(activity);
  setShowEditModal(true);
};

const handleActivityUpdated = () => {
  setShowEditModal(false);
  setActivityToEdit(null);
  loadData(); // Ricarica lista
};

// ✅ NUOVO: Handler per eliminazione attività
const handleDeleteActivity = async (activityId) => {
  try {
    await api.activitiesAPI.deleteActivity(activityId);
    loadData(); // Ricarica lista
    alert('✅ Attività eliminata con successo!');
  } catch (error) {
    console.error('Errore eliminazione attività:', error);
    alert(`❌ Errore: ${error.response?.data?.details || 'Impossibile eliminare l\'attività'}`);
  }
};

  // ========================================
  // FILTER ACTIVITIES
  // ========================================
  const filteredActivities = activities.filter(activity => {
    // Filtro ricerca testuale
    if (filters.search && !activity.nome.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Filtro progetto
    if (filters.progetto_id && activity.progetto_id !== filters.progetto_id) {
      return false;
    }
    
    // Filtro stato
    if (filters.stato && activity.stato !== filters.stato) {
      return false;
    }
    
    return true;
  });

  // Calcola statistiche
  const stats = {
    totale: filteredActivities.length,
    completate: filteredActivities.filter(a => a.stato === 'completata').length,
    inCorso: filteredActivities.filter(a => a.stato === 'in_esecuzione').length
  };

  // ========================================
  // RENDER
  // ========================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Layers className="w-8 h-8 text-blue-600" />
                Gestione Attività
              </h1>
              <p className="text-gray-600 mt-1">
                {isManager 
                  ? 'Ore calcolate automaticamente dalle task - Gestione completa attività' 
                  : 'Le tue attività assegnate con calcolo automatico dei tempi'}
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Nuova Attività
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Filtri */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filtri</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ricerca */}
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cerca attività..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Progetto */}
            <select
              value={filters.progetto_id}
              onChange={(e) => setFilters({ ...filters, progetto_id: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tutti i progetti</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.nome}
                </option>
              ))}
            </select>

            {/* Filtro Stato */}
            <select
              value={filters.stato}
              onChange={(e) => setFilters({ ...filters, stato: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tutti gli stati</option>
              <option value="pianificata">Pianificata</option>
              <option value="in_esecuzione">In Esecuzione</option>
              <option value="completata">Completata</option>
            </select>
          </div>

          {/* Reset Filtri */}
          {(filters.search || filters.progetto_id || filters.stato) && (
            <button
              onClick={() => setFilters({ search: '', progetto_id: '', stato: '' })}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Cancella filtri
            </button>
          )}
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-blue-900">{stats.totale}</div>
                <div className="text-sm text-blue-600">Totale Attività</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-green-900">{stats.completate}</div>
                <div className="text-sm text-green-600">Completate</div>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <PlayCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-orange-900">{stats.inCorso}</div>
                <div className="text-sm text-orange-600">In Corso</div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista Attività */}
        {filteredActivities.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredActivities.map((activity) => (
              <ActivityCard 
                key={activity.id} 
                activity={activity} 
                onCreateTask={handleCreateTask}
                onStatusChange={handleActivityStatusChange}
                onEdit={handleEditActivity}           // ✅ NUOVO
                onDelete={handleDeleteActivity}       // ✅ NUOVO

              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessuna attività trovata
            </h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.progetto_id || filters.stato 
                ? 'Prova a modificare i filtri di ricerca' 
                : 'Inizia creando la tua prima attività'}
            </p>
            {(filters.search || filters.progetto_id || filters.stato) && (
              <button
                onClick={() => setFilters({ search: '', progetto_id: '', stato: '' })}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Cancella filtri
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal Creazione Attività */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateActivityModal
            isOpen={showCreateModal}
            onClose={handleCloseModal}
            preselectedProject={preselectedProject}
            onSuccess={handleActivityCreated}
          />
        )}
      </AnimatePresence>

      {/* Modal Creazione Task */}
{showCreateTaskModal && selectedActivity && (
  <CreateTaskModal
    isOpen={showCreateTaskModal}
    activityId={selectedActivity.id}
    activityName={selectedActivity.nome}
    onClose={() => {
      setShowCreateTaskModal(false);
      setSelectedActivity(null);
    }}
    onSuccess={handleTaskCreated}
  />
)}

{/* ✅ NUOVO: Modal Modifica Attività */}
<AnimatePresence>
  {showEditModal && activityToEdit && (
    <EditActivityModal
      isOpen={showEditModal}
      activity={activityToEdit}
      onClose={() => {
        setShowEditModal(false);
        setActivityToEdit(null);
      }}
      onSuccess={handleActivityUpdated}
    />
  )}
</AnimatePresence>
</div>
  );
};

// ========================================
// ACTIVITY CARD COMPONENT (VERSIONE CON AZIONI)
// ========================================
const ActivityCard = ({ activity, onCreateTask, onStatusChange, onEdit, onDelete }) => {
  const { user } = useAuth();
  const isManager = user?.ruolo === 'manager';
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const progress = calculateProgress(activity);
  const isOverdue = new Date(activity.scadenza) < new Date() && activity.stato !== 'completata';
  
  const oreStimate = activity.ore_stimate || 0;
  const oreEffettive = activity.ore_effettive || 0;
  const performanceColor = oreEffettive > oreStimate ? 'text-red-600' : 
                          oreEffettive < oreStimate ? 'text-green-600' : 'text-gray-600';

  // Carica task quando espandi
  useEffect(() => {
    if (isExpanded && tasks.length === 0) {
      loadTasks();
    }
  }, [isExpanded]);

  // Chiudi menu quando clicchi fuori
  useEffect(() => {
    const handleClickOutside = () => setShowActionsMenu(false);
    if (showActionsMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showActionsMenu]);

  const loadTasks = async () => {
    try {
      setLoadingTasks(true);
      const response = await api.tasksAPI.getTasks({ attivita_id: activity.id });
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Errore caricamento task:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Cambio stato
  const handleStatusChange = async (newStatus) => {
    if (window.confirm(`Cambiare stato attività a "${newStatus}"?`)) {
      await onStatusChange(activity.id, newStatus);
      setShowActionsMenu(false);
    }
  };

  // Elimina attività
  const handleDelete = async () => {
    const confirm = window.confirm(
      `⚠️ ATTENZIONE!\n\nStai per eliminare l'attività "${activity.nome}" e TUTTE le task associate.\n\nQuesta operazione è IRREVERSIBILE!\n\nVuoi procedere?`
    );
    
    if (confirm) {
      await onDelete(activity.id);
      setShowActionsMenu(false);
    }
  };

  return (
    <motion.div 
      layout
      className={`bg-white rounded-xl border transition-all duration-300 relative ${
        isExpanded 
          ? 'shadow-lg border-blue-200 ring-2 ring-blue-100' 
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div 
            className="flex-1 pr-4 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 text-lg">
                {activity.nome}
              </h3>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </motion.div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {activity.progetto_nome}
              </span>
              {activity.area_nome && (
                <span className="flex items-center gap-1">
                  <Layers className="w-4 h-4" />
                  {activity.area_nome}
                </span>
              )}
            </div>
          </div>

          {/* Status Badge e Menu Azioni */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.stato)}`}>
              {activity.stato === 'completata' ? 'Completata' : 
               activity.stato === 'in_esecuzione' ? 'In Corso' : 'Pianificata'}
            </span>

            {/* Menu Azioni (solo manager) */}
            {isManager && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActionsMenu(!showActionsMenu);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showActionsMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="py-2">
                      {/* Cambio Stato */}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                        Cambia Stato
                      </div>
                      
                      {activity.stato !== 'in_esecuzione' && (
                        <button
                          onClick={() => handleStatusChange('in_esecuzione')}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
                        >
                          <PlayCircle className="w-4 h-4 text-blue-600" />
                          <span>Metti in Corso</span>
                        </button>
                      )}
                      
                      {activity.stato !== 'completata' && (
                        <button
                          onClick={() => handleStatusChange('completata')}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Segna come Completata</span>
                        </button>
                      )}
                      
                      {activity.stato !== 'pianificata' && (
                        <button
                          onClick={() => handleStatusChange('pianificata')}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Clock className="w-4 h-4 text-gray-600" />
                          <span>Riporta a Pianificata</span>
                        </button>
                      )}

                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Modifica */}
                      <button
                        onClick={() => {
                          onEdit(activity);
                          setShowActionsMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Modifica Attività</span>
                      </button>

                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Elimina */}
                      <button
                        onClick={handleDelete}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Elimina Attività</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Progresso</span>
            <span className="font-medium text-gray-900">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full ${
                progress === 100 ? 'bg-green-500' : 
                progress > 50 ? 'bg-blue-500' : 'bg-orange-500'
              }`}
            />
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500 mb-1">Ore Stimate</div>
            <div className="font-semibold text-gray-900">
              {formatMinutesToHours(oreStimate)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Ore Effettive</div>
            <div className={`font-semibold ${performanceColor}`}>
              {formatMinutesToHours(oreEffettive)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Task</div>
            <div className="font-semibold text-gray-900">
              {activity.task_completate || 0} / {activity.numero_task || 0}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Scadenza</div>
            <div className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
              {new Date(activity.scadenza).toLocaleDateString('it-IT')}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content - Task List (INVARIATO) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 overflow-hidden"
          >
            <div className="p-6 bg-gray-50">
              {loadingTasks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateTask(activity.id, activity.nome);
                    }}
                    className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Aggiungi Task
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <h5 className="text-base font-medium text-gray-900 mb-2">
                    Nessuna task in questa attività
                  </h5>
                  <p className="text-sm text-gray-600 mb-4">
                    Crea la prima task per iniziare a lavorare
                  </p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateTask(activity.id, activity.nome);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crea Prima Task
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ========================================
// TASK ITEM COMPONENT
// ========================================
const TaskItem = ({ task }) => {
  const isOverdue = new Date(task.scadenza) < new Date() && task.stato !== 'completata';
  
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`p-1.5 rounded-full flex-shrink-0 ${getStatusColor(task.stato)}`}>
          {getStatusIcon(task.stato)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h5 className="font-medium text-gray-900 truncate">{task.nome}</h5>
            {isOverdue && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium flex-shrink-0">
                <AlertCircle className="w-3 h-3" />
                Scaduta
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {task.utente_nome}
            </span>
            <span className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              {formatMinutesToHours(task.ore_stimate || 0)}
            </span>
            {task.ore_effettive > 0 && (
              <span className="flex items-center gap-1 font-medium text-blue-600">
                <Zap className="w-3 h-3" />
                {formatMinutesToHours(task.ore_effettive)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 flex-shrink-0 ml-4">
        {new Date(task.scadenza).toLocaleDateString('it-IT')}
      </div>
    </div>
  );
};

// ========================================
// CREATE ACTIVITY MODAL (dal codice precedente)
// ========================================
const CreateActivityModal = ({ isOpen, onClose, preselectedProject, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Crea Nuova Attività</h2>
              <p className="text-blue-100 text-sm mt-0.5">
                Organizza il lavoro del team per area
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto max-h-[calc(90vh-88px)]">
          <CreateActivityForm
            preselectedProject={preselectedProject}
            onSuccess={onSuccess}
            onCancel={onClose}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

// ========================================
// CREATE ACTIVITY FORM
// ========================================
const CreateActivityForm = ({ preselectedProject, onSuccess, onCancel }) => {
  // State principale
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    progetto_id: preselectedProject?.id || '',
    area_id: '',
    ore_stimate: '',
    scadenza: '',
    risorse_assegnate: []
  });

  const [errors, setErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);

  // State per dati esterni
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  
  const [aree, setAree] = useState([]);
  const [areeLoading, setAreeLoading] = useState(false);
  
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Carica progetti
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const response = await api.projectsAPI.getAll();
        setProjects(response.data.projects || []);
      } catch (error) {
        console.error('Errore caricamento progetti:', error);
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    if (!preselectedProject) {
      fetchProjects();
    }
  }, [preselectedProject]);

  // Carica aree quando progetto cambia
  useEffect(() => {
    const fetchAree = async () => {
      if (!formData.progetto_id) {
        setAree([]);
        setFormData(prev => ({ ...prev, area_id: '' }));
        return;
      }

      try {
        setAreeLoading(true);
        const response = await api.areeAPI.getAll({ progetto_id: formData.progetto_id });
        setAree(response.data.aree || []);
        
        if (response.data.aree?.length === 1) {
          setFormData(prev => ({ ...prev, area_id: response.data.aree[0].id }));
        }
      } catch (error) {
        console.error('Errore caricamento aree:', error);
        setAree([]);
      } finally {
        setAreeLoading(false);
      }
    };

    fetchAree();
  }, [formData.progetto_id]);

  // Carica utenti
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const response = await api.usersAPI.getAll();
        setUsers(response.data.users || []);
      } catch (error) {
        console.error('Errore caricamento utenti:', error);
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const availableUsers = users.filter(user => user.ruolo === 'risorsa');

  // Validazione
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome attività obbligatorio';
    }
    
    if (!formData.progetto_id) {
      newErrors.progetto_id = 'Progetto obbligatorio';
    }
    
    if (!formData.area_id) {
      newErrors.area_id = 'Area obbligatoria';
    }
    
    if (!formData.ore_stimate || parseFloat(formData.ore_stimate) <= 0) {
      newErrors.ore_stimate = 'Ore stimate devono essere maggiori di 0';
    }
    
    if (!formData.scadenza) {
      newErrors.scadenza = 'Scadenza obbligatoria';
    }
    
    if (formData.risorse_assegnate.length === 0) {
      newErrors.risorse_assegnate = 'Almeno una risorsa deve essere assegnata';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsCreating(true);
      
      const dataToSend = {
        ...formData,
        ore_stimate: Math.round(parseFloat(formData.ore_stimate) * 60)
      };
      
      const response = await api.activitiesAPI.createActivity(dataToSend);
      
      alert('✅ Attività creata con successo!');
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
    } catch (error) {
      console.error('❌ Errore creazione attività:', error);
      setErrors({ 
        submit: error.response?.data?.details || 
                error.response?.data?.error || 
                'Errore durante la creazione dell\'attività' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle risorse
  const handleUserToggle = (userId) => {
    setFormData(prev => ({
      ...prev,
      risorse_assegnate: prev.risorse_assegnate.includes(userId)
        ? prev.risorse_assegnate.filter(id => id !== userId)
        : [...prev.risorse_assegnate, userId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Progetto pre-selezionato */}
      {preselectedProject && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <div className="font-semibold text-green-900">
                Progetto: {preselectedProject.nome}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Errore submit */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 text-sm font-medium">{errors.submit}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Nome */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nome Attività *
          </label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
              errors.nome ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Es: Sviluppo Homepage"
            disabled={isCreating}
          />
          {errors.nome && <p className="text-sm text-red-600 mt-1">{errors.nome}</p>}
        </div>

        {/* Descrizione */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Descrizione
          </label>
          <textarea
            value={formData.descrizione}
            onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            placeholder="Descrizione dettagliata..."
            disabled={isCreating}
          />
        </div>

        {/* Progetto */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Progetto *
          </label>
          <select
            value={formData.progetto_id}
            onChange={(e) => setFormData({ ...formData, progetto_id: e.target.value, area_id: '' })}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
              errors.progetto_id ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={!!preselectedProject || isCreating}
          >
            <option value="">Seleziona progetto...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.nome}</option>
            ))}
          </select>
          {errors.progetto_id && <p className="text-sm text-red-600 mt-1">{errors.progetto_id}</p>}
        </div>

        {/* Area */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Area *
          </label>
          {areeLoading ? (
            <div className="w-full px-4 py-3 border rounded-xl bg-gray-50 text-gray-500">
              Caricamento...
            </div>
          ) : (
            <select
              value={formData.area_id}
              onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
                errors.area_id ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={!formData.progetto_id || isCreating}
            >
              <option value="">Seleziona area...</option>
              {aree.map((area) => (
                <option key={area.id} value={area.id}>{area.nome}</option>
              ))}
            </select>
          )}
          {errors.area_id && <p className="text-sm text-red-600 mt-1">{errors.area_id}</p>}
        </div>

        {/* Ore Stimate */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Ore Stimate *
          </label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={formData.ore_stimate}
            onChange={(e) => setFormData({ ...formData, ore_stimate: e.target.value })}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
              errors.ore_stimate ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Es: 8"
            disabled={isCreating}
          />
          {errors.ore_stimate && <p className="text-sm text-red-600 mt-1">{errors.ore_stimate}</p>}
        </div>

        {/* Scadenza */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Scadenza *
          </label>
          <input
            type="datetime-local"
            value={formData.scadenza}
            onChange={(e) => setFormData({ ...formData, scadenza: e.target.value })}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
              errors.scadenza ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isCreating}
          />
          {errors.scadenza && <p className="text-sm text-red-600 mt-1">{errors.scadenza}</p>}
        </div>
      </div>

      {/* Risorse */}
      <div className="border-t pt-6">
        <label className="block text-sm font-semibold text-gray-700 mb-4">
          Risorse Assegnate * ({formData.risorse_assegnate.length} selezionate)
        </label>
        
        {usersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 bg-gray-50 rounded-xl">
            {availableUsers.map((user) => (
              <label
                key={user.id}
                className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                  formData.risorse_assegnate.includes(user.id)
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.risorse_assegnate.includes(user.id)}
                  onChange={() => handleUserToggle(user.id)}
                  className="w-5 h-5 text-blue-600 rounded"
                  disabled={isCreating}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{user.nome}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
              </label>
            ))}
          </div>
        )}
        {errors.risorse_assegnate && <p className="text-sm text-red-600 mt-2">{errors.risorse_assegnate}</p>}
      </div>

      {/* Pulsanti */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isCreating}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={isCreating || aree.length === 0}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creazione...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Crea Attività
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// ========================================
// CREATE TASK MODAL (Semplificato)
// ========================================
const CreateTaskModal = ({ isOpen, activityId, activityName, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    ore_stimate: '',
    scadenza: '',
    priorita: 'medium'
  });
  const [errors, setErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validazione
    const newErrors = {};
    if (!formData.nome.trim()) newErrors.nome = 'Nome obbligatorio';
    if (!formData.ore_stimate || parseFloat(formData.ore_stimate) <= 0) {
      newErrors.ore_stimate = 'Ore stimate obbligatorie';
    }
    if (!formData.scadenza) newErrors.scadenza = 'Scadenza obbligatoria';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setIsCreating(true);
      
      const taskData = {
        nome: formData.nome,
        descrizione: formData.descrizione,
        attivita_id: activityId,
        utente_assegnato: user.id,
        ore_stimate: Math.round(parseFloat(formData.ore_stimate) * 60), // ore → minuti
        scadenza: formData.scadenza,
        priorita: formData.priorita
      };
      
      await api.tasksAPI.createTask(taskData);
      
      alert('✅ Task creata con successo!');
      onSuccess();
      
    } catch (error) {
      console.error('Errore creazione task:', error);
      setErrors({ submit: 'Errore durante la creazione della task' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-5 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">Crea Nuova Task</h2>
            <p className="text-orange-100 text-sm mt-0.5">Attività: {activityName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nome Task *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 ${
                errors.nome ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Es: Implementare login OAuth"
            />
            {errors.nome && <p className="text-sm text-red-600 mt-1">{errors.nome}</p>}
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descrizione
            </label>
            <textarea
              value={formData.descrizione}
              onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
              placeholder="Dettagli della task..."
            />
          </div>

          {/* Ore Stimate e Scadenza */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ore Stimate *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={formData.ore_stimate}
                onChange={(e) => setFormData({ ...formData, ore_stimate: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 ${
                  errors.ore_stimate ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Es: 2"
              />
              {errors.ore_stimate && <p className="text-sm text-red-600 mt-1">{errors.ore_stimate}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Scadenza *
              </label>
              <input
                type="datetime-local"
                value={formData.scadenza}
                onChange={(e) => setFormData({ ...formData, scadenza: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 ${
                  errors.scadenza ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.scadenza && <p className="text-sm text-red-600 mt-1">{errors.scadenza}</p>}
            </div>
          </div>

          {/* Pulsanti */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creazione...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Crea Task
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ========================================
// EDIT ACTIVITY MODAL
// ========================================
const EditActivityModal = ({ isOpen, activity, onClose, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Modifica Attività</h2>
              <p className="text-purple-100 text-sm mt-0.5">
                Aggiorna i dettagli dell'attività
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto max-h-[calc(90vh-88px)]">
          <EditActivityForm
            activity={activity}
            onSuccess={onSuccess}
            onCancel={onClose}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

// ========================================
// EDIT ACTIVITY FORM
// ========================================
const EditActivityForm = ({ activity, onSuccess, onCancel }) => {
  // State principale (pre-compilato con dati esistenti)
  const [formData, setFormData] = useState({
    nome: activity.nome || '',
    descrizione: activity.descrizione || '',
    ore_stimate: activity.ore_stimate ? (activity.ore_stimate / 60).toString() : '', // minuti → ore
    scadenza: activity.scadenza ? new Date(activity.scadenza).toISOString().slice(0, 16) : '',
    stato: activity.stato || 'pianificata'
  });

  const [errors, setErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Validazione
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome attività obbligatorio';
    }
    
    if (!formData.ore_stimate || parseFloat(formData.ore_stimate) <= 0) {
      newErrors.ore_stimate = 'Ore stimate devono essere maggiori di 0';
    }
    
    if (!formData.scadenza) {
      newErrors.scadenza = 'Scadenza obbligatoria';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsUpdating(true);
      
      const dataToSend = {
        nome: formData.nome,
        descrizione: formData.descrizione,
        ore_stimate: Math.round(parseFloat(formData.ore_stimate) * 60), // ore → minuti
        scadenza: formData.scadenza,
        stato: formData.stato
      };
      
      await api.activitiesAPI.updateActivity(activity.id, dataToSend);
      
      alert('✅ Attività aggiornata con successo!');
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('❌ Errore aggiornamento attività:', error);
      setErrors({ 
        submit: error.response?.data?.details || 
                error.response?.data?.error || 
                'Errore durante l\'aggiornamento dell\'attività' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Info Progetto/Area (READ ONLY) */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="text-sm text-blue-900">
          <div className="font-semibold mb-1">📂 Progetto: {activity.progetto_nome}</div>
          {activity.area_nome && (
            <div className="text-blue-700">📁 Area: {activity.area_nome}</div>
          )}
        </div>
      </div>

      {/* Errore submit */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 text-sm font-medium">{errors.submit}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Nome */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nome Attività *
          </label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${
              errors.nome ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Es: Sviluppo Homepage"
            disabled={isUpdating}
          />
          {errors.nome && <p className="text-sm text-red-600 mt-1">{errors.nome}</p>}
        </div>

        {/* Descrizione */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Descrizione
          </label>
          <textarea
            value={formData.descrizione}
            onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
            placeholder="Descrizione dettagliata..."
            disabled={isUpdating}
          />
        </div>

        {/* Ore Stimate */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Ore Stimate *
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={formData.ore_stimate}
              onChange={(e) => setFormData({ ...formData, ore_stimate: e.target.value })}
              className={`w-full px-4 py-3 pr-16 border rounded-xl focus:ring-2 focus:ring-purple-500 ${
                errors.ore_stimate ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Es: 8"
              disabled={isUpdating}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
              ore
            </span>
          </div>
          {errors.ore_stimate && <p className="text-sm text-red-600 mt-1">{errors.ore_stimate}</p>}
        </div>

        {/* Scadenza */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Scadenza *
          </label>
          <input
            type="datetime-local"
            value={formData.scadenza}
            onChange={(e) => setFormData({ ...formData, scadenza: e.target.value })}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${
              errors.scadenza ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isUpdating}
          />
          {errors.scadenza && <p className="text-sm text-red-600 mt-1">{errors.scadenza}</p>}
        </div>

        {/* Stato */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Stato Attività
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, stato: 'pianificata' })}
              className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                formData.stato === 'pianificata'
                  ? 'border-gray-500 bg-gray-50 text-gray-900'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
              disabled={isUpdating}
            >
              📋 Pianificata
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, stato: 'in_esecuzione' })}
              className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                formData.stato === 'in_esecuzione'
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
              disabled={isUpdating}
            >
              ▶️ In Corso
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, stato: 'completata' })}
              className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                formData.stato === 'completata'
                  ? 'border-green-500 bg-green-50 text-green-900'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
              disabled={isUpdating}
            >
              ✅ Completata
            </button>
          </div>
        </div>
      </div>

      {/* Info Risorse (READ ONLY) */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="text-sm text-gray-600">
          <div className="font-semibold text-gray-900 mb-2">👥 Risorse Assegnate</div>
          <div className="text-xs text-gray-500">
            Le risorse possono essere gestite solo dalla creazione. 
            Per modificare le risorse, elimina e ricrea l'attività.
          </div>
        </div>
      </div>

      {/* Pulsanti */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isUpdating}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={isUpdating}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 shadow-lg font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Aggiornamento...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Salva Modifiche
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ActivitiesPage;