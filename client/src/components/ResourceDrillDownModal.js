import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderOpen, 
  Building2, 
  Layers, 
  CheckSquare,
  Plus,
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  User
} from 'lucide-react';
import api from '../utils/api';
import CreateAreaModal from './CreateAreaModal';
import CreateActivityModal from './CreateActivityModal';
import CreateTaskModal from './CreateTaskModal';
import CreateProjectModal from './CreateProjectModal';

// ============================================
// COMPONENTE: Breadcrumb Interno
// ============================================
const Breadcrumb = ({ items, onNavigate }) => (
  <div className="flex items-center gap-2 text-sm mb-4">
    {items.map((item, index) => (
      <React.Fragment key={index}>
        {index > 0 && <span className="text-gray-400">/</span>}
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
// COMPONENTE: Card Progetto
// ============================================
const ProjectCard = ({ project, onClick }) => {
  // Calcola percentuale budget
  const budgetPreventivato = parseFloat(project.budget_assegnato || 0);
  const budgetEffettivo = parseFloat(project.budget_effettivo || 0);
  const percentualeBudget = budgetPreventivato > 0 
    ? Math.min(100, (budgetEffettivo / budgetPreventivato) * 100) 
    : 0;
  
  // Determina colore budget
  const getBudgetColor = () => {
    if (budgetEffettivo > budgetPreventivato) return 'bg-red-500'; // Sforato
    if (percentualeBudget > 80) return 'bg-yellow-500'; // Attenzione
    return 'bg-green-500'; // Ok
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 
                 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3 mb-3">
        <FolderOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
            {project.nome}
          </h4>
          {project.descrizione && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.descrizione}</p>
          )}
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3 mb-3">
        {/* Progress Bar Budget */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Budget</span>
            <span className="text-xs font-medium text-gray-900">
              €{budgetEffettivo.toFixed(0)} / €{budgetPreventivato.toFixed(0)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${getBudgetColor()}`}
              style={{ width: `${percentualeBudget}%` }}
            />
          </div>
        </div>

        {/* Progress Bar Ore */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Ore</span>
            <span className="text-xs font-medium text-gray-900">
              {(project.ore_totali_utilizzate / 60).toFixed(0)}h
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="h-1.5 rounded-full transition-all duration-300 bg-blue-500"
              style={{ width: `${Math.min(100, (project.ore_totali_utilizzate / (project.ore_totali_assegnate || 1)) * 100)}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center text-gray-500">
          <Building2 className="w-4 h-4 mr-1" />
          <span>{project.numero_aree || 0} aree</span>
        </div>
        <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
          Click per aree →
        </span>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: Card Area
// ============================================
const AreaCard = ({ area, onClick }) => {
  // Calcola percentuali
  const budgetPreventivato = parseFloat(area.budget_preventivato || 0);
  const budgetEffettivo = parseFloat(area.budget_effettivo || 0);
  const percentualeBudget = budgetPreventivato > 0 
    ? Math.min(100, (budgetEffettivo / budgetPreventivato) * 100) 
    : 0;

  const percentualeCompletamento = parseFloat(area.percentuale_completamento || 0);

  const getBudgetColor = () => {
    if (budgetEffettivo > budgetPreventivato) return 'bg-red-500';
    if (percentualeBudget > 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 
                 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3 mb-3">
        <Building2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-1">
            {area.nome}
          </h4>
          {area.descrizione && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{area.descrizione}</p>
          )}
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3 mb-3">
        {/* Progress Bar Budget */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Budget</span>
            <span className="text-xs font-medium text-gray-900">
              €{budgetEffettivo.toFixed(0)} / €{budgetPreventivato.toFixed(0)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${getBudgetColor()}`}
              style={{ width: `${percentualeBudget}%` }}
            />
          </div>
        </div>

        {/* Progress Bar Task */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Completamento</span>
            <span className="text-xs font-medium text-gray-900">
              {percentualeCompletamento.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                percentualeCompletamento === 100 ? 'bg-green-500' : 
                percentualeCompletamento > 50 ? 'bg-blue-500' : 'bg-blue-400'
              }`}
              style={{ width: `${percentualeCompletamento}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center text-gray-500">
          <Layers className="w-4 h-4 mr-1" />
          <span>{area.numero_attivita || 0} attività</span>
        </div>
        <span className="text-xs text-gray-400 group-hover:text-purple-500 transition-colors">
          Click per attività →
        </span>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: Card Attività
// ============================================
const ActivityCard = ({ activity, onClick }) => {
  // Calcola percentuali
  const budgetPreventivato = parseFloat(activity.budget_preventivato || 0);
  const budgetEffettivo = parseFloat(activity.budget_effettivo || 0);
  const percentualeBudget = budgetPreventivato > 0 
    ? Math.min(100, (budgetEffettivo / budgetPreventivato) * 100) 
    : 0;

  const totaleTask = parseInt(activity.totale_task || activity.numero_task || 0);
  const taskCompletate = parseInt(activity.task_completate || 0);
  const percentualeTask = totaleTask > 0 ? (taskCompletate / totaleTask) * 100 : 0;

  const getBudgetColor = () => {
    if (budgetEffettivo > budgetPreventivato) return 'bg-red-500';
    if (percentualeBudget > 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 
                 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3 mb-3">
        <Layers className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors line-clamp-1">
            {activity.nome}
          </h4>
          {activity.descrizione && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{activity.descrizione}</p>
          )}
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3 mb-3">
        {/* Progress Bar Budget */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Budget</span>
            <span className="text-xs font-medium text-gray-900">
              €{budgetEffettivo.toFixed(0)} / €{budgetPreventivato.toFixed(0)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${getBudgetColor()}`}
              style={{ width: `${percentualeBudget}%` }}
            />
          </div>
        </div>

        {/* Progress Bar Task */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Task</span>
            <span className="text-xs font-medium text-gray-900">
              {taskCompletate}/{totaleTask}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                percentualeTask === 100 ? 'bg-green-500' : 
                percentualeTask > 50 ? 'bg-blue-500' : 'bg-blue-400'
              }`}
              style={{ width: `${percentualeTask}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center text-gray-500">
          <CheckSquare className="w-4 h-4 mr-1" />
          <span>{totaleTask} task</span>
        </div>
        {activity.scadenza && (
          <span className="text-xs text-gray-500">
            <Calendar className="w-3 h-3 inline mr-1" />
            {new Date(activity.scadenza).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: Card Task
// ============================================
const TaskCard = ({ task }) => {
  const getStatusColor = (stato) => {
    switch(stato) {
      case 'completata': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_esecuzione': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Calcola budget
  const budgetPreventivato = parseFloat(task.budget_preventivato || 0);
  const budgetEffettivo = parseFloat(task.budget_effettivo || 0);
  const percentualeBudget = budgetPreventivato > 0 
    ? Math.min(100, (budgetEffettivo / budgetPreventivato) * 100) 
    : 0;

  const getBudgetColor = () => {
    if (task.stato !== 'completata') return 'bg-gray-400'; // Non completata
    if (budgetEffettivo > budgetPreventivato) return 'bg-red-500'; // Sforato
    if (percentualeBudget > 80) return 'bg-yellow-500'; // Attenzione
    return 'bg-green-500'; // Ok
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-all">
      <div className="flex items-start justify-between mb-2">
        <h5 className="font-semibold text-gray-900 line-clamp-1">{task.nome}</h5>
        <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${getStatusColor(task.stato)}`}>
          {task.stato?.replace('_', ' ')}
        </span>
      </div>
      
      {task.descrizione && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.descrizione}</p>
      )}

      {/* Progress Bar Budget */}
      {task.stato === 'completata' && budgetPreventivato > 0 && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Budget</span>
            <span className="text-xs font-medium text-gray-900">
              €{budgetEffettivo.toFixed(0)} / €{budgetPreventivato.toFixed(0)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${getBudgetColor()}`}
              style={{ width: `${percentualeBudget}%` }}
            />
          </div>
        </div>
      )}

      {/* Metriche ore */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span>
            Stimate: {task.ore_stimate}min
          </span>
          {task.ore_effettive && (
            <span className="text-blue-600 font-medium">
              Effettive: {task.ore_effettive}min
            </span>
          )}
        </div>
        {task.scadenza && (
          <span className="whitespace-nowrap">
            <Calendar className="w-3 h-3 inline mr-1" />
            {new Date(task.scadenza).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: Empty State
// ============================================
const EmptyState = ({ icon: Icon, title, description, onCreateClick, buttonText }) => (
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
// COMPONENTE PRINCIPALE: ResourceDrillDownModal
// ============================================
const ResourceDrillDownModal = ({ 
  isOpen, 
  onClose, 
  risorsa, 
  clienteId, 
  clienteNome 
}) => {
  // State per navigazione
  const [currentLevel, setCurrentLevel] = useState('progetti');
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  
  // State per dati
  const [progetti, setProgetti] = useState([]);
  const [aree, setAree] = useState([]);
  const [attivita, setAttivita] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // State per loading
  const [loading, setLoading] = useState(false);

  // Tab attivo
  const [activeTab, setActiveTab] = useState('progetti');

  // State per modal
  const [showCreateAreaModal, setShowCreateAreaModal] = useState(false);
  const [showCreateActivityModal, setShowCreateActivityModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  // Reset quando si apre/chiude
  useEffect(() => {
    if (isOpen) {
      setCurrentLevel('progetti');
      setSelectedProject(null);
      setSelectedArea(null);
      setSelectedActivity(null);
      setActiveTab('progetti');
      loadProgetti();
    }
  }, [isOpen, risorsa?.risorsa_id]);

  // ============================================
  // FUNZIONI CARICAMENTO DATI
  // ============================================
  
  const loadProgetti = async () => {
  console.log('🚀 loadProgetti chiamato!');
  console.log('📊 Dati disponibili:', { 
    clienteId, 
    risorsaId: risorsa?.risorsa_id,
    risorsaNome: risorsa?.risorsa_nome,
    risorsa: risorsa
  });
  
  // ⚠️ CONTROLLO: Se mancano i dati, non fare la chiamata
  if (!clienteId || !risorsa?.risorsa_id) {
    console.error('❌ Dati mancanti! clienteId o risorsa_id non disponibili');
    return;
  }
  
  try {
    setLoading(true);
    const url = `/projects?cliente_id=${clienteId}&risorsa_id=${risorsa.risorsa_id}`;
    console.log('📞 Chiamata API:', url);
    
    const response = await api.get(url);
    
    console.log('✅ Risposta API ricevuta:', response.data);
    
    const allProjects = response.data.projects || [];
    console.log(`📦 Progetti caricati: ${allProjects.length}`);
    
    setProgetti(allProjects);
  } catch (error) {
    console.error('❌ Errore caricamento progetti:', error);
    setProgetti([]);
  } finally {
    setLoading(false);
  }
};

  const loadAree = async (progettoId) => {
    try {
      setLoading(true);
      const response = await api.get(`/aree?progetto_id=${progettoId}`);
      setAree(response.data.aree || response.data.areas || []);
    } catch (error) {
      console.error('Errore caricamento aree:', error);
      setAree([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAttivita = async (areaId) => {
  console.log('🔍 Caricamento attività per area:', areaId);
  
  try {
    setLoading(true);
    const response = await api.get(`/activities?area_id=${areaId}`); // <-- PARENTESI TONDA (
    
    console.log('🔍 Risposta API:', response.data);
    
    const attivitaList = response.data.attivita || response.data.activities || [];
    
    console.log('🔍 Numero attività ricevute:', attivitaList.length);
    
    setAttivita(attivitaList);
  } catch (error) {
    console.error('Errore caricamento attività:', error);
    setAttivita([]);
  } finally {
    setLoading(false);
  }
};

  const loadTasks = async (attivitaId) => {
  try {
    setLoading(true);
    const response = await api.get(`/tasks?attivita_id=${attivitaId}`);
    const tutteLeTasks = response.data.tasks || [];

    console.log('════════════════════════════════════════');
    console.log('🔍 DEBUG TASK FILTER - Attività ID:', attivitaId);
    console.log('🔍 Numero task totali ricevute:', tutteLeTasks.length);
    console.log('🔍 OGGETTO RISORSA COMPLETO:', risorsa);
    console.log('🔍 risorsa.risorsa_id:', risorsa?.risorsa_id);
    
    // Mostra ogni task con il suo utente_assegnato
    tutteLeTasks.forEach((task, idx) => {
      console.log(`📋 Task ${idx + 1}: "${task.nome}"`);
      console.log(`   - ID: ${task.id}`);
      console.log(`   - utente_assegnato: ${task.utente_assegnato}`);
      console.log(`   - Match con risorsa? ${task.utente_assegnato === risorsa?.risorsa_id}`);
    });
    
    // Filtra solo le task assegnate a questa risorsa
    const taskFiltrate = tutteLeTasks.filter(task => {
      const match = task.utente_assegnato === risorsa?.risorsa_id;
      return match;
    });
    
    console.log('✅ Task filtrate per risorsa:', taskFiltrate.length);
    console.log('   Task filtrate:', taskFiltrate.map(t => t.nome));
    console.log('════════════════════════════════════════');
    
    setTasks(taskFiltrate);
  } catch (error) {
    console.error('❌ Errore caricamento task:', error);
    setTasks([]);
  } finally {
    setLoading(false);
  }
};

  const handleCreateProjectSuccess = (newProject) => {
    console.log('Progetto creato con successo:', newProject);
    loadProgetti();
  };

  const handleCreateAreaSuccess = (newArea) => {
    console.log('Area creata con successo:', newArea);
    if (selectedProject) {
      loadAree(selectedProject.id);
    }
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

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setCurrentLevel('aree');
    loadAree(project.id);
  };

  const handleAreaClick = (area) => {
  console.log('🔍 Area selezionata:', area);
  setSelectedArea(area);
  setCurrentLevel('attivita');
  console.log('🔍 Current level impostato a: attivita'); // <-- AGGIUNGI
  loadAttivita(area.id);
};

  const handleActivityClick = (activity) => {
  console.log('🔍 Attività cliccata:', activity); // <-- AGGIUNGI
  setSelectedActivity(activity);
  setCurrentLevel('task');
  loadTasks(activity.id);
  console.log('🔍 loadTasks chiamata con ID:', activity.id); // <-- AGGIUNGI
};

  const handleNavigateBack = (level) => {
    setCurrentLevel(level);
    
    if (level === 'progetti') {
      setSelectedProject(null);
      setSelectedArea(null);
      setSelectedActivity(null);
    } else if (level === 'aree') {
      setSelectedArea(null);
      setSelectedActivity(null);
    } else if (level === 'attivita') {
      setSelectedActivity(null);
    }
  };

  // ============================================
  // BREADCRUMB
  // ============================================

  const getBreadcrumbItems = () => {
    const items = [
      { level: 'progetti', label: 'Progetti' }
    ];

    if (selectedProject) {
      items.push({ level: 'aree', label: selectedProject.nome });
    }
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

  console.log('🔍 Rendering - Current Level:', currentLevel); // <-- AGGIUNGI
  console.log('🔍 Rendering - Selected Area:', selectedArea); // <-- AGGIUNGI


  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{risorsa?.risorsa_nome}</h2>
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
              onClick={() => setActiveTab('progetti')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                activeTab === 'progetti'
                  ? 'bg-white text-blue-600 border-t-2 border-x-2 border-blue-600 -mb-px'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Progetti
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                activeTab === 'info'
                  ? 'bg-white text-blue-600 border-t-2 border-x-2 border-blue-600 -mb-px'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Info Risorsa
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'progetti' ? (
              <>
                {/* Breadcrumb */}
                {currentLevel !== 'progetti' && (
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
                    {/* LIVELLO: PROGETTI */}
                    {currentLevel === 'progetti' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold text-gray-900">
                            Progetti di {risorsa?.risorsa_nome}
                          </h3>
                          <button
                            onClick={() => setShowCreateProjectModal(true)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                                     hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Nuovo Progetto
                          </button>
                        </div>

                        {progetti.length === 0 ? (
                          <EmptyState
                            icon={FolderOpen}
                            title="Nessun progetto"
                            description="Questa risorsa non ha progetti assegnati per questo cliente"
                            buttonText="Crea Primo Progetto"
                          />
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {progetti.map(progetto => (
                              <ProjectCard
                                key={progetto.id}
                                project={progetto}
                                onClick={() => handleProjectClick(progetto)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* LIVELLO: AREE */}
                    {currentLevel === 'aree' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold text-gray-900">
                            Aree di {risorsa?.risorsa_nome} in {selectedProject?.nome}
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
                            description="Questa risorsa non ha aree assegnate in questo progetto"
                            buttonText="Crea Prima Area"
                          />
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {aree.map(area => (
                              <AreaCard
                                key={area.id}
                                area={area}
                                onClick={() => handleAreaClick(area)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* LIVELLO: ATTIVITÀ */}
                    {currentLevel === 'attivita' && (
                      <div>
                        {console.log('🔍 RENDERING SEZIONE ATTIVITÀ')} {/* <-- AGGIUNGI */}
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold text-gray-900">
                            Attività di {risorsa?.risorsa_nome} in {selectedArea?.nome}
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
                            icon={Layers}
                            title="Nessuna attività"
                            description="Questa risorsa non ha attività assegnate in quest'area"
                            buttonText="Crea Prima Attività"
                          />
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {attivita.map(activity => (
                              <ActivityCard
                                key={activity.id}
                                activity={activity}
                                onClick={() => handleActivityClick(activity)}
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
                            Task di {risorsa?.risorsa_nome} in {selectedActivity?.nome}
                          </h3>
                          <button
                            onClick={() => setShowCreateTaskModal(true)}
                            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg 
                                     hover:bg-orange-700 transition-colors"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Nuova Task
                          </button>
                        </div>

                        {tasks.length === 0 ? (
                          <EmptyState
                            icon={CheckSquare}
                            title="Nessuna task"
                            description="Questa risorsa non ha task assegnate in questa attività"
                            buttonText="Crea Prima Task"
                          />
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tasks.map(task => (
                              <TaskCard key={task.id} task={task} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              /* TAB INFO RISORSA */
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">Informazioni Risorsa</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Nome</p>
                    <p className="font-semibold text-gray-900">{risorsa?.risorsa_nome}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Ore Assegnate</p>
                    <p className="font-semibold text-gray-900">{risorsa?.ore_assegnate}h</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Costo Orario Base</p>
                    <p className="font-semibold text-gray-900">
                      €{parseFloat(risorsa?.costo_orario_base || 0).toFixed(2)}/h
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Costo Orario Finale</p>
                    <p className="font-semibold text-blue-600">
                      €{parseFloat(risorsa?.costo_orario_finale || 0).toFixed(2)}/h
                    </p>
                  </div>
                  
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-gray-500">Budget Totale Risorsa</p>
                    <p className="font-semibold text-green-600 text-xl">
                      €{parseFloat(risorsa?.budget_risorsa || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal CreateProject */}
      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        clienteId={clienteId}
        clienteNome={clienteNome}
        onSuccess={handleCreateProjectSuccess}
      />

      {/* Modal CreateArea */}
      {selectedProject && (
        <CreateAreaModal
          isOpen={showCreateAreaModal}
          onClose={() => setShowCreateAreaModal(false)}
          progettoId={selectedProject.id}
          progettoNome={selectedProject.nome}
          onSuccess={handleCreateAreaSuccess}
        />
      )}

      {/* Modal CreateActivity */}
      {selectedArea && (
        <CreateActivityModal
          isOpen={showCreateActivityModal}
          onClose={() => setShowCreateActivityModal(false)}
          areaId={selectedArea.id}
          areaNome={selectedArea.nome}
          progettoId={selectedProject.id}
          clienteId={clienteId}
          onSuccess={handleCreateActivitySuccess}
        />
      )}

      {/* Modal CreateTask */}
      {selectedActivity && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => setShowCreateTaskModal(false)}
          attivitaId={selectedActivity.id}
          attivitaNome={selectedActivity.nome}
          onSuccess={handleCreateTaskSuccess}
        />
      )}
    </>
  );
};

export default ResourceDrillDownModal;