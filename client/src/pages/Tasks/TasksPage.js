import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  MoreHorizontal,
  X  // AGGIUNGI QUESTA RIGA
} from 'lucide-react';
import { useTasks } from '../../hooks';
import { formatMinutesToHours, formatRelativeTime } from '../../utils/helpers';

const TaskCard = ({ task, onComplete, onEdit }) => {
  const isOverdue = new Date(task.scadenza) < new Date() && task.stato !== 'completata';
  const isDueToday = new Date(task.scadenza).toDateString() === new Date().toDateString();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer mb-3">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-gray-900 text-sm leading-tight flex-1 pr-2">
          {task.nome}
        </h3>
        <button className="text-gray-400 hover:text-gray-600 p-1">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {task.descrizione && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-3">
          {task.descrizione}
        </p>
      )}

      {/* Labels/Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {isOverdue && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            In Ritardo
          </span>
        )}
        {isDueToday && !isOverdue && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Clock className="w-3 h-3 mr-1" />
            Oggi
          </span>
        )}
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {task.ore_effettive && task.stato === 'completata' ? (
            <>
              <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
              {formatMinutesToHours(task.ore_effettive)} effettive
            </>
          ) : (
            <>
              <Clock className="w-3 h-3 mr-1" />
              {formatMinutesToHours(task.ore_stimate)} stimate
            </>
          )}
        </span>
      </div>

      {/* Differenza ore per task completate */}
      {task.stato === 'completata' && task.ore_effettive && (
        <div className="mb-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            task.ore_effettive === task.ore_stimate ? 'bg-yellow-100 text-yellow-800' :
            task.ore_effettive > task.ore_stimate ? 'bg-red-100 text-red-800' :
            'bg-green-100 text-green-800'
          }`}>
            Differenza: {task.ore_effettive === task.ore_stimate ? '±0' : 
             task.ore_effettive > task.ore_stimate ? `+${task.ore_effettive - task.ore_stimate}` :
             `${task.ore_effettive - task.ore_stimate}`} min
          </span>
        </div>
      )}

      {/* Informazioni complete */}
      <div className="mb-3 space-y-1">
        <div className="text-xs text-gray-600">
          <span className="font-medium">Attività:</span> {task.attivita_nome}
        </div>
        <div className="text-xs text-gray-600">
          <span className="font-medium">Progetto:</span> {task.progetto_nome} • {task.cliente_nome}
        </div>
      </div>

      {/* Meta Info */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          <span>{formatRelativeTime(task.scadenza)}</span>
        </div>
        <div className="flex items-center">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {task.utente_nome?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          {task.progetto_nome} • {task.cliente_nome}
        </span>
      </div>

      {/* Action Buttons */}
      {task.stato !== 'completata' && (
        <div className="mt-3 flex gap-2">
          {task.stato === 'programmata' && (
            <button 
              onClick={() => onEdit?.(task, 'in_esecuzione')}
              className="flex-1 text-xs bg-blue-50 text-blue-600 py-2 rounded-md hover:bg-blue-100 transition-colors"
            >
              Inizia
            </button>
          )}
          {task.stato === 'in_esecuzione' && (
            <button 
              onClick={() => onComplete?.(task)}
              className="flex-1 text-xs bg-green-50 text-green-600 py-2 rounded-md hover:bg-green-100 transition-colors flex items-center justify-center"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completa
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const KanbanColumn = ({ title, tasks, status, count, onAddTask, children }) => {
  const getColumnColor = () => {
    switch (status) {
      case 'programmata': return 'border-gray-300 bg-gray-50';
      case 'in_esecuzione': return 'border-blue-300 bg-blue-50';
      case 'completata': return 'border-green-300 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className={`rounded-xl border-2 p-4 min-h-96 ${getColumnColor()}`}>
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
            {title}
          </h3>
          <span className="ml-2 bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
            {count}
          </span>
        </div>
        <button 
          onClick={() => onAddTask?.(status)}
          className="text-gray-500 hover:text-gray-700 p-1"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {children}
      </div>

      {/* Add Task Button */}
      <button 
        onClick={() => onAddTask?.(status)}
        className="w-full mt-3 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors text-sm flex items-center justify-center"
      >
        <Plus className="w-4 h-4 mr-2" />
        Aggiungi task
      </button>
    </div>
  );
};

const CompleteTaskModal = ({ task, isOpen, onClose, onConfirm }) => {
  const [hoursWorked, setHoursWorked] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !task) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!hoursWorked.trim()) {
      setError('Inserisci le ore lavorate');
      return;
    }

    const minutes = parseFloat(hoursWorked) * 60;
    if (isNaN(minutes) || minutes <= 0) {
      setError('Inserisci un numero valido di ore');
      return;
    }

    onConfirm(task.id, Math.round(minutes));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">Completa Task</h2>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Task: <strong>{task.nome}</strong></p>
          <p className="text-xs text-gray-500">
            Stimate: {formatMinutesToHours(task.ore_stimate)}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ore Effettive Lavorate *
            </label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              value={hoursWorked}
              onChange={(e) => {
                setHoursWorked(e.target.value);
                setError('');
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="es: 2.5"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Inserisci le ore effettivamente lavorate su questa task
            </p>
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Completa Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateTaskModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    ore_stimate: '',
    scadenza_data: '',
    scadenza_ora: '',
    attivita_nome: '',
    progetto_nome: 'Sistema Management',
    cliente_nome: 'Acme Corporation',
    priorita: 'medium'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome task richiesto';
    }
    
    if (!formData.ore_stimate || formData.ore_stimate <= 0) {
      newErrors.ore_stimate = 'Ore stimate richieste (maggiori di 0)';
    }
    
    if (!formData.scadenza_data) {
      newErrors.scadenza_data = 'Data scadenza richiesta';
    }
    
    if (!formData.scadenza_ora) {
      newErrors.scadenza_ora = 'Ora scadenza richiesta';
    }
    
    if (!formData.attivita_nome.trim()) {
      newErrors.attivita_nome = 'Nome attività richiesto';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const scadenza = `${formData.scadenza_data}T${formData.scadenza_ora}:00Z`;
      
      const taskData = {
        ...formData,
        scadenza,
        ore_stimate: parseFloat(formData.ore_stimate) * 60,
        stato: 'programmata'
      };
      
      await onSubmit(taskData);
      
      setFormData({
        nome: '',
        descrizione: '',
        ore_stimate: '',
        scadenza_data: '',
        scadenza_ora: '',
        attivita_nome: '',
        progetto_nome: 'Sistema Management',
        cliente_nome: 'Acme Corporation',
        priorita: 'medium'
      });
      
      onClose();
      
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Crea Nuova Task</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome Task *</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.nome ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="es: Sviluppo componente login"
                autoFocus
              />
              {errors.nome && <p className="text-sm text-red-600 mt-1">{errors.nome}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrizione</label>
              <textarea
                name="descrizione"
                value={formData.descrizione}
                onChange={handleInputChange}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Descrizione dettagliata della task..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ore Stimate *</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  name="ore_stimate"
                  value={formData.ore_stimate}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.ore_stimate ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="es: 2.5"
                />
                {errors.ore_stimate && <p className="text-sm text-red-600 mt-1">{errors.ore_stimate}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priorità</label>
                <select
                  name="priorita"
                  value={formData.priorita}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">🟢 Bassa</option>
                  <option value="medium">🟡 Media</option>
                  <option value="high">🟠 Alta</option>
                  <option value="urgent">🔴 Urgente</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Scadenza *</label>
                <input
                  type="date"
                  name="scadenza_data"
                  value={formData.scadenza_data}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.scadenza_data ? 'border-red-300' : 'border-gray-300'}`}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.scadenza_data && <p className="text-sm text-red-600 mt-1">{errors.scadenza_data}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ora Scadenza *</label>
                <input
                  type="time"
                  name="scadenza_ora"
                  value={formData.scadenza_ora}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.scadenza_ora ? 'border-red-300' : 'border-gray-300'}`}
                />
                {errors.scadenza_ora && <p className="text-sm text-red-600 mt-1">{errors.scadenza_ora}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attività *</label>
              <input
                type="text"
                name="attivita_nome"
                value={formData.attivita_nome}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.attivita_nome ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="es: Sviluppo Frontend"
              />
              {errors.attivita_nome && <p className="text-sm text-red-600 mt-1">{errors.attivita_nome}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Progetto</label>
                <input
                  type="text"
                  name="progetto_nome"
                  value={formData.progetto_nome}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome progetto"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
                <input
                  type="text"
                  name="cliente_nome"
                  value={formData.cliente_nome}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome cliente"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" disabled={isSubmitting}>
              Annulla
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creando...
                </div>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Crea Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TasksPage = () => {
  const { tasks, summary, isLoading, completeTask, updateTask, createTask } = useTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Group tasks by status
  const tasksByStatus = {
    programmata: tasks.filter(task => task.stato === 'programmata'),
    in_esecuzione: tasks.filter(task => task.stato === 'in_esecuzione'),
    completata: tasks.filter(task => task.stato === 'completata')
  };

  // Handle task completion
  const handleCompleteTask = (task) => {
    setSelectedTask(task);
    setShowCompleteModal(true);
  };

  const handleConfirmComplete = (taskId, minutes) => {
    completeTask({ taskId, ore_effettive: minutes });
    setShowCompleteModal(false);
    setSelectedTask(null);
  };

  const handleCreateTask = async (taskData) => {
  console.log('Creating task:', taskData);
  // Qui chiameremo l'API per creare la task
};

  const handleStatusChange = (task, newStatus) => {
  // Aggiorna immediatamente la UI
  const updatedTasks = tasks.map(t => 
    t.id === task.id ? { ...t, stato: newStatus } : t
  );
  
  // Chiama l'API per persistere il cambiamento
  updateTask({ 
    taskId: task.id, 
    data: { stato: newStatus } 
  });
  
  console.log(`📝 Task "${task.nome}" spostata in: ${newStatus}`);
};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Le Mie Task</h1>
            <p className="text-gray-600">
              {summary?.totali || 0} task totali • {summary?.completate || 0} completate
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cerca task..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Filter */}
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtri</span>
            </button>

            {/* Add Task */}
            <button 
  onClick={() => setShowCreateModal(true)}
  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuova Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 min-w-max pb-6">
          {/* Programmate Column */}
          <div className="w-80 flex-shrink-0">
            <KanbanColumn
              title="Da Fare"
              status="programmata"
              tasks={tasksByStatus.programmata}
              count={tasksByStatus.programmata.length}
              onAddTask={() => setShowCreateModal(true)}
            >
              {tasksByStatus.programmata.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={handleStatusChange}
                />
              ))}
            </KanbanColumn>
          </div>

          {/* In Esecuzione Column */}
          <div className="w-80 flex-shrink-0">
            <KanbanColumn
              title="In Corso"
              status="in_esecuzione"
              tasks={tasksByStatus.in_esecuzione}
              count={tasksByStatus.in_esecuzione.length}
              onAddTask={(status) => console.log('Add task for status:', status)}
            >
              {tasksByStatus.in_esecuzione.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  onEdit={handleStatusChange}
                />
              ))}
            </KanbanColumn>
          </div>

          {/* Completate Column */}
          <div className="w-80 flex-shrink-0">
            <KanbanColumn
              title="Completate"
              status="completata"
              tasks={tasksByStatus.completata}
              count={tasksByStatus.completata.length}
              onAddTask={(status) => console.log('Add task for status:', status)}
            >
              {tasksByStatus.completata.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                />
              ))}
            </KanbanColumn>
          </div>
        </div>
      </div>

      {/* Complete Task Modal */}
      <CompleteTaskModal
        task={selectedTask}
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setSelectedTask(null);
        }}
        onConfirm={handleConfirmComplete}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTask}
      />
    </div> 
  );
};

export default TasksPage;
