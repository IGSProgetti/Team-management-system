import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderOpen, 
  Building2, 
  ListTodo, 
  CheckSquare,
  Plus,
  ChevronRight,
  User,
  Calendar,
  Clock,
  Users
} from 'lucide-react';
import api from '../utils/api';
import CreateAreaModal from './CreateAreaModal';
import CreateActivityModal from './CreateActivityModal';
import CreateTaskModal from './CreateTaskModal';
import ResourceDrillDownModal from './ResourceDrillDownModal';

// ============================================
// COMPONENTE: Breadcrumb
// ============================================
const Breadcrumb = ({ items, onNavigate }) => (
  <div className="flex items-center gap-2 text-sm mb-6 flex-wrap">
    {items.map((item, index) => (
      <React.Fragment key={item.level}>
        {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
        {index < items.length - 1 ? (
          <button
            onClick={() => onNavigate(item.level)}
            className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
          >
            {item.label}
          </button>
        ) : (
          <span className="text-gray-600 font-medium">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </div>
);

// ============================================
// COMPONENTE: Empty State
// ============================================
const EmptyState = ({ icon: Icon, title, description, buttonText, onCreateClick }) => (
  <div className="text-center py-12">
    <Icon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 mb-6">{description}</p>
    {onCreateClick && (
      <button
        onClick={onCreateClick}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                 hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4 mr-2" />
        {buttonText}
      </button>
    )}
  </div>
);

// ============================================
// COMPONENTE: Card Area
// ============================================
const AreaCard = ({ area, onClick, onResourceClick }) => {
  const handleCardClick = (e) => {
    // Se clicco sulla card (non su una risorsa), navigo alle attività
    if (!e.target.closest('.resource-item')) {
      onClick();
    }
  };

  const handleResourceClick = (e, risorsa) => {
    e.stopPropagation(); // Previene il click sulla card
    onResourceClick(risorsa);
  };

  // Calcola percentuali budget
const budgetTotale = parseFloat(area.budget_assegnato || 0);
const budgetUtilizzato = parseFloat(area.budget_effettivo || 0); // ✅ CORRETTO: budget_effettivo invece di budget_utilizzato
  const percentualeBudget = budgetTotale > 0 ? Math.min(100, (budgetUtilizzato / budgetTotale) * 100) : 0;

  // Calcola percentuale ore - CONVERTI DA MINUTI A ORE
const oreStimate = parseFloat(area.ore_stimate || 0) / 60; // ✅ Converti minuti in ore
const oreEffettive = parseFloat(area.ore_effettive_calcolate || 0) / 60; // ✅ Converti minuti in ore
  const percentualeOre = oreStimate > 0 ? Math.min(100, (oreEffettive / oreStimate) * 100) : 0;

  const getBudgetColor = () => {
    if (budgetUtilizzato > budgetTotale) return 'bg-red-500';
    if (percentualeBudget > 80) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 
                 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3 mb-3">
        <Building2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
            {area.nome}
          </h4>
          {area.descrizione && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{area.descrizione}</p>
          )}
        </div>
      </div>
      
      {/* Barre di progresso */}
      <div className="space-y-2 mb-3">
        {/* Barra Budget */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Budget</span>
            <span className="text-xs font-medium text-gray-900">
              €{budgetUtilizzato.toFixed(0)} / €{budgetTotale.toFixed(0)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${getBudgetColor()}`}
              style={{ width: `${percentualeBudget}%` }}
            />
          </div>
        </div>

        {/* Barra Ore */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Ore</span>
            <span className="text-xs font-medium text-gray-900">
  {oreEffettive.toFixed(1)}h / {oreStimate.toFixed(1)}h
</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="h-1.5 rounded-full transition-all duration-300 bg-blue-500"
              style={{ width: `${percentualeOre}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Risorse assegnate */}
      {area.risorse && area.risorse.length > 0 && (
        <div className="mb-3 pb-3 border-b border-gray-100">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" />
            Risorse ({area.risorse.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {area.risorse.slice(0, 3).map((risorsa) => (
              <button
                key={risorsa.id}
                onClick={(e) => handleResourceClick(e, risorsa)}
                className="resource-item inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 
                         rounded text-xs hover:bg-blue-100 transition-colors"
                title={`Click per vedere ${risorsa.nome}`}
              >
                <User className="w-3 h-3" />
                {risorsa.nome}
              </button>
            ))}
            {area.risorse.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                +{area.risorse.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center text-gray-500">
          <ListTodo className="w-4 h-4 mr-1" />
          <span>{area.numero_attivita || 0} attività</span>
        </div>
        <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
          Click per attività →
        </span>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: Card Attività
// ============================================
const ActivityCard = ({ activity, onClick, onResourceClick }) => {
  const handleCardClick = (e) => {
    if (!e.target.closest('.resource-item')) {
      onClick();
    }
  };

  const handleResourceClick = (e, risorsa) => {
    e.stopPropagation();
    onResourceClick(risorsa);
  };

  // Calcola percentuali budget
const budgetTotale = parseFloat(activity.budget_assegnato || 0);
const budgetUtilizzato = parseFloat(activity.budget_effettivo || 0); // ✅ CORRETTO: budget_effettivo invece di budget_utilizzato
  const percentualeBudget = budgetTotale > 0 ? Math.min(100, (budgetUtilizzato / budgetTotale) * 100) : 0;

  // Calcola percentuale ore - CONVERTI DA MINUTI A ORE
const oreStimate = parseFloat(activity.ore_stimate || 0) / 60; // ✅ Converti minuti in ore
const oreEffettive = parseFloat(activity.ore_effettive || 0) / 60; // ✅ Converti minuti in ore
  const percentualeOre = oreStimate > 0 ? Math.min(100, (oreEffettive / oreStimate) * 100) : 0;

  const getBudgetColor = () => {
    if (budgetUtilizzato > budgetTotale) return 'bg-red-500';
    if (percentualeBudget > 80) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 
                 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3 mb-3">
        <ListTodo className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
            {activity.nome}
          </h4>
          {activity.descrizione && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{activity.descrizione}</p>
          )}
        </div>
      </div>

      {/* Barre di progresso */}
      <div className="space-y-2 mb-3">
        {/* Barra Budget */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Budget</span>
            <span className="text-xs font-medium text-gray-900">
              €{budgetUtilizzato.toFixed(0)} / €{budgetTotale.toFixed(0)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${getBudgetColor()}`}
              style={{ width: `${percentualeBudget}%` }}
            />
          </div>
        </div>

        {/* Barra Ore */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Ore</span>
            <span className="text-xs font-medium text-gray-900">
              {oreEffettive.toFixed(1)}h / {oreStimate.toFixed(1)}h
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="h-1.5 rounded-full transition-all duration-300 bg-blue-500"
              style={{ width: `${percentualeOre}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Risorse assegnate */}
      {activity.risorse && activity.risorse.length > 0 && (
        <div className="mb-3 pb-3 border-b border-gray-100">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" />
            Risorse ({activity.risorse.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {activity.risorse.slice(0, 3).map((risorsa) => (
              <button
                key={risorsa.id}
                onClick={(e) => handleResourceClick(e, risorsa)}
                className="resource-item inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 
                         rounded text-xs hover:bg-blue-100 transition-colors"
                title={`Click per vedere ${risorsa.nome}`}
              >
                <User className="w-3 h-3" />
                {risorsa.nome}
              </button>
            ))}
            {activity.risorse.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                +{activity.risorse.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center text-gray-500">
            <CheckSquare className="w-4 h-4 mr-1" />
            <span>{activity.numero_task || 0} task</span>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            activity.stato === 'completata' ? 'bg-green-100 text-green-700' :
            activity.stato === 'in_esecuzione' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {activity.stato}
          </span>
        </div>
        <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
          Click per task →
        </span>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: Card Task
// ============================================
const TaskCard = ({ task, onResourceClick }) => {
  const handleResourceClick = (e) => {
    e.stopPropagation();
    if (task.utente_id && task.utente_nome) {
      onResourceClick({
        id: task.utente_id,
        nome: task.utente_nome
      });
    }
  };

  // 🆕 AGGIUNGI QUESTA FUNZIONE
  const formatOre = (minuti) => {
    if (minuti < 60) {
      return `${Math.round(minuti)}min`;
    } else {
      const ore = minuti / 60;
      return `${ore.toFixed(1)}h`;
    }
  };

  // 🔄 MODIFICA: tieni i valori in MINUTI (non dividere per 60)
  const oreStimate = parseFloat(task.ore_stimate || 0);
  const oreEffettive = parseFloat(task.ore_effettive || 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start gap-3 mb-3">
        <CheckSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 line-clamp-1">
            {task.nome}
          </h4>
          {task.descrizione && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.descrizione}</p>
          )}
        </div>
      </div>

      {/* Info Ore con barra visiva se task completata */}
      {oreStimate > 0 && (
        <div className="mb-3 pb-3 border-b border-gray-100">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Ore</span>
            <span className="text-xs font-medium text-gray-900">
  {task.stato === 'completata' && oreEffettive > 0 
    ? `${formatOre(oreEffettive)} / ${formatOre(oreStimate)}`
    : `${formatOre(oreStimate)} stimate`
  }
</span>
          </div>
          {task.stato === 'completata' && oreEffettive > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  oreEffettive > oreStimate ? 'bg-red-500' : 
                  oreEffettive > oreStimate * 0.8 ? 'bg-orange-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (oreEffettive / oreStimate) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}
      
      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
        {task.utente_nome && (
          <button
            onClick={handleResourceClick}
            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded 
                     hover:bg-blue-100 transition-colors"
            title={`Click per vedere ${task.utente_nome}`}
          >
            <User className="w-4 h-4" />
            <span>{task.utente_nome}</span>
          </button>
        )}
        {task.data_scadenza && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(task.data_scadenza).toLocaleDateString('it-IT')}</span>
          </div>
        )}
        <span className={`px-2 py-1 rounded text-xs font-medium ml-auto ${
          task.stato === 'completata' ? 'bg-green-100 text-green-700' :
          task.stato === 'in_esecuzione' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {task.stato}
        </span>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPALE: ProjectDrillDownModal
// ============================================
const ProjectDrillDownModal = ({ 
  isOpen, 
  onClose, 
  progetto,
  clienteId, 
  clienteNome 
}) => {
  // State per navigazione
  const [currentLevel, setCurrentLevel] = useState('aree');
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  
  // State per dati
  const [aree, setAree] = useState([]);
  const [attivita, setAttivita] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // State per loading
  const [loading, setLoading] = useState(false);

  // Tab attivo
  const [activeTab, setActiveTab] = useState('navigazione');

  // State per modal
  const [showCreateAreaModal, setShowCreateAreaModal] = useState(false);
  const [showCreateActivityModal, setShowCreateActivityModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  // State per ResourceDrillDownModal (apertura sopra questo modal)
  const [selectedRisorsa, setSelectedRisorsa] = useState(null);
  const [showResourceModal, setShowResourceModal] = useState(false);

  // Reset quando si apre/chiude
  useEffect(() => {
    if (isOpen && progetto) {
      setCurrentLevel('aree');
      setSelectedArea(null);
      setSelectedActivity(null);
      loadAree();
    }
  }, [isOpen, progetto?.id]);

  // ============================================
  // FUNZIONI CARICAMENTO DATI
  // ============================================
  
  const loadAree = async () => {
    if (!progetto?.id) {
      console.error('❌ Progetto ID mancante!');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Caricamento aree per progetto:', progetto.id);
      
      const response = await api.get(`/aree?progetto_id=${progetto.id}`);
      const areeList = response.data.aree || response.data.areas || [];
      
      console.log('✅ Aree caricate:', areeList.length);
      setAree(areeList);
    } catch (error) {
      console.error('❌ Errore caricamento aree:', error);
      setAree([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAttivita = async (areaId) => {
    try {
      setLoading(true);
      console.log('🔍 Caricamento attività per area:', areaId);
      
      const response = await api.get(`/activities?area_id=${areaId}`);
      const attivitaList = response.data.attivita || response.data.activities || [];
      
      console.log('✅ Attività caricate:', attivitaList.length);
      setAttivita(attivitaList);
    } catch (error) {
      console.error('❌ Errore caricamento attività:', error);
      setAttivita([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (attivitaId) => {
    try {
      setLoading(true);
      console.log('🔍 Caricamento task per attività:', attivitaId);
      
      const response = await api.get(`/tasks?attivita_id=${attivitaId}`);
      const tasksList = response.data.tasks || [];
      
      console.log('✅ Task caricate:', tasksList.length);
      setTasks(tasksList);
    } catch (error) {
      console.error('❌ Errore caricamento task:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // HANDLERS SUCCESS MODAL
  // ============================================

  const handleCreateAreaSuccess = (newArea) => {
    console.log('Area creata con successo:', newArea);
    loadAree();
  };

  const handleCreateActivitySuccess = (newActivity) => {
    console.log('Attività creata con successo:', newActivity);
    if (selectedArea) {
      loadAttivita(selectedArea.id);
    }
  };

  const handleCreateTaskSuccess = (newTask) => {
    console.log('Task creata con successo:', newTask);
    if (selectedActivity) {
      loadTasks(selectedActivity.id);
    }
  };

  // ============================================
  // FUNZIONI NAVIGAZIONE
  // ============================================

  const handleAreaClick = (area) => {
    console.log('🔍 Area selezionata:', area);
    setSelectedArea(area);
    setCurrentLevel('attivita');
    loadAttivita(area.id);
  };

  const handleActivityClick = (activity) => {
    console.log('🔍 Attività cliccata:', activity);
    setSelectedActivity(activity);
    setCurrentLevel('task');
    loadTasks(activity.id);
  };

  const handleNavigateBack = (level) => {
    setCurrentLevel(level);
    
    if (level === 'aree') {
      setSelectedArea(null);
      setSelectedActivity(null);
    } else if (level === 'attivita') {
      setSelectedActivity(null);
    }
  };

  // ============================================
  // HANDLER APERTURA RESOURCE MODAL
  // ============================================

  const handleResourceClick = (risorsa) => {
    console.log('🔍 Risorsa cliccata:', risorsa);
    // Prepara l'oggetto risorsa nel formato atteso da ResourceDrillDownModal
    setSelectedRisorsa({
      risorsa_id: risorsa.id,
      risorsa_nome: risorsa.nome
    });
    setShowResourceModal(true);
  };

  // ============================================
  // BREADCRUMB
  // ============================================

  const getBreadcrumbItems = () => {
    const items = [
      { level: 'aree', label: progetto?.nome || 'Progetto' }
    ];

    if (selectedArea) {
      items.push({ level: 'attivita', label: selectedArea.nome });
    }
    if (selectedActivity) {
      items.push({ level: 'task', label: selectedActivity.nome });
    }

    return items;
  };

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <FolderOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{progetto?.nome}</h2>
                <p className="text-sm text-gray-600 mt-1">Cliente: {clienteNome}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 px-6 pt-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('navigazione')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                activeTab === 'navigazione'
                  ? 'bg-white text-blue-600 border-t-2 border-x-2 border-blue-600 -mb-px'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Navigazione
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                activeTab === 'info'
                  ? 'bg-white text-blue-600 border-t-2 border-x-2 border-blue-600 -mb-px'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Info Progetto
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'navigazione' ? (
              <>
                {/* Breadcrumb */}
                {currentLevel !== 'aree' && (
                  <Breadcrumb 
                    items={getBreadcrumbItems()} 
                    onNavigate={handleNavigateBack}
                  />
                )}

                {/* Loading */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* LIVELLO: AREE */}
                    {currentLevel === 'aree' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold text-gray-900">
                            Aree del Progetto
                          </h3>
                          <button
                            onClick={() => setShowCreateAreaModal(true)}
                            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg 
                                     hover:bg-purple-700 transition-colors"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Nuova Area
                          </button>
                        </div>

                        {aree.length === 0 ? (
                          <EmptyState
                            icon={Building2}
                            title="Nessuna area"
                            description="Crea la prima area per questo progetto"
                            buttonText="Crea Prima Area"
                            onCreateClick={() => setShowCreateAreaModal(true)}
                          />
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {aree.map(area => (
                              <AreaCard
                                key={area.id}
                                area={area}
                                onClick={() => handleAreaClick(area)}
                                onResourceClick={handleResourceClick}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* LIVELLO: ATTIVITÀ */}
                    {currentLevel === 'attivita' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold text-gray-900">
                            Attività dell'Area: {selectedArea?.nome}
                          </h3>
                          <button
                            onClick={() => setShowCreateActivityModal(true)}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg 
                                     hover:bg-green-700 transition-colors"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Nuova Attività
                          </button>
                        </div>

                        {attivita.length === 0 ? (
                          <EmptyState
                            icon={ListTodo}
                            title="Nessuna attività"
                            description="Crea la prima attività per questa area"
                            buttonText="Crea Prima Attività"
                            onCreateClick={() => setShowCreateActivityModal(true)}
                          />
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {attivita.map(activity => (
                              <ActivityCard
                                key={activity.id}
                                activity={activity}
                                onClick={() => handleActivityClick(activity)}
                                onResourceClick={handleResourceClick}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* LIVELLO: TASK */}
                    {currentLevel === 'task' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold text-gray-900">
                            Task dell'Attività: {selectedActivity?.nome}
                          </h3>
                          <button
                            onClick={() => setShowCreateTaskModal(true)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                                     hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Nuova Task
                          </button>
                        </div>

                        {tasks.length === 0 ? (
                          <EmptyState
                            icon={CheckSquare}
                            title="Nessuna task"
                            description="Crea la prima task per questa attività"
                            buttonText="Crea Prima Task"
                            onCreateClick={() => setShowCreateTaskModal(true)}
                          />
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tasks.map(task => (
                              <TaskCard 
                                key={task.id} 
                                task={task}
                                onResourceClick={handleResourceClick}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              /* TAB INFO PROGETTO */
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">Informazioni Progetto</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome Progetto */}
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Nome Progetto</p>
                    <p className="font-semibold text-gray-900">{progetto?.nome}</p>
                  </div>
                  
                  {/* Descrizione */}
                  {progetto?.descrizione && (
                    <div className="space-y-1 col-span-2">
                      <p className="text-sm text-gray-500">Descrizione</p>
                      <p className="text-gray-900">{progetto.descrizione}</p>
                    </div>
                  )}
                  
                  {/* Budget Section */}
                  <div className="col-span-2 pt-4 border-t">
                    <h4 className="font-semibold text-gray-900 mb-4">💰 Budget</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Budget Assegnato</p>
                        <p className="font-semibold text-gray-900 text-lg">
                          €{parseFloat(progetto?.budget_assegnato || 0).toLocaleString('it-IT', {minimumFractionDigits: 2})}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Budget Utilizzato</p>
                        <p className="font-semibold text-orange-600 text-lg">
                          €{parseFloat(progetto?.budget_utilizzato || 0).toLocaleString('it-IT', {minimumFractionDigits: 2})}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Budget Disponibile</p>
                        <p className="font-semibold text-green-600 text-lg">
                          €{(parseFloat(progetto?.budget_assegnato || 0) - parseFloat(progetto?.budget_utilizzato || 0)).toLocaleString('it-IT', {minimumFractionDigits: 2})}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ore Section */}
                  <div className="col-span-2 pt-4 border-t">
                    <h4 className="font-semibold text-gray-900 mb-4">⏰ Ore</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Ore Stimate</p>
                        <p className="font-semibold text-gray-900 text-lg">
                          {parseFloat(progetto?.ore_stimate || 0).toFixed(1)}h
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Ore Effettive</p>
                        <p className="font-semibold text-blue-600 text-lg">
                          {parseFloat(progetto?.ore_effettive || 0).toFixed(1)}h
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Differenza</p>
                        <p className={`font-semibold text-lg ${
                          (parseFloat(progetto?.ore_stimate || 0) - parseFloat(progetto?.ore_effettive || 0)) >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {(parseFloat(progetto?.ore_stimate || 0) - parseFloat(progetto?.ore_effettive || 0)) >= 0 ? '+' : ''}
                          {(parseFloat(progetto?.ore_stimate || 0) - parseFloat(progetto?.ore_effettive || 0)).toFixed(1)}h
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats aggiuntive */}
                  <div className="col-span-2 pt-4 border-t">
                    <h4 className="font-semibold text-gray-900 mb-4">📊 Statistiche</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Aree</p>
                        <p className="font-semibold text-gray-900">{progetto?.numero_aree || 0}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Attività</p>
                        <p className="font-semibold text-gray-900">{progetto?.numero_attivita || 0}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Task</p>
                        <p className="font-semibold text-gray-900">{progetto?.numero_task || 0}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Risorse</p>
                        <p className="font-semibold text-gray-900">{progetto?.numero_risorse || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Creazione Area */}
      <CreateAreaModal
        isOpen={showCreateAreaModal}
        onClose={() => setShowCreateAreaModal(false)}
        progettoId={progetto?.id}
        progettoNome={progetto?.nome}
        onSuccess={handleCreateAreaSuccess}
      />

      {/* Modal Creazione Attività */}
      <CreateActivityModal
        isOpen={showCreateActivityModal}
        onClose={() => setShowCreateActivityModal(false)}
        areaId={selectedArea?.id}
        areaNome={selectedArea?.nome}
        onSuccess={handleCreateActivitySuccess}
      />

      {/* Modal Creazione Task */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        attivitaId={selectedActivity?.id}
        attivitaNome={selectedActivity?.nome}
        onSuccess={handleCreateTaskSuccess}
      />

      {/* ResourceDrillDownModal - Si apre SOPRA questo modal con z-index più alto */}
      {showResourceModal && (
        <div style={{ zIndex: 60 }}>
          <ResourceDrillDownModal
            isOpen={showResourceModal}
            onClose={() => {
              setShowResourceModal(false);
              setSelectedRisorsa(null);
            }}
            risorsa={selectedRisorsa}
            clienteId={clienteId}
            clienteNome={clienteNome}
          />
        </div>
      )}
    </>
  );
};

export default ProjectDrillDownModal;