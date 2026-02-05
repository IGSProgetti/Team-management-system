import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar, Clock, Users, BarChart3, Filter, Search,
  AlertTriangle, CheckCircle, Circle, PlayCircle, ChevronDown,
  ChevronUp, User, Timer, Target, Calculator, Zap, X,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '../../hooks';
import { useActivities, useProjects, useTasks } from '../../hooks';
import api from '../../utils/api';

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

// ✨ NUOVO COMPONENTE: Status Dropdown
const StatusDropdown = ({ currentStatus, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const statuses = [
    { value: 'pianificata', label: 'Pianificata', icon: Circle },
    { value: 'in_esecuzione', label: 'In Corso', icon: PlayCircle },
    { value: 'completata', label: 'Completata', icon: CheckCircle }
  ];

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border hover:bg-gray-50"
      >
        <span className={`inline-flex items-center gap-1.5 ${getStatusColor(currentStatus)}`}>
          {getStatusIcon(currentStatus)}
          {currentStatus === 'completata' ? 'Completata' : 
           currentStatus === 'in_esecuzione' ? 'In Corso' : 'Pianificata'}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border z-10">
          {statuses.map((status) => {
            const Icon = status.icon;
            return (
              <button
                key={status.value}
                onClick={() => {
                  onStatusChange(status.value);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
              >
                <Icon className="w-3 h-3 mr-2" />
                {status.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ✨ CreateTaskForm Component CON SELETTORE ORE/MINUTI
const CreateTaskForm = ({ activityId, activityName, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    attivita_id: activityId,
    utente_assegnato: '',
    ore_stimate: '',
    stimate_mode: 'hours',
    scadenza: ''
  });
  const [errors, setErrors] = useState({});
  
  const [users, setUsers] = useState([]);
const [usersLoading, setUsersLoading] = useState(true);
const { createTask, isCreating } = useTasks();

// Fetch diretto per utenti
useEffect(() => {
  const fetchUsers = async () => {
    try {
      const token = JSON.parse(localStorage.getItem('auth-storage')).state.token;
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${baseUrl}/users/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };
  fetchUsers();
}, []);

// Filtra solo le risorse
const availableUsers = users.filter(user => user.ruolo === 'risorsa');
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome task obbligatorio';
    }
    
    if (!formData.utente_assegnato) {
      newErrors.utente_assegnato = 'Utente assegnato obbligatorio';
    }
    
    if (!formData.scadenza) {
      newErrors.scadenza = 'Scadenza obbligatoria';
    } else if (new Date(formData.scadenza) <= new Date()) {
      newErrors.scadenza = 'Scadenza deve essere futura';
    }
    
    // ✅ Validazione ore stimate con modalità
    if (!formData.ore_stimate || parseFloat(formData.ore_stimate) <= 0) {
      if (formData.stimate_mode === 'hours') {
        newErrors.ore_stimate = 'Ore stimate obbligatorie (minimo 0.1 ore)';
      } else {
        newErrors.ore_stimate = 'Minuti stimati obbligatori (minimo 1 minuto)';
      }
    } else {
      // Validazione range per modalità
      if (formData.stimate_mode === 'hours') {
        if (parseFloat(formData.ore_stimate) < 0.1) {
          newErrors.ore_stimate = 'Minimo 0.1 ore (6 minuti)';
        } else if (parseFloat(formData.ore_stimate) > 24) {
          newErrors.ore_stimate = 'Massimo 24 ore per task';
        }
      } else {
        if (parseInt(formData.ore_stimate) < 1) {
          newErrors.ore_stimate = 'Minimo 1 minuto';
        } else if (parseInt(formData.ore_stimate) > 1440) {
          newErrors.ore_stimate = 'Massimo 1440 minuti (24 ore)';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // ✨ Conversione ore/minuti in minuti per il backend
    let oreStimateInMinuti;
    if (formData.stimate_mode === 'hours') {
      oreStimateInMinuti = Math.round(parseFloat(formData.ore_stimate) * 60);
    } else {
      oreStimateInMinuti = parseInt(formData.ore_stimate);
    }
    
    // Costruisci i dati esattamente come prima
    const submitData = {
      nome: formData.nome,
      descrizione: formData.descrizione,
      attivita_id: formData.attivita_id,
      utente_assegnato: formData.utente_assegnato,
      ore_stimate: oreStimateInMinuti,
      scadenza: formData.scadenza
    };
    
    console.log('🔧 DEBUG - Dati finali inviati:', submitData);
    
    createTask(submitData, {
      onSuccess: () => {
        console.log('🔧 DEBUG - Task creata con successo!');
        onSuccess();
      },
      onError: (error) => {
        console.error('🔧 DEBUG - Errore creazione task:', error);
        console.error('🔧 DEBUG - Response data:', error.response?.data);
      }
    });
  };

  // ✨ Funzione per mostrare conversione
  const getTimeConversion = () => {
    if (!formData.ore_stimate) return '';
    
    if (formData.stimate_mode === 'hours') {
      const minutes = Math.round(parseFloat(formData.ore_stimate || 0) * 60);
      return `≈ ${minutes} minuti`;
    } else {
      const hours = (parseInt(formData.ore_stimate || 0) / 60).toFixed(2);
      return `≈ ${hours} ore`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Crea Nuova Task</h3>
              <p className="text-sm text-gray-500 mt-1">Per attività: {activityName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome Task */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Task *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${errors.nome ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Es: Creare mockup homepage"
              disabled={isCreating}
            />
            {errors.nome && <p className="text-sm text-red-600 mt-1">{errors.nome}</p>}
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione
            </label>
            <textarea
              value={formData.descrizione}
              onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Descrizione dettagliata della task..."
              disabled={isCreating}
            />
          </div>

          {/* Utente Assegnato */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Assegna a *
              </div>
            </label>
            {usersLoading ? (
              <div className="flex items-center px-3 py-2 border border-gray-300 rounded-lg">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-gray-500">Caricamento utenti...</span>
              </div>
            ) : (
              <select
                value={formData.utente_assegnato}
                onChange={(e) => setFormData({ ...formData, utente_assegnato: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${errors.utente_assegnato ? 'border-red-500' : 'border-gray-300'}`}
                disabled={isCreating}
              >
                <option value="">Seleziona risorsa...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nome} ({user.email})
                  </option>
                ))}
              </select>
            )}
            {errors.utente_assegnato && <p className="text-sm text-red-600 mt-1">{errors.utente_assegnato}</p>}
          </div>

          {/* ✨ Ore Stimate con selettore Ore/Minuti */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Tempo Stimato *
              </div>
            </label>
            
            {/* Selettore modalità Ore/Minuti */}
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, stimate_mode: 'hours', ore_stimate: '' })}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${formData.stimate_mode === 'hours'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Ore
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, stimate_mode: 'minutes', ore_stimate: '' })}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${formData.stimate_mode === 'minutes'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <Zap className="w-4 h-4 inline mr-2" />
                Minuti
              </button>
            </div>

            {/* Input numero con conversione in tempo reale */}
            <div className="relative">
              <input
                type="number"
                step={formData.stimate_mode === 'hours' ? '0.1' : '1'}
                min={formData.stimate_mode === 'hours' ? '0.1' : '1'}
                max={formData.stimate_mode === 'hours' ? '24' : '1440'}
                value={formData.ore_stimate}
                onChange={(e) => setFormData({ ...formData, ore_stimate: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${errors.ore_stimate ? 'border-red-500' : 'border-gray-300'}`}
                placeholder={formData.stimate_mode === 'hours' ? 'Es: 2.5' : 'Es: 150'}
                disabled={isCreating}
              />
              {formData.ore_stimate && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  {getTimeConversion()}
                </div>
              )}
            </div>
            
            {errors.ore_stimate && <p className="text-sm text-red-600 mt-1">{errors.ore_stimate}</p>}
            
            <p className="text-xs text-gray-500 mt-1">
              {formData.stimate_mode === 'hours' 
                ? 'Inserisci le ore (es: 2.5 per 2 ore e 30 minuti)'
                : 'Inserisci i minuti (es: 150 per 2 ore e 30 minuti)'
              }
            </p>
          </div>

          {/* Scadenza */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Scadenza *
              </div>
            </label>
            <input
              type="datetime-local"
              value={formData.scadenza}
              onChange={(e) => setFormData({ ...formData, scadenza: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${errors.scadenza ? 'border-red-500' : 'border-gray-300'}`}
              disabled={isCreating}
            />
            {errors.scadenza && <p className="text-sm text-red-600 mt-1">{errors.scadenza}</p>}
          </div>

          {/* Pulsanti */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isCreating}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              disabled={isCreating}
            >
              {isCreating ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creazione...
                </div>
              ) : (
                'Crea Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// TaskItem Component
const TaskItem = ({ task }) => {
  const isOverdue = new Date(task.scadenza) < new Date() && task.stato !== 'completata';
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <div className={`p-1.5 rounded-full ${getStatusColor(task.stato)}`}>
          {getStatusIcon(task.stato)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h5 className="font-medium text-gray-900 truncate">{task.nome}</h5>
            {isOverdue && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle className="w-3 h-3" />
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
              Prev: {formatMinutesToHours(task.ore_stimate)}
            </span>
            {task.ore_effettive > 0 && (
              <span className="flex items-center gap-1 font-medium text-blue-600">
                <Zap className="w-3 h-3" />
                Eff: {formatMinutesToHours(task.ore_effettive)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        {new Date(task.scadenza).toLocaleDateString('it-IT')}
      </div>
    </div>
  );
};

// TasksList Component
const TasksList = ({ activityId, activityName, onCreateTask }) => {
  const { data: tasksData, isLoading } = useTasks({ attivita_id: activityId });
  const tasks = tasksData?.tasks || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
          
          <button 
            onClick={() => onCreateTask(activityId, activityName)}
            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Aggiungi Task
          </button>

          {/* Riepilogo Tempi */}
          <div className="bg-blue-50 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-around text-sm">
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
            <button 
              onClick={() => onCreateTask(activityId, activityName)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crea Prima Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ActivityCard AGGIORNATA con tempi automatici - MANTIENE TUTTE LE FUNZIONALITÀ
const ActivityCard = ({ activity, onCreateTask, onStatusChange }) => {
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
            <p className="text-sm text-gray-600 mt-1">
              {activity.progetto_nome} • {activity.cliente_nome}
            </p>
            {activity.area_nome && (
              <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                Area: {activity.area_nome}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <StatusDropdown 
              currentStatus={activity.stato}
              onStatusChange={(newStatus) => onStatusChange(activity.id, newStatus)}
            />
            {isOverdue && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle className="w-3 h-3" />
                Scaduta
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Task</div>
              <div className="text-sm font-semibold text-gray-900">
                {activity.task_completate || 0} / {activity.numero_task || 0}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <Target className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Completamento</div>
              <div className="text-sm font-semibold text-gray-900">{progress}%</div>
            </div>
          </div>
        </div>

        {/* ✨ Tempi Automatici */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Preventivato</span>
            </div>
            <div className="text-lg font-bold text-blue-900">
              {formatMinutesToHours(oreStimate)}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {activity.numero_task > 0 ? 'Somma task' : 'Nessuna task'}
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">Effettivo</span>
            </div>
            <div className={`text-lg font-bold ${performanceColor}`}>
              {formatMinutesToHours(oreEffettive)}
            </div>
            <div className="text-xs text-purple-600 mt-1">
              {oreEffettive > 0 
                ? (oreEffettive > oreStimate ? 'Oltre stima' : oreEffettive < oreStimate ? 'Sotto stima' : 'In linea')
                : 'Non iniziato'
              }
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{new Date(activity.scadenza).toLocaleDateString('it-IT')}</span>
          </div>
          
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                progress === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <TasksList 
            activityId={activity.id} 
            activityName={activity.nome}
            onCreateTask={onCreateTask}
          />
        </div>
      )}
    </div>
  );
};

// ActivityFilters Component
const ActivityFilters = ({ filters, setFilters, projects, activities }) => {
  // Estrai clienti unici dalle attività
  const uniqueClients = [...new Set(activities.map(a => a.cliente_nome))].filter(Boolean);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca attività..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <select
            value={filters.stato || ''}
            onChange={(e) => setFilters({ ...filters, stato: e.target.value || undefined })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tutti gli stati</option>
            <option value="pianificata">Pianificate</option>
            <option value="in_esecuzione">In Esecuzione</option>
            <option value="completata">Completate</option>
          </select>
        </div>

        <div>
          <select
            value={filters.cliente_nome || ''}
            onChange={(e) => setFilters({ ...filters, cliente_nome: e.target.value || undefined })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tutti i clienti</option>
            {uniqueClients.map((client) => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

// ✨ CreateActivityForm Component CON INTEGRAZIONE AREE
const CreateActivityForm = ({ projects, preselectedProject, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    progetto_id: preselectedProject?.id || '',
    area_id: '', // ✨ CAMPO AREA AGGIUNTO
    scadenza: '',
    risorse_assegnate: []
  });
  const [errors, setErrors] = useState({});
  
  // Stati esistenti
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  
  // ✨ NUOVI STATI PER AREE
  const [aree, setAree] = useState([]);
  const [areeLoading, setAreeLoading] = useState(false);
  
  const { createActivity, isCreating } = useActivities();

  // Fetch utenti (INVARIATO)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = JSON.parse(localStorage.getItem('auth-storage')).state.token;
        const baseUrl = process.env.REACT_APP_API_URL || '';
        const response = await fetch(`${baseUrl}/users/list`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error('Errore caricamento utenti:', error);
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // ✨ NUOVO useEffect - Carica aree quando cambia progetto
  useEffect(() => {
    const fetchAree = async () => {
      if (!formData.progetto_id) {
        setAree([]);
        setFormData(prev => ({ ...prev, area_id: '' })); // Reset area quando cambia progetto
        return;
      }

      try {
        setAreeLoading(true);
        const token = JSON.parse(localStorage.getItem('auth-storage')).state.token;
        const baseUrl = process.env.REACT_APP_API_URL || '';
        const response = await fetch(`${baseUrl}/aree?progetto_id=${formData.progetto_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        setAree(data.aree || []);
      } catch (error) {
        console.error('Errore caricamento aree:', error);
        setAree([]);
      } finally {
        setAreeLoading(false);
      }
    };

    fetchAree();
  }, [formData.progetto_id]);

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
    
    // ✨ VALIDAZIONE AREA
    if (!formData.area_id) {
      newErrors.area_id = 'Area obbligatoria';
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
      {/* Messaggio progetto pre-selezionato (INVARIATO) */}
      {preselectedProject && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <div className="font-medium text-green-900">
                Creazione attività per progetto: {preselectedProject.nome}
              </div>
              <div className="text-sm text-green-700">
                Il progetto è già selezionato. Compila gli altri campi per creare l'attività.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box Tempi Automatici (INVARIATO) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Calculator className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-blue-900 mb-1">✨ Tempi Automatici</div>
            <div className="text-blue-700">
              Le ore preventivate saranno calcolate automaticamente dalla somma delle task che creerai.
              Non è necessario inserire ore stimate per l'attività.
            </div>
          </div>
        </div>
      </div>

      {/* Nome (INVARIATO) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nome Attività *
        </label>
        <input
          type="text"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${errors.nome ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Es: Progettazione UI Homepage"
          disabled={isCreating}
        />
        {errors.nome && <p className="text-sm text-red-600 mt-1">{errors.nome}</p>}
      </div>

      {/* Descrizione (INVARIATO) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descrizione
        </label>
        <textarea
          value={formData.descrizione}
          onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Descrizione dettagliata dell'attività..."
          disabled={isCreating}
        />
      </div>

      {/* Progetto (INVARIATO) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Progetto *
        </label>
        <select
          value={formData.progetto_id}
          onChange={(e) => setFormData({ ...formData, progetto_id: e.target.value })}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${errors.progetto_id ? 'border-red-500' : 'border-gray-300'}`}
          disabled={!!preselectedProject || isCreating}
        >
          <option value="">Seleziona progetto...</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.nome} - {project.cliente_nome}
            </option>
          ))}
        </select>
        {errors.progetto_id && <p className="text-sm text-red-600 mt-1">{errors.progetto_id}</p>}
      </div>

      {/* ✨ NUOVO CAMPO - Area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Area *
          </div>
        </label>
        
        {!formData.progetto_id ? (
          <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
            Seleziona prima un progetto
          </div>
        ) : areeLoading ? (
          <div className="flex items-center px-3 py-2 border border-gray-300 rounded-lg">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
            <span className="text-gray-500 text-sm">Caricamento aree...</span>
          </div>
        ) : aree.length === 0 ? (
          <div className="w-full px-4 py-2 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
            ⚠️ Nessuna area trovata per questo progetto. Crea prima un'area.
          </div>
        ) : (
          <select
            value={formData.area_id}
            onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${errors.area_id ? 'border-red-500' : 'border-gray-300'}`}
            disabled={isCreating}
          >
            <option value="">Seleziona area...</option>
            {aree.map((area) => (
              <option key={area.id} value={area.id}>
                {area.nome}
                {area.coordinatore_nome && ` (Coord: ${area.coordinatore_nome})`}
              </option>
            ))}
          </select>
        )}
        
        {errors.area_id && <p className="text-sm text-red-600 mt-1">{errors.area_id}</p>}
      </div>

      {/* Scadenza (INVARIATO) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Scadenza *
          </div>
        </label>
        <input
          type="datetime-local"
          value={formData.scadenza}
          onChange={(e) => setFormData({ ...formData, scadenza: e.target.value })}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${errors.scadenza ? 'border-red-500' : 'border-gray-300'}`}
          disabled={isCreating}
        />
        {errors.scadenza && <p className="text-sm text-red-600 mt-1">{errors.scadenza}</p>}
      </div>

      {/* Risorse Assegnate (INVARIATO) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Risorse Assegnate *
          </div>
        </label>
        
        {usersLoading ? (
          <div className="flex items-center px-3 py-2 border border-gray-300 rounded-lg">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
            <span className="text-gray-500">Caricamento utenti...</span>
          </div>
        ) : (
          <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
            {availableUsers.length > 0 ? (
              <div className="space-y-2">
                {availableUsers.map((user) => (
                  <label key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.risorse_assegnate.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={isCreating}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{user.nome}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                Nessuna risorsa disponibile
              </div>
            )}
          </div>
        )}
        
        {errors.risorse_assegnate && (
          <p className="text-sm text-red-600 mt-1">{errors.risorse_assegnate}</p>
        )}
        
        {formData.risorse_assegnate.length > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            {formData.risorse_assegnate.length} risorsa/e selezionata/e
          </p>
        )}
      </div>

      {/* Pulsanti (INVARIATO) */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={isCreating}
        >
          Annulla
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          disabled={isCreating}
        >
          {isCreating ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Creazione...
            </div>
          ) : (
            'Crea Attività'
          )}
        </button>
      </div>
    </form>
  );
};

// Main ActivitiesPage Component (INVARIATO)
const ActivitiesPage = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [preselectedProject, setPreselectedProject] = useState(null);

  const { activities, isLoading: activitiesLoading } = useActivities(filters);
  const { projects, isLoading: projectsLoading } = useProjects();

  const isManager = user?.ruolo === 'manager';

  // Controlla progetto pre-selezionato (INVARIATO)
  React.useEffect(() => {
    const selectedProject = localStorage.getItem('selected_project');
    if (selectedProject) {
      try {
        const projectData = JSON.parse(selectedProject);
        setPreselectedProject(projectData);
        setShowCreateModal(true);
        localStorage.removeItem('selected_project');
      } catch (error) {
        console.error('Errore parsing selected_project:', error);
        localStorage.removeItem('selected_project');
      }
    }
  }, []);

  const handleCreateTask = (activityId, activityName) => {
    setSelectedActivity({ id: activityId, nome: activityName });
    setShowCreateTaskModal(true);
  };

  const handleTaskCreated = () => {
    setShowCreateTaskModal(false);
    setSelectedActivity(null);
  };

  const handleActivityCreated = () => {
    setShowCreateModal(false);
    setPreselectedProject(null);
  };

  const handleActivityStatusChange = async (activityId, newStatus) => {
    try {
      await api.put(`/activities/${activityId}`, { stato: newStatus });
      window.location.reload();
    } catch (error) {
      console.error('Errore cambio stato:', error);
      alert('Errore durante il cambio di stato dell\'attività');
    }
  };

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
        activities={activities}
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

      {(() => {
        const filteredActivities = filters.cliente_nome 
          ? activities.filter(activity => activity.cliente_nome === filters.cliente_nome)
          : activities;
          
        return filteredActivities.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredActivities.map((activity) => (
              <ActivityCard 
                key={activity.id} 
                activity={activity} 
                onCreateTask={handleCreateTask}
                onStatusChange={handleActivityStatusChange}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calculator className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna attività trovata</h3>
            <p className="text-gray-500 mb-2">
              {filters.cliente_nome ? 
                `Nessuna attività trovata per il cliente "${filters.cliente_nome}"` :
                'Prova a modificare i filtri di ricerca'
              }
            </p>
            <button
              onClick={() => setFilters({})}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Cancella filtri
            </button>
          </div>
        );
      })()}

      {/* Modal Creazione Attività */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Crea Nuova Attività</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setPreselectedProject(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <CreateActivityForm 
              projects={projects}
              preselectedProject={preselectedProject}
              onClose={() => {
                setShowCreateModal(false);
                setPreselectedProject(null);
              }}
              onSuccess={handleActivityCreated}
            />
          </div>
        </div>
      )}

      {/* Modal Creazione Task */}
      {showCreateTaskModal && selectedActivity && (
        <CreateTaskForm
          activityId={selectedActivity.id}
          activityName={selectedActivity.nome}
          onClose={() => {
            setShowCreateTaskModal(false);
            setSelectedActivity(null);
          }}
          onSuccess={handleTaskCreated}
        />
      )}
    </div>
  );
};

export default ActivitiesPage;