import React, { useState } from 'react';
import { 
  Plus, Calendar, Clock, Users, BarChart3, Filter, Search,
  AlertTriangle, CheckCircle, Circle, PlayCircle, ChevronDown,
  ChevronUp, User, Timer, Target, Calculator, Zap
} from 'lucide-react';
import { useAuth } from '../../hooks';
import { useActivities, useProjects, useTasks } from '../../hooks';
import { useUsers } from '../../hooks';

// Helper functions
const formatMinutesToHours = (minutes) => {
  if (!minutes) return '0h';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const calculateProgress = (activity) => {
  if (!activity.numero_task || activity.numero_task === 0) return 0;
  return Math.round((activity.task_completate / activity.numero_task) * 100);
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
    case 'completata': return <CheckCircle className="w-4 h-4" />;
    case 'in_esecuzione': return <PlayCircle className="w-4 h-4" />;
    case 'pianificata':
    case 'programmata': return <Circle className="w-4 h-4" />;
    default: return <Circle className="w-4 h-4" />;
  }
};

// TaskCard con indicatori aggiornati
const TaskCard = ({ task, onStatusChange }) => {
  const isOverdue = new Date(task.scadenza) < new Date() && task.stato !== 'completata';
  const performance = task.ore_effettive && task.ore_stimate ? 
    ((task.ore_effettive - task.ore_stimate) / task.ore_stimate) * 100 : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 
                    transition-all duration-200 hover:shadow-sm p-5">
      
      {/* Header task */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-4">
          <h4 className="font-medium text-gray-900 text-base leading-tight mb-1">
            {task.nome}
          </h4>
          {task.descrizione && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {task.descrizione}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(task.stato)}`}>
            {getStatusIcon(task.stato)}
            {task.stato === 'completata' ? 'Completata' : 
             task.stato === 'in_esecuzione' ? 'In Corso' : 'Da Fare'}
          </span>
          
          {isOverdue && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
        </div>
      </div>

      {/* Info task */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 px-4 bg-gray-50 rounded-lg">
        <div className="flex items-center text-sm text-gray-700">
          <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full mr-3 flex-shrink-0">
            <User className="w-3 h-3 text-blue-600" />
          </div>
          <span className="truncate font-medium">
            {task.utente_nome || 'Non assegnato'}
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-700">
          <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded-full mr-3 flex-shrink-0">
            <Timer className="w-3 h-3 text-green-600" />
          </div>
          {task.stato === 'completata' && task.ore_effettive ? (
            <div className="flex flex-col">
              <span className={`font-medium ${performance && performance > 10 ? 'text-red-600' : 
                             performance && performance < -10 ? 'text-green-600' : 'text-gray-700'}`}>
                {formatMinutesToHours(task.ore_effettive)}
              </span>
              <span className="text-xs text-gray-500">
                prev: {formatMinutesToHours(task.ore_stimate || 0)}
              </span>
            </div>
          ) : (
            <span className="font-medium">
              {formatMinutesToHours(task.ore_stimate || 0)}
            </span>
          )}
        </div>

        <div className="flex items-center text-sm text-gray-700">
          <div className="flex items-center justify-center w-6 h-6 bg-orange-100 rounded-full mr-3 flex-shrink-0">
            <Calendar className="w-3 h-3 text-orange-600" />
          </div>
          <span className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
            {new Date(task.scadenza).toLocaleDateString('it-IT', { 
              day: '2-digit', 
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </div>

      {/* Performance indicator */}
      {task.stato === 'completata' && performance !== null && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Performance vs preventivo:</span>
            <span className={`font-medium ${
              performance > 10 ? 'text-red-600' : 
              performance < -10 ? 'text-green-600' : 'text-gray-700'
            }`}>
              {performance > 0 ? '+' : ''}{Math.round(performance)}%
              {performance > 10 && ' (sforato)'}
              {performance < -10 && ' (efficiente)'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const TasksList = ({ activityId, isExpanded }) => {
  const { tasks, isLoading } = useTasks({ attivita_id: activityId });

  if (!isExpanded) return null;

  if (isLoading) {
    return (
      <div className="mt-6 mx-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-8">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-600">Caricamento task...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-6 mb-6 mt-4">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h4 className="text-base font-semibold text-gray-800">
            Task dell'Attività
          </h4>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {tasks.length} task
          </span>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">
          + Aggiungi Task
        </button>
      </div>

      {tasks.length > 0 ? (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-blue-600 font-medium">Tot. Preventivato</div>
                <div className="text-lg font-bold text-blue-800">
                  {formatMinutesToHours(tasks.reduce((sum, task) => sum + (task.ore_stimate || 0), 0))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-blue-600 font-medium">Tot. Effettivo</div>
                <div className="text-lg font-bold text-blue-800">
                  {formatMinutesToHours(tasks.reduce((sum, task) => sum + (task.ore_effettive || 0), 0))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8">
          <div className="text-center">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h5 className="text-base font-medium text-gray-900 mb-2">
              Nessuna task in questa attività
            </h5>
            <p className="text-sm text-gray-600 mb-4">
              Le ore preventivate dell'attività saranno calcolate automaticamente dalle task che aggiungerai
            </p>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              Crea Prima Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 🆕 ActivityCard AGGIORNATA con tempi automatici
const ActivityCard = ({ activity }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const progress = calculateProgress(activity);
  const isOverdue = new Date(activity.scadenza) < new Date() && activity.stato !== 'completata';
  
  const oreStimate = activity.ore_stimate || 0;
  const oreEffettive = activity.ore_effettive || 0;
  const performanceColor = oreEffettive > oreStimate ? 'text-red-600' : 
                          oreEffettive < oreStimate ? 'text-green-600' : 'text-gray-600';

  return (
    <div className={`bg-white rounded-xl border border-gray-200 transition-all duration-300 ${
      isExpanded 
        ? 'shadow-lg border-blue-200 ring-1 ring-blue-100' 
        : 'hover:border-blue-300 hover:shadow-lg'
    }`}>
      
      <div 
        className="p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                {activity.nome}
              </h3>
              <div className={`text-gray-400 transition-all duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {activity.progetto_nome} • {activity.cliente_nome}
            </p>
          </div>
          
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(activity.stato)}`}>
            {getStatusIcon(activity.stato)}
            {activity.stato === 'completata' ? 'Completata' : 
             activity.stato === 'in_esecuzione' ? 'In Corso' : 'Pianificata'}
          </span>
        </div>

        {activity.numero_task > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progresso Task
              </span>
              <span className="text-sm text-gray-500">
                {activity.task_completate}/{activity.numero_task} ({progress}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  progress === 100 ? 'bg-green-500' : 
                  progress > 50 ? 'bg-blue-500' : 'bg-blue-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {activity.descrizione && (
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            {activity.descrizione}
          </p>
        )}

        {/* 🆕 Ore AUTOMATICHE con indicatori speciali */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Calculator className="w-4 h-4 text-gray-600 mr-1" />
              <div className="text-sm text-gray-600">Preventivate</div>
              <span className="ml-1 text-xs text-blue-600 font-medium">(auto)</span>
            </div>
            <div className="font-semibold text-gray-900 text-lg">
              {formatMinutesToHours(oreStimate)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Somma task: {activity.numero_task || 0}
            </div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Zap className="w-4 h-4 text-blue-600 mr-1" />
              <div className="text-sm text-gray-600">Effettive</div>
              <span className="ml-1 text-xs text-blue-600 font-medium">(auto)</span>
            </div>
            <div className={`font-semibold text-lg ${performanceColor}`}>
              {formatMinutesToHours(oreEffettive)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Task completate: {activity.task_completate || 0}
            </div>
          </div>
        </div>

        {/* Performance indicator */}
        {oreEffettive > 0 && oreStimate > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-yellow-800 font-medium">Performance Attività:</span>
              <span className={`font-bold ${performanceColor}`}>
                {oreEffettive > oreStimate ? '+' : ''}{Math.round(((oreEffettive - oreStimate) / oreStimate) * 100)}%
                {oreEffettive > oreStimate && ' sforato'}
                {oreEffettive < oreStimate && ' efficiente'}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-2" />
            {isOverdue ? (
              <span className="text-red-600 font-medium">
                Scaduto il {new Date(activity.scadenza).toLocaleDateString('it-IT')}
              </span>
            ) : (
              <span>
                {new Date(activity.scadenza).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
            {isOverdue && <AlertTriangle className="w-4 h-4 ml-2 text-red-500" />}
          </div>

          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2 text-gray-400" />
            <span className="text-sm text-gray-500">
              {activity.numero_risorse || 0} risorse
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100">
          <TasksList 
            activityId={activity.id}
            isExpanded={isExpanded}
          />
        </div>
      )}
    </div>
  );
};

const ActivityFilters = ({ filters, setFilters, projects }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={filters.progetto_id || ''}
          onChange={(e) => setFilters({ ...filters, progetto_id: e.target.value || undefined })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Tutti i progetti</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.nome}
            </option>
          ))}
        </select>

        <select
          value={filters.stato || ''}
          onChange={(e) => setFilters({ ...filters, stato: e.target.value || undefined })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Tutti gli stati</option>
          <option value="pianificata">Pianificate</option>
          <option value="in_esecuzione">In Corso</option>
          <option value="completata">Completate</option>
        </select>

        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca attività..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

// 📋 CreateActivityForm Component
const CreateActivityForm = ({ projects, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    progetto_id: '',
    scadenza: '',
    risorse_assegnate: []
  });
  const [errors, setErrors] = useState({});
  
  const { users, isLoading: usersLoading } = useUsers();
  const { createActivity, isCreating } = useActivities();
  
  // Filtra utenti in base al progetto selezionato (per ora mostra tutti)
  const availableUsers = users.filter(user => user.ruolo === 'risorsa');
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome attività obbligatorio';
    } else if (formData.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve essere almeno 2 caratteri';
    }
    
    if (!formData.progetto_id) {
      newErrors.progetto_id = 'Progetto obbligatorio';
    }
    
    if (!formData.scadenza) {
      newErrors.scadenza = 'Scadenza obbligatoria';
    } else if (new Date(formData.scadenza) <= new Date()) {
      newErrors.scadenza = 'Scadenza deve essere futura';
    }
    
    if (formData.risorse_assegnate.length === 0) {
      newErrors.risorse_assegnate = 'Almeno una risorsa deve essere assegnata';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    createActivity(formData, {
      onSuccess: () => {
        onSuccess();
      },
      onError: (error) => {
        console.error('Errore creazione attività:', error);
      }
    });
  };
  
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
      {/* Info Box Tempi Automatici */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Calculator className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-blue-900 mb-1">✨ Tempi Automatici</div>
            <div className="text-blue-700">
              Le ore preventivate saranno calcolate automaticamente dalla somma delle task che creerai. 
              Non serve inserire ore stimate per l'attività.
            </div>
          </div>
        </div>
      </div>

      {/* Nome Attività */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nome Attività *
        </label>
        <input
          type="text"
          value={formData.nome}
          onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.nome ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Es: Sviluppo Login Component"
        />
        {errors.nome && <p className="mt-1 text-sm text-red-600">{errors.nome}</p>}
      </div>

      {/* Progetto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Progetto *
        </label>
        <select
          value={formData.progetto_id}
          onChange={(e) => setFormData(prev => ({ ...prev, progetto_id: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.progetto_id ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">Seleziona progetto...</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.nome} ({project.cliente_nome})
            </option>
          ))}
        </select>
        {errors.progetto_id && <p className="mt-1 text-sm text-red-600">{errors.progetto_id}</p>}
      </div>

      {/* Scadenza */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Scadenza *
        </label>
        <input
          type="datetime-local"
          value={formData.scadenza}
          onChange={(e) => setFormData(prev => ({ ...prev, scadenza: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.scadenza ? 'border-red-300' : 'border-gray-300'
          }`}
          min={new Date().toISOString().slice(0, 16)}
        />
        {errors.scadenza && <p className="mt-1 text-sm text-red-600">{errors.scadenza}</p>}
      </div>

      {/* Risorse Assegnate */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Risorse Assegnate * ({formData.risorse_assegnate.length} selezionate)
        </label>
        
        {usersLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm text-gray-600">Caricamento utenti...</span>
          </div>
        ) : (
          <div className={`border rounded-lg p-3 max-h-48 overflow-y-auto ${
            errors.risorse_assegnate ? 'border-red-300' : 'border-gray-300'
          }`}>
            {availableUsers.length > 0 ? (
              <div className="space-y-2">
                {availableUsers.map(user => (
                  <label key={user.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.risorse_assegnate.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{user.nome}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Nessuna risorsa disponibile
              </p>
            )}
          </div>
        )}
        {errors.risorse_assegnate && <p className="mt-1 text-sm text-red-600">{errors.risorse_assegnate}</p>}
      </div>

      {/* Descrizione */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descrizione
        </label>
        <textarea
          value={formData.descrizione}
          onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Descrizione opzionale dell'attività..."
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          disabled={isCreating}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={isCreating}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Creazione...
            </>
          ) : (
            'Crea Attività'
          )}
        </button>
      </div>
    </form>
  );
};

const ActivitiesPage = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { activities, isLoading: activitiesLoading } = useActivities(filters);
  const { projects, isLoading: projectsLoading } = useProjects();

  const isManager = user?.ruolo === 'manager';

  if (activitiesLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attività</h1>
          <p className="text-gray-500 mt-1">
            {isManager 
              ? 'Ore preventivate ed effettive calcolate automaticamente dalle task - Click per espandere'
              : 'Le tue attività con tempi automatici - Click per espandere'
            }
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                   hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuova Attività
        </button>
      </div>

      <ActivityFilters 
        filters={filters} 
        setFilters={setFilters} 
        projects={projects} 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-blue-900">
                {activities.length}
              </div>
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
              <div className="text-2xl font-bold text-green-900">
                {activities.filter(a => a.stato === 'completata').length}
              </div>
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
              <div className="text-2xl font-bold text-orange-900">
                {activities.filter(a => a.stato === 'in_esecuzione').length}
              </div>
              <div className="text-sm text-orange-600">In Corso</div>
            </div>
          </div>
        </div>
      </div>

      {activities.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calculator className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna attività trovata</h3>
          <p className="text-gray-500 mb-2">
            {Object.keys(filters).length > 0 
              ? 'Prova a modificare i filtri di ricerca'
              : isManager 
              ? 'Le attività avranno tempi calcolati automaticamente dalle task'
              : 'Non hai ancora attività assegnate'
            }
          </p>
          <p className="text-xs text-blue-600 mb-6">
            ✨ Ore preventivate ed effettive sono ora calcolate automaticamente!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                     hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crea Prima Attività
          </button>
        </div>
      )}

      {showCreateModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      {/* Header Modal */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Crea Nuova Attività</h3>
          <button
            onClick={() => setShowCreateModal(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Form Content */}
      <CreateActivityForm 
        projects={projects} 
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          // Qui la lista si ricarica automaticamente grazie a React Query
        }}
      />
    </div>
  </div>
)}
    </div>
  );
};

export default ActivitiesPage;