import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../../utils/api';
import { 
  X, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Target,
  User,
  Building,
  Activity,
  Eye,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

const TaskDetailsModal = ({ resource, isOpen, onClose, selectedPeriod }) => {
  const [taskDetails, setTaskDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  // Fetch task details from API
  const fetchTaskDetails = async () => {
  if (!resource || !isOpen) return;

  try {
    setLoading(true);
    setError(null);
    
    const params = {};
    if (selectedPeriod) params.periodo = selectedPeriod;
    
    const response = await api.budgetAPI.getTaskDetails(resource.risorsa_id, params);
    console.log('API Response:', response.data);
    setTaskDetails(response.data);
  } catch (error) {
    console.error('Error fetching task details:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (isOpen) {
      fetchTaskDetails();
    }
  }, [isOpen, resource, selectedPeriod]);

  // Format time from minutes to hours
  const formatTime = (minutes) => {
    if (!minutes) return '0min';
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount || 0));
  };

  // Get task status
  const getTaskStatus = (task) => {
    if (!task) return { color: 'text-gray-600', bg: 'bg-gray-100', icon: Target, label: 'N/A' };
    
    if (task.task_stato === 'completata') {
      const oreEffettive = task.ore_effettive || 0;
      const oreStimate = task.ore_stimate || 0;
      
      if (task.status_task === 'ECCEDENZA') {
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          icon: AlertTriangle,
          label: 'Eccedenza'
        };
      } else if (task.status_task === 'RISPARMIO') {
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          icon: TrendingDown,
          label: 'Risparmio'
        };
      } else {
        return {
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          icon: Target,
          label: 'In Target'
        };
      }
    }
    
    return {
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      icon: CheckCircle,
      label: task.task_stato === 'in_esecuzione' ? 'In Corso' : 'Programmata'
    };
  };

  // Convert tasks_by_project object to array format
  const getTasksByProject = () => {
    if (!taskDetails || !taskDetails.tasks_by_project) return [];
    
    const projectsObj = taskDetails.tasks_by_project;
    return Object.keys(projectsObj).map(projectKey => {
      const projectData = projectsObj[projectKey];
      return {
        key: projectKey,
        cliente_nome: projectData.cliente_nome,
        progetto_nome: projectData.progetto_nome,
        tasks: projectData.tasks || [],
        totale_risparmio_minuti: projectData.totale_risparmio_minuti || 0,
        totale_eccedenza_minuti: projectData.totale_eccedenza_minuti || 0
      };
    });
  };

  const getSummary = () => {
    return taskDetails?.summary || {};
  };

  const getTotalTasks = () => {
    return getSummary().total_tasks || 0;
  };

  const getCompletedTasks = () => {
    return getSummary().completed_tasks || 0;
  };

  const getTotalMinutes = () => {
    const projects = getTasksByProject();
    return projects.reduce((acc, project) => {
      return acc + project.tasks.reduce((taskAcc, task) => {
        return taskAcc + (task.ore_effettive || 0);
      }, 0);
    }, 0);
  };

  const getAvailableMinutes = () => {
    return getSummary().ore_riassegnabili_minuti || 0;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header - SEMPRE VISIBILE */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                {resource?.risorsa_nome?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {resource?.risorsa_nome}
                </h3>
                <p className="text-blue-600 font-medium">
                  Dettaglio Task per Periodo: {selectedPeriod}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Content - SCROLLABILE */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-gray-600">Caricamento dettagli...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Errore nel Caricamento</h4>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={fetchTaskDetails}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                  >
                    Riprova
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Task Totali</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">
                      {getTotalTasks()}
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Completate</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">
                      {getCompletedTasks()}
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">Ore Lavorate</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatTime(getTotalMinutes())}
                    </p>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-700">Ore Riassegnabili</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-900">
                      {formatTime(getAvailableMinutes())}
                    </p>
                  </div>
                </div>

                {/* Projects and Tasks */}
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-600" />
                    Task per Progetto ({getTasksByProject().length} progetti)
                  </h4>

                  {getTasksByProject().length === 0 ? (
                    <div className="text-center py-12">
                      <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h5 className="text-lg font-medium text-gray-600 mb-2">Nessuna Task Trovata</h5>
                      <p className="text-gray-500">Non ci sono task per questa risorsa nel periodo selezionato.</p>
                    </div>
                  ) : (
                    getTasksByProject().map((project, projectIndex) => (
                      <motion.div
                        key={project.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: projectIndex * 0.1 }}
                        className="border border-gray-200 rounded-xl overflow-hidden"
                      >
                        {/* Project Header */}
                        <div 
                          className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => setSelectedProject(
                            selectedProject === project.key ? null : project.key
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                <Building className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h5 className="font-semibold text-gray-900">
                                  {project.progetto_nome}
                                </h5>
                                <p className="text-sm text-gray-600">
                                  Cliente: {project.cliente_nome}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <p className="text-sm text-gray-500">Task</p>
                                <p className="font-semibold text-gray-900">
                                  {project.tasks.length}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-gray-500">Ore Totali</p>
                                <p className="font-semibold text-gray-900">
                                  {formatTime(project.tasks.reduce((acc, task) => 
                                    acc + (task.ore_effettive || 0), 0))}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-gray-500">Risparmio</p>
                                <p className="font-semibold text-green-600">
                                  {formatTime(project.totale_risparmio_minuti)}
                                </p>
                              </div>
                              <ArrowRight 
                                className={`w-5 h-5 text-gray-400 transition-transform ${
                                  selectedProject === project.key ? 'rotate-90' : ''
                                }`} 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Tasks List - CON SCROLLBAR SEPARATA SE NECESSARIO */}
                        <AnimatePresence>
                          {selectedProject === project.key && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-white"
                            >
                              <div className={`p-4 space-y-3 ${
                                project.tasks.length > 3 ? 'max-h-80 overflow-y-auto' : ''
                              }`}>
                                {project.tasks.length > 0 ? (
                                  project.tasks.map((task, taskIndex) => {
                                    const status = getTaskStatus(task);
                                    const StatusIcon = status.icon;
                                    
                                    return (
                                      <motion.div
                                        key={task.task_id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: taskIndex * 0.05 }}
                                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                              <h6 className="font-medium text-gray-900">
                                                {task.task_nome}
                                              </h6>
                                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                                                <StatusIcon size={12} />
                                                {status.label}
                                              </div>
                                            </div>
                                            
                                            {task.task_descrizione && (
                                              <p className="text-sm text-gray-600 mb-3">
                                                {task.task_descrizione}
                                              </p>
                                            )}

                                            <div className="flex items-center gap-6 text-sm text-gray-500">
                                              <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {task.scadenza ? 
                                                  new Date(task.scadenza).toLocaleDateString('it-IT', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                  }) : 'Nessuna scadenza'
                                                }
                                              </div>
                                              
                                              {task.attivita_nome && (
                                                <div className="flex items-center gap-1">
                                                  <Activity className="w-4 h-4" />
                                                  {task.attivita_nome}
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {/* Task Stats */}
                                          <div className="flex flex-col gap-2 ml-4">
                                            <div className="text-right">
                                              <p className="text-xs text-gray-500">Stimate</p>
                                              <p className="font-medium text-gray-700">
                                                {formatTime(task.ore_stimate)}
                                              </p>
                                            </div>
                                            
                                            {task.ore_effettive && (
                                              <div className="text-right">
                                                <p className="text-xs text-gray-500">Effettive</p>
                                                <p className={`font-medium ${
                                                  task.status_task === 'ECCEDENZA' ? 'text-yellow-600' :
                                                  task.status_task === 'RISPARMIO' ? 'text-green-600' :
                                                  'text-blue-600'
                                                }`}>
                                                  {formatTime(task.ore_effettive)}
                                                </p>
                                              </div>
                                            )}

                                            {task.differenza_minuti !== undefined && (
                                              <div className="text-right">
                                                <p className="text-xs text-gray-500">Differenza</p>
                                                <p className={`font-medium ${
                                                  task.differenza_minuti > 0 ? 'text-yellow-600' :
                                                  task.differenza_minuti < 0 ? 'text-green-600' :
                                                  'text-blue-600'
                                                }`}>
                                                  {task.differenza_minuti > 0 ? '+' : ''}
                                                  {formatTime(task.differenza_minuti)}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </motion.div>
                                    );
                                  })
                                ) : (
                                  <div className="text-center py-8">
                                    <p className="text-gray-500">Nessuna task trovata per questo progetto.</p>
                                  </div>
                                )}
                              </div>
                              
                              {/* Indicatore scroll se molte task */}
                              {project.tasks.length > 3 && (
                                <div className="text-center py-2 border-t border-gray-100">
                                  <p className="text-xs text-gray-400">
                                    ↕️ Scorri per vedere tutte le {project.tasks.length} task
                                  </p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer - SEMPRE VISIBILE E IN FONDO */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
            <div className="text-sm text-gray-500">
              💡 Espandi i progetti per vedere i dettagli delle task
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TaskDetailsModal;