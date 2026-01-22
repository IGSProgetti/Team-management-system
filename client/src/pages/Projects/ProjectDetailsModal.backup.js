import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Users, DollarSign, TrendingUp, BarChart3, 
  ChevronDown, ChevronRight, Clock, User, AlertTriangle, 
  CheckCircle, Circle, PlayCircle, Plus, ExternalLink,
  Activity, Target, Zap
} from 'lucide-react';

// Helper functions (stesso del file progetti)
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
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusColor = (stato) => {
  switch (stato) {
    case 'completata': return 'bg-green-100 text-green-800 border-green-200';
    case 'in_esecuzione': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pianificata':
    case 'programmata': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (stato) => {
  switch (stato) {
    case 'completata': return <CheckCircle className="w-3 h-3" />;
    case 'in_esecuzione': return <PlayCircle className="w-3 h-3" />;
    case 'pianificata':
    case 'programmata': return <Circle className="w-3 h-3" />;
    default: return <Circle className="w-3 h-3" />;
  }
};

// Componente Task Card Compatta per il Modal
const TaskCardCompact = ({ task, onClick }) => {
  const isOverdue = new Date(task.scadenza) < new Date() && task.stato !== 'completata';
  const performance = task.ore_effettive && task.ore_stimate ? 
    ((task.ore_effettive - task.ore_stimate) / task.ore_stimate) * 100 : null;

  return (
    <div 
      onClick={() => onClick(task)}
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
    >
      <div className="flex items-center gap-3 flex-1">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.stato)}`}>
          {getStatusIcon(task.stato)}
        </span>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate text-sm group-hover:text-blue-600">
            {task.nome}
          </div>
          <div className="text-xs text-gray-500">
            {task.utente_nome} • {formatDate(task.scadenza)}
            {isOverdue && <span className="text-red-600 ml-1">⚠️ Scaduto</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-xs text-gray-600">
          {task.stato === 'completata' && task.ore_effettive ? (
            <span className={performance && performance > 10 ? 'text-red-600' : performance && performance < -10 ? 'text-green-600' : ''}>
              {formatHours(task.ore_effettive)}
            </span>
          ) : (
            <span>{formatHours(task.ore_stimate || 0)}</span>
          )}
        </div>
        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-blue-500" />
      </div>
    </div>
  );
};

// Componente Attività Card per il Modal
const ActivityCardModal = ({ activity, onActivityClick, onTaskClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const progress = activity.numero_task > 0 ? Math.round((activity.task_completate / activity.numero_task) * 100) : 0;
  const isOverdue = new Date(activity.scadenza) < new Date() && activity.stato !== 'completata';

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Header attività */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronRight className="w-4 h-4" />
              }
            </button>
            
            <div 
              onClick={() => onActivityClick(activity)}
              className="flex-1 cursor-pointer group"
            >
              <div className="font-medium text-gray-900 group-hover:text-blue-600 flex items-center">
                {activity.nome}
                <ExternalLink className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-sm text-gray-500">
                {activity.numero_task || 0} task • Scadenza: {formatDate(activity.scadenza)}
                {isOverdue && <span className="text-red-600 ml-2">⚠️ Scaduto</span>}
              </div>
            </div>
          </div>
          
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(activity.stato)}`}>
            {getStatusIcon(activity.stato)}
            {activity.stato === 'completata' ? 'Completata' : 
             activity.stato === 'in_esecuzione' ? 'In Corso' : 'Pianificata'}
          </span>
        </div>

        {/* Progress Bar */}
        {activity.numero_task > 0 && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">Progresso Task</span>
              <span className="text-xs text-gray-500">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  progress === 100 ? 'bg-green-500' : 
                  progress > 50 ? 'bg-blue-500' : 'bg-blue-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Metriche ore */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-xs text-gray-600 flex items-center justify-center">
              <Zap className="w-3 h-3 mr-1" />
              Preventivate
            </div>
            <div className="font-semibold text-sm">{formatHours(activity.ore_stimate || 0)}</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-xs text-gray-600 flex items-center justify-center">
              <Target className="w-3 h-3 mr-1" />
              Effettive
            </div>
            <div className="font-semibold text-sm">{formatHours(activity.ore_effettive || 0)}</div>
          </div>
        </div>
      </div>

      {/* Task List (se espansa) */}
      {isExpanded && activity.tasks && activity.tasks.length > 0 && (
        <div className="border-t border-gray-100 p-4">
          <div className="space-y-2">
            {activity.tasks.map((task) => (
              <TaskCardCompact 
                key={task.id} 
                task={task} 
                onClick={onTaskClick}
              />
            ))}
          </div>
        </div>
      )}

      {isExpanded && (!activity.tasks || activity.tasks.length === 0) && (
        <div className="border-t border-gray-100 p-4">
          <div className="text-center text-gray-500 text-sm">
            <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>Nessuna task in questa attività</p>
            <p className="text-xs mt-1">Le task verranno mostrate quando disponibili</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente Modal Principale
const ProjectDetailsModal = ({ project, isOpen, onClose, onCreateActivity }) => {
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  // Carica dettagli progetto con attività e task
  useEffect(() => {
    if (isOpen && project) {
      fetchProjectDetails();
    }
  }, [isOpen, project]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      
      // Ottieni il token
      const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
      const token = authData.state?.token;

      if (!token) {
        console.error('Token non trovato');
        return;
      }

      // Fetch attività del progetto
      const activitiesResponse = await fetch(`/api/activities?progetto_id=${project.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!activitiesResponse.ok) {
        throw new Error('Errore caricamento attività');
      }

      const activitiesData = await activitiesResponse.json();
      
      // Per ogni attività, carica le sue task
      const activitiesWithTasks = await Promise.all(
        activitiesData.activities.map(async (activity) => {
          try {
            const tasksResponse = await fetch(`/api/tasks?attivita_id=${activity.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (tasksResponse.ok) {
              const tasksData = await tasksResponse.json();
              return { ...activity, tasks: tasksData.tasks || [] };
            } else {
              return { ...activity, tasks: [] };
            }
          } catch (error) {
            console.error(`Errore caricamento task per attività ${activity.id}:`, error);
            return { ...activity, tasks: [] };
          }
        })
      );

      setProjectDetails({
        ...project,
        activities: activitiesWithTasks
      });

    } catch (error) {
      console.error('Errore caricamento dettagli progetto:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityClick = (activity) => {
    // Salva attività selezionata e naviga
    localStorage.setItem('selected_activity', JSON.stringify({
      id: activity.id,
      nome: activity.nome
    }));
    window.location.href = '/activities';
  };

  const handleTaskClick = (task) => {
    // Salva task selezionata e naviga
    localStorage.setItem('selected_task', JSON.stringify({
      id: task.id,
      nome: task.nome,
      attivita_id: task.attivita_id
    }));
    window.location.href = '/tasks';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{project.nome}</h2>
            <p className="text-sm text-gray-500">{project.cliente_nome}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress e Metriche */}
        <div className="p-6 border-b border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Progress */}
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Progresso Progetto</span>
                <span className="text-sm text-gray-500">{project.progresso_completamento}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    project.progresso_completamento >= 100 ? 'bg-green-500' :
                    project.progresso_completamento >= 75 ? 'bg-blue-500' :
                    project.progresso_completamento >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${project.progresso_completamento}%` }}
                />
              </div>
            </div>

            {/* Budget */}
            <div className="text-center">
              <div className="text-sm text-gray-600">Budget</div>
              <div className="font-semibold text-gray-900">{formatCurrency(project.budget_assegnato)}</div>
              <div className="text-xs text-gray-500">Speso: {formatCurrency(project.costo_sostenuto)}</div>
            </div>

            {/* Attività */}
            <div className="text-center">
              <div className="text-sm text-gray-600">Attività</div>
              <div className="font-semibold text-gray-900">{project.numero_attivita}</div>
              <div className="text-xs text-gray-500">{project.attivita_completate} completate</div>
            </div>
          </div>
        </div>

        {/* Contenuto Scrollabile */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-600">Caricamento dettagli...</span>
            </div>
          ) : projectDetails && projectDetails.activities ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attività del Progetto ({projectDetails.activities.length})
                </h3>
                <button
                  onClick={() => onCreateActivity(project.id, project.nome)}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nuova Attività
                </button>
              </div>

              {projectDetails.activities.length > 0 ? (
                <div className="space-y-4">
                  {projectDetails.activities.map((activity) => (
                    <ActivityCardModal
                      key={activity.id}
                      activity={activity}
                      onActivityClick={handleActivityClick}
                      onTaskClick={handleTaskClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna attività</h3>
                  <p className="text-gray-500 mb-4">
                    Inizia creando la prima attività per questo progetto
                  </p>
                  <button
                    onClick={() => onCreateActivity(project.id, project.nome)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crea Prima Attività
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertTriangle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Errore caricamento</h3>
                <p className="text-gray-500">Non è stato possibile caricare i dettagli del progetto</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Click su attività o task per aprire la pagina dedicata
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Chiudi
            </button>
            <button
              onClick={() => onCreateActivity(project.id, project.nome)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nuova Attività
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsModal;