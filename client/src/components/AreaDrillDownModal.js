import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  ListTodo, 
  CheckSquare,
  Plus,
  ChevronRight,
  User,
  Calendar,
  Clock,
  Users,
  DollarSign
} from 'lucide-react';
import api from '../utils/api';
import CreateActivityModal from './CreateActivityModal';
import CreateTaskModal from './CreateTaskModal';

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
        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg 
                 hover:bg-green-700 transition-colors"
      >
        <Plus className="w-4 h-4 mr-2" />
        {buttonText}
      </button>
    )}
  </div>
);

// ============================================
// COMPONENTE: Card Attività
// ============================================
const ActivityCard = ({ activity, onClick }) => {
  // Calcola percentuali budget
  const budgetTotale = parseFloat(activity.budget_assegnato || 0);
  const budgetUtilizzato = parseFloat(activity.budget_utilizzato || 0);
  const percentualeBudget = budgetTotale > 0 ? Math.min(100, (budgetUtilizzato / budgetTotale) * 100) : 0;

  // Calcola percentuale ore
  const oreStimate = parseFloat(activity.ore_stimate || 0);
  const oreEffettive = parseFloat(activity.ore_effettive || 0);
  const percentualeOre = oreStimate > 0 ? Math.min(100, (oreEffettive / oreStimate) * 100) : 0;

  const getBudgetColor = () => {
    if (percentualeBudget >= 100) return 'bg-red-500';
    if (percentualeBudget >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-green-300 
                 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3 mb-3">
        <ListTodo className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
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
      <div className="space-y-2 mb-3">
        {/* Progress Bar Budget */}
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

        {/* Progress Bar Ore */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Ore</span>
            <span className="text-xs font-medium text-gray-900">
              {(oreEffettive / 60).toFixed(1)}h / {(oreStimate / 60).toFixed(1)}h
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
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center text-gray-500">
          <CheckSquare className="w-4 h-4 mr-1" />
          <span>{activity.numero_task || 0} task</span>
        </div>
        <span className="text-xs text-gray-400 group-hover:text-green-500 transition-colors">
          Click per task →
        </span>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: Card Task
// ============================================
const TaskCard = ({ task }) => {
  const getStatoColor = (stato) => {
    switch (stato) {
      case 'completata': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_esecuzione': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatoLabel = (stato) => {
    switch (stato) {
      case 'completata': return 'Completata';
      case 'in_esecuzione': return 'In Esecuzione';
      case 'programmata': return 'Programmata';
      default: return stato || 'N/D';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <CheckSquare className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 line-clamp-1">
              {task.nome}
            </h4>
            {task.descrizione && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.descrizione}</p>
            )}
          </div>
        </div>
        
        <span className={`px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ml-2 ${getStatoColor(task.stato)}`}>
          {getStatoLabel(task.stato)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs text-gray-500 mb-1">Assegnata a</div>
          <div className="flex items-center text-gray-900">
            <User className="w-3 h-3 mr-1" />
            <span className="text-xs truncate">{task.utente_nome || 'Non assegnata'}</span>
          </div>
        </div>
        
        <div>
          <div className="text-xs text-gray-500 mb-1">Scadenza</div>
          <div className="flex items-center text-gray-900">
            <Calendar className="w-3 h-3 mr-1" />
            <span className="text-xs">
              {task.scadenza ? new Date(task.scadenza).toLocaleDateString('it-IT') : 'N/D'}
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1">Ore</div>
          <div className="flex items-center text-gray-900">
            <Clock className="w-3 h-3 mr-1" />
            <span className="text-xs">
              {task.ore_effettive ? `${(task.ore_effettive / 60).toFixed(1)}h` : 
               task.ore_stimate ? `~${(task.ore_stimate / 60).toFixed(1)}h` : 'N/D'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPALE: AreaDrillDownModal
// ============================================
const AreaDrillDownModal = ({ 
  isOpen, 
  onClose, 
  area,
  progettoNome,
  clienteNome
}) => {
  // State per navigazione
  const [currentLevel, setCurrentLevel] = useState('attivita');
  const [selectedActivity, setSelectedActivity] = useState(null);
  
  // State per dati
  const [attivita, setAttivita] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // State per loading
  const [loading, setLoading] = useState(false);

  // Tab attivo
  const [activeTab, setActiveTab] = useState('navigazione');

  // State per modal
  const [showCreateActivityModal, setShowCreateActivityModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  // Reset quando si apre/chiude
  useEffect(() => {
    if (isOpen && area) {
      setCurrentLevel('attivita');
      setSelectedActivity(null);
      loadAttivita();
    }
  }, [isOpen, area?.id]);

  // ============================================
  // FUNZIONI CARICAMENTO DATI
  // ============================================
  
  const loadAttivita = async () => {
  if (!area?.id) {
    console.error('❌ Area ID mancante!');
    return;
  }

  // 🆕 DEBUG: Verifica oggetto area
  console.log('🔍 DEBUG Area completa:', area);
  console.log('🔍 area.progetto_id:', area.progetto_id);

  try {
    setLoading(true);
    console.log('📊 Caricamento attività per area:', area.id);
    
    // ✅ CORRETTO: Usa api.get direttamente
    const response = await api.get(`/activities?area_id=${area.id}`);
    const attivitaData = response.data.activities || response.data.attivita || [];
    
    console.log(`✅ ${attivitaData.length} attività caricate`);
    setAttivita(attivitaData);
    
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
    console.log('📊 Caricamento task per attività:', attivitaId);
    
    // ✅ CORRETTO: Usa api.get direttamente
    const response = await api.get(`/tasks?attivita_id=${attivitaId}`);
    const tasksData = response.data.tasks || [];
    
    console.log(`✅ ${tasksData.length} task caricate`);
    setTasks(tasksData);
    
  } catch (error) {
    console.error('❌ Errore caricamento task:', error);
    setTasks([]);
  } finally {
    setLoading(false);
  }
};

  // ============================================
  // HANDLER SUCCESS CREAZIONE
  // ============================================

  const handleCreateActivitySuccess = (newActivity) => {
    console.log('Attività creata con successo:', newActivity);
    loadAttivita();
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

  const handleActivityClick = (activity) => {
    console.log('🔍 Attività selezionata:', activity);
    setSelectedActivity(activity);
    setCurrentLevel('task');
    loadTasks(activity.id);
  };

  const handleNavigateBack = (level) => {
    setCurrentLevel(level);
    
    if (level === 'attivita') {
      setSelectedActivity(null);
    }
  };

  // ============================================
  // BREADCRUMB
  // ============================================

  const getBreadcrumbItems = () => {
    const items = [
      { level: 'attivita', label: area?.nome || 'Area' }
    ];

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
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{area?.nome}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {clienteNome} › {progettoNome}
                </p>
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
                  ? 'bg-white text-purple-600 border-t-2 border-x-2 border-purple-600 -mb-px'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Navigazione
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                activeTab === 'info'
                  ? 'bg-white text-purple-600 border-t-2 border-x-2 border-purple-600 -mb-px'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Info Area
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'navigazione' ? (
              <>
                {/* Breadcrumb */}
                {currentLevel !== 'attivita' && (
                  <Breadcrumb 
                    items={getBreadcrumbItems()} 
                    onNavigate={handleNavigateBack}
                  />
                )}

                {/* Loading */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* LIVELLO: ATTIVITÀ */}
                    {currentLevel === 'attivita' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold text-gray-900">
                            Attività dell'Area
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
                            description="Inizia creando la prima attività per questa area"
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
                            Task di "{selectedActivity?.nome}"
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
                            description="Crea la prima task per questa attività"
                            buttonText="Crea Prima Task"
                            onCreateClick={() => setShowCreateTaskModal(true)}
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
              /* TAB INFO AREA */
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informazioni Area</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Budget Assegnato</p>
                      <p className="text-xl font-bold text-gray-900">
                        €{parseFloat(area?.budget_assegnato || 0).toFixed(0)}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Budget Utilizzato</p>
                      <p className="text-xl font-bold text-gray-900">
                        €{parseFloat(area?.budget_utilizzato || 0).toFixed(0)}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Ore Stimate</p>
                      <p className="text-xl font-bold text-gray-900">
                        {(parseFloat(area?.ore_stimate || 0) / 60).toFixed(1)}h
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Ore Effettive</p>
                      <p className="text-xl font-bold text-gray-900">
                        {(parseFloat(area?.ore_effettive || 0) / 60).toFixed(1)}h
                      </p>
                    </div>
                  </div>

                  {area?.descrizione && (
                    <div className="mt-6 pt-6 border-t border-purple-200">
                      <p className="text-sm text-gray-500 mb-2">Descrizione</p>
                      <p className="text-gray-900">{area.descrizione}</p>
                    </div>
                  )}
                </div>

                {/* Statistiche */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <ListTodo className="w-5 h-5 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Attività</h4>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{area?.numero_attivita || 0}</p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <CheckSquare className="w-5 h-5 text-orange-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Task Totali</h4>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{area?.numero_task || 0}</p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">Risorse</h4>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{area?.numero_risorse || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Creazione Attività */}
      <CreateActivityModal
        isOpen={showCreateActivityModal}
        onClose={() => setShowCreateActivityModal(false)}
        progettoId={area?.progetto_id}  // 🆕 AGGIUNGI QUESTA RIGA
        areaId={area?.id}
        areaNome={area?.nome}
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
    </>
  );
};

export default AreaDrillDownModal;