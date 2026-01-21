import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Users, DollarSign, TrendingUp, BarChart3, 
  ChevronDown, ChevronRight, Clock, User, AlertTriangle, 
  CheckCircle, Circle, PlayCircle, Plus, ExternalLink,
  Activity, Target, Zap, Layers, CheckCircle2, AlertCircle
} from 'lucide-react';
import api from '../../utils/api';

// Componente per Task Item
const TaskItem = ({ task, onClick }) => {
  const getStatusIcon = () => {
    switch (task.stato) {
      case 'completata':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_esecuzione':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    const badges = {
      completata: 'bg-green-100 text-green-800',
      in_esecuzione: 'bg-blue-100 text-blue-800',
      programmata: 'bg-gray-100 text-gray-800'
    };
    return badges[task.stato] || badges.programmata;
  };

  return (
    <div
      onClick={() => onClick(task)}
      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2 flex-1">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <h5 className="font-medium text-gray-900 text-sm truncate">
              {task.nome}
            </h5>
            {task.descrizione && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {task.descrizione}
              </p>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${getStatusBadge()}`}>
          {task.stato?.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          {task.ore_stimate && (
            <span className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {task.ore_stimate}h stimate
            </span>
          )}
          {task.ore_effettive && (
            <span className="flex items-center text-blue-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {task.ore_effettive}h effettive
            </span>
          )}
        </div>
        {task.scadenza && (
          <span className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(task.scadenza).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>
    </div>
  );
};

// Componente per Activity Card
const ActivityCard = ({ activity, onActivityClick, onTaskClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = () => {
    switch (activity.stato) {
      case 'completata':
        return 'border-green-500 bg-green-50';
      case 'in_esecuzione':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getProgressPercentage = () => {
    if (!activity.tasks || activity.tasks.length === 0) return 0;
    const completed = activity.tasks.filter(t => t.stato === 'completata').length;
    return Math.round((completed / activity.tasks.length) * 100);
  };

  return (
    <div className={`border-2 rounded-lg overflow-hidden ${getStatusColor()}`}>
      {/* Header Activity */}
      <div
        className="p-4 cursor-pointer hover:bg-opacity-80 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-gray-600" />
              <h4 className="font-semibold text-gray-900">{activity.nome}</h4>
            </div>
            {activity.descrizione && (
              <p className="text-sm text-gray-600 mt-2">{activity.descrizione}</p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onActivityClick(activity);
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Apri →
          </button>
        </div>

        {/* Metriche Activity */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-xs text-gray-500">Stato</p>
            <p className="font-medium text-sm capitalize">
              {activity.stato?.replace('_', ' ')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Task</p>
            <p className="font-medium text-sm">
              {activity.tasks?.length || 0} task
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ore Stimate</p>
            <p className="font-medium text-sm">{activity.ore_stimate || 0}h</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ore Effettive</p>
            <p className="font-medium text-sm text-blue-600">
              {activity.ore_effettive || 0}h
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {activity.tasks && activity.tasks.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">Progresso</span>
              <span className="text-xs font-medium text-gray-900">
                {getProgressPercentage()}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}

        {/* Scadenza */}
        {activity.scadenza && (
          <div className="flex items-center mt-3 text-sm">
            <Calendar className="w-4 h-4 text-gray-500 mr-2" />
            <span className="text-gray-600">
              Scadenza: {new Date(activity.scadenza).toLocaleDateString('it-IT')}
            </span>
          </div>
        )}
      </div>

      {/* Lista Task (quando espansa) */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white p-4">
          <h5 className="font-medium text-gray-700 mb-3 flex items-center">
            <Target className="w-4 h-4 mr-2" />
            Task dell'Attività ({activity.tasks?.length || 0})
          </h5>
          
          {activity.tasks && activity.tasks.length > 0 ? (
            <div className="space-y-2">
              {activity.tasks.map(task => (
                <TaskItem key={task.id} task={task} onClick={onTaskClick} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg py-8 px-4">
              <div className="text-center text-gray-500 text-sm">
                <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Nessuna task in questa attività</p>
                <p className="text-xs mt-1">Le task verranno mostrate quando disponibili</p>
              </div>
            </div>
          )}
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

      // ✅ USA api.js per fetch attività
      const activitiesResponse = await api.get(`/activities?progetto_id=${project.id}`);
      const activitiesData = activitiesResponse.data;
      
      // Per ogni attività, carica le sue task
      const activitiesWithTasks = await Promise.all(
        activitiesData.activities.map(async (activity) => {
          try {
            // ✅ USA api.js per fetch task
            const tasksResponse = await api.get(`/tasks?attivita_id=${activity.id}`);
            
            return { 
              ...activity, 
              tasks: tasksResponse.data.tasks || [] 
            };
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{project?.nome}</h2>
            {project?.descrizione && (
              <p className="text-gray-600 mt-2">{project.descrizione}</p>
            )}
            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                Cliente: {project?.cliente_nome}
              </span>
              {project?.data_inizio && (
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(project.data_inizio).toLocaleDateString('it-IT')}
                  {project.data_fine && ` - ${new Date(project.data_fine).toLocaleDateString('it-IT')}`}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body - Scrollable */}
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
                  {projectDetails.activities.map(activity => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      onActivityClick={handleActivityClick}
                      onTaskClick={handleTaskClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-12 text-center">
                  <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nessuna Attività
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Non ci sono ancora attività in questo progetto
                  </p>
                  <button
                    onClick={() => onCreateActivity(project.id, project.nome)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Crea Prima Attività
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              Nessun dato disponibile
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsModal;