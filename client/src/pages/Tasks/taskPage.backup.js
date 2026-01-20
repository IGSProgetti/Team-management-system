import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Clock, User, Calendar, X } from 'lucide-react';
import { useTasks, useAuth } from '../../hooks';
import { activitiesAPI } from '../../utils/api';

// Utility function for formatting - VERSIONE INTELLIGENTE
const formatMinutesToHours = (minutes) => {
  if (!minutes || minutes === 0) return '0min';
  
  // Per task sotto 60 minuti, mostra sempre in minuti
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  // Per task di 60+ minuti, usa formato misto
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    // Ore esatte: formato semplice
    return `${hours}h`;
  } else {
    // Formato misto: 1h 15min
    return `${hours}h ${remainingMinutes}min`;
  }
};

const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// TaskCard Component
const TaskCard = ({ task, onComplete, onEdit }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'programmata': return 'bg-gray-100 text-gray-700';
      case 'in_esecuzione': return 'bg-blue-100 text-blue-700';
      case 'completata': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Logica per evidenziazione ritardi
  const getOverdueBorderClass = () => {
    if (task.stato === 'completata') return '';
    
    const today = new Date();
    const taskDate = new Date(task.scadenza);
    const diffTime = today - taskDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 3) {
      // Scaduta da più di 3 giorni - Bordo rosso spesso
      return 'border-red-500 border-2 bg-red-50';
    } else if (diffDays >= 1 && diffDays <= 3) {
      // Scaduta da 1-3 giorni - Bordo giallo spesso  
      return 'border-yellow-500 border-2 bg-yellow-50';
    } else if (diffDays === 0) {
      // Scade oggi - Bordo arancione
      return 'border-orange-400 border-2';
    }
    
    return ''; // Nessuna evidenziazione per task future
  };

  const isOverdue = new Date(task.scadenza) < new Date() && task.stato !== 'completata';

  return (
    <div className={`card-task ${getOverdueBorderClass()}`}>
      {/* Header con titolo e priorità */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 line-clamp-2 flex-1">{task.nome}</h3>
        {task.priorita && (
          <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priorita)}`}>
            {task.priorita}
          </span>
        )}
      </div>

      {/* Descrizione */}
      {task.descrizione && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.descrizione}</p>
      )}

      {/* Info progetto/cliente */}
      <div className="flex items-center text-xs text-gray-500 mb-2">
        <span className="truncate">
          {task.cliente_nome} • {task.progetto_nome}
        </span>
      </div>

      {/* Ore stimate vs effettive */}
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center text-gray-600">
          <Clock className="w-3 h-3 mr-1" />
          <span>Stimate: {formatMinutesToHours(task.ore_stimate)}</span>
        </div>
        {task.ore_effettive && (
          <span className="text-gray-600">
            Effettive: {formatMinutesToHours(task.ore_effettive)}
          </span>
        )}
      </div>

      {/* Performance indicator separato */}
      {task.ore_effettive && (() => {
        const differenza = task.ore_effettive - task.ore_stimate;
        const percentualeScostamento = task.ore_stimate > 0 ? ((differenza / task.ore_stimate) * 100).toFixed(0) : 0;
        
        let colorClass, segno, testoDifferenza, percentualeClass, percentualeTesto;
        
        if (differenza < 0) {
          // Sotto stima - Verde (efficiente)
          colorClass = 'bg-green-100 text-green-700 border-green-200';
          percentualeClass = 'text-green-600';
          segno = '';
          testoDifferenza = `${segno}${Math.abs(differenza)}min`;
          percentualeTesto = `${percentualeScostamento}% sotto stima`;
        } else if (differenza > 0) {
          // Sopra stima - Rosso (inefficiente)  
          colorClass = 'bg-red-100 text-red-700 border-red-200';
          percentualeClass = 'text-red-600';
          segno = '+';
          testoDifferenza = `${segno}${differenza}min`;
          percentualeTesto = `+${percentualeScostamento}% oltre stima`;
        } else {
          // Perfetto - Giallo (preciso)
          colorClass = 'bg-yellow-100 text-yellow-700 border-yellow-200';
          percentualeClass = 'text-yellow-600';
          testoDifferenza = 'Perfetto!';
          percentualeTesto = 'Stima precisa';
        }
        
        return (
          <div className="flex items-center justify-between text-xs mb-1">
            {/* Banner colorato solo con i minuti */}
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colorClass}`}>
              {testoDifferenza}
            </span>
            
            {/* Percentuale separata con colore coordinato */}
            <span className={`text-xs font-medium ${percentualeClass}`}>
              {percentualeTesto}
            </span>
          </div>
        );
      })()}

      {/* Scadenza */}
      <div className={`flex items-center text-xs mb-3 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
        <Calendar className="w-3 h-3 mr-1" />
        <span>{formatDateTime(task.scadenza)}</span>
        {isOverdue && <span className="ml-1 text-red-600 font-medium">• In ritardo</span>}
      </div>

      {/* Utente assegnato */}
      <div className="flex items-center text-xs text-gray-600 mb-3">
        <User className="w-3 h-3 mr-1" />
        <span>{task.utente_nome}</span>
      </div>

      {/* Azioni */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.stato)}`}>
          {task.stato === 'programmata' ? 'Da Fare' :
           task.stato === 'in_esecuzione' ? 'In Corso' : 'Completata'}
        </span>
        
        <div className="flex gap-1">
          {task.stato !== 'completata' && (
            <>
              {task.stato === 'programmata' && (
                <button
                  onClick={() => onEdit(task, 'in_esecuzione')}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Inizia
                </button>
              )}
              {task.stato === 'in_esecuzione' && (
                <button
                  onClick={() => onComplete(task)}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Completa
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// KanbanColumn Component
const KanbanColumn = ({ title, status, tasks, count, onAddTask, children }) => {
  const getColumnColor = (status) => {
    switch (status) {
      case 'programmata': return 'border-gray-300 bg-gray-50';
      case 'in_esecuzione': return 'border-blue-300 bg-blue-50';
      case 'completata': return 'border-green-300 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className={`rounded-lg border-2 ${getColumnColor(status)} p-4 h-full`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-600">
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

      {/* Add Task Button - FIX: Abilita sempre onAddTask */}
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

// CompleteTaskModal Component - CON DOPPIA MODALITÀ
const CompleteTaskModal = ({ task, isOpen, onClose, onConfirm }) => {
  const [inputMode, setInputMode] = useState('minutes'); // 'hours' o 'minutes'
  const [hoursValue, setHoursValue] = useState('');
  const [minutesValue, setMinutesValue] = useState('');
  const [error, setError] = useState('');

  // Reset valori quando cambia il task o si apre il modal
  useEffect(() => {
    if (isOpen && task) {
      setHoursValue('');
      setMinutesValue('');
      setError('');
      // Suggerisci modalità in base alle ore stimate
      setInputMode(task.ore_stimate < 60 ? 'minutes' : 'hours');
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let totalMinutes = 0;
    
    if (inputMode === 'hours') {
      if (!hoursValue.trim()) {
        setError('Inserisci le ore lavorate');
        return;
      }
      
      const hours = parseFloat(hoursValue);
      if (isNaN(hours) || hours <= 0) {
        setError('Inserisci un numero valido di ore');
        return;
      }
      
      totalMinutes = Math.round(hours * 60);
    } else {
      if (!minutesValue.trim()) {
        setError('Inserisci i minuti lavorati');
        return;
      }
      
      const minutes = parseInt(minutesValue);
      if (isNaN(minutes) || minutes <= 0) {
        setError('Inserisci un numero valido di minuti');
        return;
      }
      
      totalMinutes = minutes;
    }

    onConfirm(task.id, totalMinutes);
  };

  // Conversione real-time per mostrare l'equivalente
  const getConvertedValue = () => {
    if (inputMode === 'hours' && hoursValue) {
      const minutes = Math.round(parseFloat(hoursValue || 0) * 60);
      return `≈ ${minutes}min`;
    } else if (inputMode === 'minutes' && minutesValue) {
      const hours = (parseInt(minutesValue || 0) / 60).toFixed(2);
      return `≈ ${hours}h`;
    }
    return '';
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
          {/* Toggle Modalità Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Ore Effettive Lavorate *
            </label>
            
            {/* Radio buttons per modalità */}
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="hours"
                  checked={inputMode === 'hours'}
                  onChange={(e) => setInputMode(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Ore</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="minutes"
                  checked={inputMode === 'minutes'}
                  onChange={(e) => setInputMode(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Minuti</span>
              </label>
            </div>

            {/* Input basato sulla modalità */}
            {inputMode === 'hours' ? (
              <div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={hoursValue}
                  onChange={(e) => {
                    setHoursValue(e.target.value);
                    setError('');
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es: 2.5"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Inserisci le ore in formato decimale (es: 1.5 = 1h 30min)
                </p>
              </div>
            ) : (
              <div>
                <input
                  type="number"
                  min="1"
                  value={minutesValue}
                  onChange={(e) => {
                    setMinutesValue(e.target.value);
                    setError('');
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es: 45"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Inserisci i minuti esatti (1, 5, 15, 30, 45...)
                </p>
                
                {/* Preset comuni per minuti */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[1, 5, 10, 15, 30, 45, 60, 90, 120].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMinutesValue(preset.toString())}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      {preset}min
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversione real-time */}
            {getConvertedValue() && (
              <p className="text-xs text-blue-600 mt-2 font-medium">
                {getConvertedValue()}
              </p>
            )}

            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
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

// CreateTaskModal Component - VERSIONE CON FALLBACK E CREAZIONE DINAMICA
const CreateTaskModal = ({ isOpen, onClose, onSubmit }) => {
  const { user } = useAuth(); // Utente corrente
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    ore_stimate: '',
    stimate_mode: 'minutes', // Nuovo campo per modalità input
    scadenza_data: '',
    scadenza_ora: '',
    attivita_id: '', // Campo per l'attività selezionata
    priorita: 'medium',
    // FALLBACK: Campi per creazione al volo se non ci sono attività
    progetto_nome: 'Sistema Management',
    cliente_nome: 'Acme Corporation'
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableActivities, setAvailableActivities] = useState([]); // Attività disponibili
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showCreateOnTheFly, setShowCreateOnTheFly] = useState(false); // Modal per creazione al volo

  // Carica attività disponibili quando si apre il modal
  useEffect(() => {
    if (isOpen) {
      loadAvailableActivities();
    }
  }, [isOpen]);

  const loadAvailableActivities = async () => {
    setLoadingActivities(true);
    try {
      const response = await activitiesAPI.getActivities();
      setAvailableActivities(response.data.activities || []);
      
      // Se non ci sono attività, abilita la modalità "creazione al volo"
      if (!response.data.activities || response.data.activities.length === 0) {
        setShowCreateOnTheFly(true);
      }
    } catch (error) {
      console.error('Errore nel caricamento attività:', error);
      // Fallback: abilita creazione al volo
      setShowCreateOnTheFly(true);
    } finally {
      setLoadingActivities(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Il nome è obbligatorio';
    }

    if (!formData.ore_stimate || parseFloat(formData.ore_stimate) <= 0) {
      newErrors.ore_stimate = 'Inserisci ore/minuti validi';
    }

    if (!formData.scadenza_data) {
      newErrors.scadenza_data = 'La data di scadenza è obbligatoria';
    }

    if (!formData.scadenza_ora) {
      newErrors.scadenza_ora = 'L\'orario di scadenza è obbligatorio';
    }

    // Validazione diversa a seconda se ci sono attività o modalità creazione
    if (!showCreateOnTheFly && !formData.attivita_id) {
      newErrors.attivita_id = 'Seleziona un\'attività';
    }

    if (showCreateOnTheFly && !formData.cliente_nome.trim()) {
      newErrors.cliente_nome = 'Il cliente è obbligatorio';
    }

    if (showCreateOnTheFly && !formData.progetto_nome.trim()) {
      newErrors.progetto_nome = 'Il progetto è obbligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Rimuovi errore se l'utente ha corretto
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Conversione ore stimate in minuti
      let oreStimateInMinuti;
      if (formData.stimate_mode === 'hours') {
        oreStimateInMinuti = Math.round(parseFloat(formData.ore_stimate) * 60);
      } else {
        oreStimateInMinuti = parseInt(formData.ore_stimate);
      }

      let taskData;

      if (showCreateOnTheFly) {
        // MODALITÀ CREAZIONE AL VOLO: Crea cliente/progetto/attività automaticamente
        taskData = {
          nome: formData.nome,
          descrizione: formData.descrizione,
          ore_stimate: oreStimateInMinuti, // Sempre in minuti al backend
          scadenza: `${formData.scadenza_data}T${formData.scadenza_ora}:00.000Z`,
          utente_assegnato: user.id,
          // Dati per creazione al volo (il backend dovrà gestirli)
          create_on_the_fly: true,
          cliente_nome: formData.cliente_nome,
          progetto_nome: formData.progetto_nome,
          attivita_nome: `Attività per ${formData.nome}` // Genera nome attività
        };
      } else {
        // MODALITÀ NORMALE: Usa attività esistente
        taskData = {
          nome: formData.nome,
          descrizione: formData.descrizione,
          ore_stimate: oreStimateInMinuti, // Sempre in minuti al backend
          scadenza: `${formData.scadenza_data}T${formData.scadenza_ora}:00.000Z`,
          attivita_id: formData.attivita_id,
          utente_assegnato: user.id,
        };
      }
      
      // Chiama la funzione del parent
      await onSubmit(taskData);
      
      // Reset form dopo successo
      setFormData({
        nome: '',
        descrizione: '',
        ore_stimate: '',
        stimate_mode: 'minutes',
        scadenza_data: '',
        scadenza_ora: '',
        attivita_id: '',
        priorita: 'medium',
        progetto_nome: 'Sistema Management',
        cliente_nome: 'Acme Corporation'
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
            {/* Nome Task */}
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

            {/* Descrizione */}
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

            {/* SEZIONE ATTIVITÀ O CREAZIONE AL VOLO */}
            {!showCreateOnTheFly ? (
              // MODALITÀ NORMALE: Select attività esistente
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attività *</label>
                {loadingActivities ? (
                  <div className="flex items-center px-3 py-2 border border-gray-300 rounded-lg">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                    <span className="text-gray-500">Caricamento attività...</span>
                  </div>
                ) : (
                  <select
                    name="attivita_id"
                    value={formData.attivita_id}
                    onChange={handleInputChange}
                    className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.attivita_id ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">Seleziona attività...</option>
                    {availableActivities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.nome} - {activity.progetto_nome} ({activity.cliente_nome})
                      </option>
                    ))}
                  </select>
                )}
                {errors.attivita_id && <p className="text-sm text-red-600 mt-1">{errors.attivita_id}</p>}
                
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    Task assegnata a: <strong>{user?.nome}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateOnTheFly(true)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Crea nuova attività al volo
                  </button>
                </div>
              </div>
            ) : (
              // MODALITÀ CREAZIONE AL VOLO: Campi cliente/progetto
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Modalità Creazione Rapida:</strong> Cliente, progetto e attività verranno creati automaticamente.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
                    <input
                      type="text"
                      name="cliente_nome"
                      value={formData.cliente_nome}
                      onChange={handleInputChange}
                      className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.cliente_nome ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="Nome cliente"
                    />
                    {errors.cliente_nome && <p className="text-sm text-red-600 mt-1">{errors.cliente_nome}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Progetto *</label>
                    <input
                      type="text"
                      name="progetto_nome"
                      value={formData.progetto_nome}
                      onChange={handleInputChange}
                      className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.progetto_nome ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="Nome progetto"
                    />
                    {errors.progetto_nome && <p className="text-sm text-red-600 mt-1">{errors.progetto_nome}</p>}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    Task assegnata a: <strong>{user?.nome}</strong>
                  </p>
                  {availableActivities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCreateOnTheFly(false)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Usa attività esistente
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Ore Stimate con doppia modalità */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ore Stimate *</label>
                
                {/* Toggle modalità per ore stimate */}
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="stimate_mode"
                      value="hours"
                      checked={formData.stimate_mode === 'hours'}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        stimate_mode: e.target.value,
                        ore_stimate: '' // Reset valore
                      }))}
                      className="mr-1"
                    />
                    <span className="text-xs">Ore</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="stimate_mode"
                      value="minutes"
                      checked={formData.stimate_mode === 'minutes'}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        stimate_mode: e.target.value,
                        ore_stimate: '' // Reset valore
                      }))}
                      className="mr-1"
                    />
                    <span className="text-xs">Min</span>
                  </label>
                </div>

                {formData.stimate_mode === 'hours' ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="ore_stimate"
                    value={formData.ore_stimate}
                    onChange={handleInputChange}
                    className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.ore_stimate ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="es: 2.5"
                  />
                ) : (
                  <div>
                    <input
                      type="number"
                      min="1"
                      name="ore_stimate"
                      value={formData.ore_stimate}
                      onChange={handleInputChange}
                      className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.ore_stimate ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="es: 45"
                    />
                    {/* Preset comuni per minuti */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {[5, 15, 30, 45, 60, 90, 120].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, ore_stimate: preset.toString() }))}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          {preset}min
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conversione real-time */}
                {formData.ore_stimate && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    {formData.stimate_mode === 'hours' 
                      ? `≈ ${Math.round(parseFloat(formData.ore_stimate || 0) * 60)}min`
                      : `≈ ${(parseInt(formData.ore_stimate || 0) / 60).toFixed(2)}h`
                    }
                  </p>
                )}

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
                  <option value="low">Bassa</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>

            {/* Data e Ora Scadenza */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Scadenza *</label>
                <input
                  type="date"
                  name="scadenza_data"
                  value={formData.scadenza_data}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.scadenza_data ? 'border-red-300' : 'border-gray-300'}`}
                  min={new Date().toISOString().split('T')[0]} // Non permettere date passate
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
          </div>

          {/* Pulsanti */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" 
              disabled={isSubmitting}
            >
              Annulla
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50" 
              disabled={isSubmitting || loadingActivities}
            >
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

// Main TasksPage Component
const TasksPage = () => {
  const { tasks, summary, isLoading, completeTask, updateTask, createTask } = useTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Nuovi stati per filtri temporali
  const [activeTimeFilters, setActiveTimeFilters] = useState({
    today: false,
    thisWeek: false,
    thisMonth: false
  });

  // Group tasks by status
  const tasksByStatus = {
    programmata: tasks.filter(task => task.stato === 'programmata'),
    in_esecuzione: tasks.filter(task => task.stato === 'in_esecuzione'),
    completata: tasks.filter(task => task.stato === 'completata')
  };

  // Helper functions per filtri temporali
  const isToday = (date) => {
    const today = new Date();
    const taskDate = new Date(date);
    return today.toDateString() === taskDate.toDateString();
  };

  const isThisWeek = (date) => {
    const today = new Date();
    const taskDate = new Date(date);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return taskDate >= startOfWeek && taskDate <= endOfWeek;
  };

  const isThisMonth = (date) => {
    const today = new Date();
    const taskDate = new Date(date);
    return today.getMonth() === taskDate.getMonth() && today.getFullYear() === taskDate.getFullYear();
  };

  // Funzione per applicare filtri temporali (cumulativi)
  const applyTimeFilters = (taskList) => {
    // Se nessun filtro è attivo, mostra tutte le task (escluse quelle completate)
    if (!activeTimeFilters.today && !activeTimeFilters.thisWeek && !activeTimeFilters.thisMonth) {
      return taskList.filter(task => task.stato !== 'completata');
    }

    return taskList.filter(task => {
      // Escludi sempre le task completate
      if (task.stato === 'completata') return false;

      const matchesToday = activeTimeFilters.today && isToday(task.scadenza);
      const matchesThisWeek = activeTimeFilters.thisWeek && isThisWeek(task.scadenza);
      const matchesThisMonth = activeTimeFilters.thisMonth && isThisMonth(task.scadenza);

      // Logica cumulativa: se più filtri sono attivi, la task deve soddisfare ALMENO UNO
      return matchesToday || matchesThisWeek || matchesThisMonth;
    });
  };

  // Applica filtri temporali alle task
  const filteredTasks = applyTimeFilters(tasks);

  // Group filtered tasks by status
  const filteredTasksByStatus = {
    programmata: filteredTasks.filter(task => task.stato === 'programmata'),
    in_esecuzione: filteredTasks.filter(task => task.stato === 'in_esecuzione'),
    completata: [] // Sempre vuoto perché escludiamo le completate nei filtri
  };

  // Toggle filtro temporale
  const toggleTimeFilter = (filterType) => {
    setActiveTimeFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  // Reset tutti i filtri
  const resetTimeFilters = () => {
    setActiveTimeFilters({
      today: false,
      thisWeek: false,
      thisMonth: false
    });
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

  // IMPLEMENTAZIONE CORRETTA: handleCreateTask
  const handleCreateTask = async (taskData) => {
    console.log('Creating task:', taskData);
    
    // Chiamata corretta all'API (senza .mutateAsync)
    createTask(taskData);
    // Il modal si chiude automaticamente nel componente CreateTaskModal
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
            {/* Time Filters */}
            <div className="flex items-center gap-2 border-r border-gray-300 pr-3">
              <button
                onClick={resetTimeFilters}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  !activeTimeFilters.today && !activeTimeFilters.thisWeek && !activeTimeFilters.thisMonth
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Tutte
              </button>
              
              <button
                onClick={() => toggleTimeFilter('today')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTimeFilters.today
                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Oggi
              </button>
              
              <button
                onClick={() => toggleTimeFilter('thisWeek')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTimeFilters.thisWeek
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Settimana
              </button>
              
              <button
                onClick={() => toggleTimeFilter('thisMonth')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTimeFilters.thisMonth
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Mese
              </button>
            </div>

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
              tasks={filteredTasksByStatus.programmata}
              count={filteredTasksByStatus.programmata.length}
              onAddTask={() => setShowCreateModal(true)} // FIX: Collega sempre al modal
            >
              {filteredTasksByStatus.programmata.map((task) => (
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
              tasks={filteredTasksByStatus.in_esecuzione}
              count={filteredTasksByStatus.in_esecuzione.length}
              onAddTask={() => setShowCreateModal(true)} // FIX: Collega al modal
            >
              {filteredTasksByStatus.in_esecuzione.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  onEdit={handleStatusChange}
                />
              ))}
            </KanbanColumn>
          </div>

          {/* Completate Column - Mostra sempre vuota quando i filtri sono attivi */}
          <div className="w-80 flex-shrink-0">
            <KanbanColumn
              title="Completate"
              status="completata"
              tasks={tasksByStatus.completata} // Usa tasksByStatus originale solo per il conteggio
              count={activeTimeFilters.today || activeTimeFilters.thisWeek || activeTimeFilters.thisMonth ? 0 : tasksByStatus.completata.length}
              onAddTask={() => setShowCreateModal(true)} // FIX: Collega al modal
            >
              {/* Mostra task completate solo se nessun filtro temporale è attivo */}
              {(!activeTimeFilters.today && !activeTimeFilters.thisWeek && !activeTimeFilters.thisMonth) && 
                tasksByStatus.completata.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                  />
                ))
              }
              
              {/* Messaggio quando i filtri temporali sono attivi */}
              {(activeTimeFilters.today || activeTimeFilters.thisWeek || activeTimeFilters.thisMonth) && (
                <div className="text-center text-gray-500 text-sm py-8">
                  <p>Le task completate sono</p>
                  <p>nascoste nei filtri temporali</p>
                </div>
              )}
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

      {/* Create Task Modal - VERSIONE CON FALLBACK */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTask}
      />
    </div> 
  );
};

export default TasksPage;