import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Calendar, 
  CheckSquare, 
  Briefcase, 
  Clock,
  Plus,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  User,
  Target,
  Folder,
  FileText
} from 'lucide-react';
import { 
  formatDate, 
  formatMinutesToHours, 
  getWeekDates,
  isOverdue,
  getStatusColor,
  getStatusText
} from '../../utils/helpers';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Configurazione axios con auth
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor per aggiungere token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper per date mensili
const getCurrentMonthDates = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  firstDay.setHours(0, 0, 0, 0);
  
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  lastDay.setHours(23, 59, 59, 999);
  
  return { start: firstDay, end: lastDay };
};

const getMonthName = (date = new Date()) => {
  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  return months[date.getMonth()];
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [weekTasks, setWeekTasks] = useState([]);
  const [monthTasks, setMonthTasks] = useState([]);
  const [monthBonus, setMonthBonus] = useState([]); // BONUS REALI DAL DATABASE
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedClients, setExpandedClients] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch user info
      const userResponse = await apiClient.get('/api/users/profile');
      setUser(userResponse.data.user);

      // 2. Fetch week tasks (per la sezione task)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 7);
      
      const weekDates = getWeekDates();
      const weekParams = {
        scadenza_da: weekStart.toISOString(),
        scadenza_a: weekDates.end.toISOString()
      };
      
      const weekResponse = await apiClient.get('/api/tasks', { params: weekParams });
      setWeekTasks(weekResponse.data.tasks || []);

      // 3. Fetch month tasks (per ore mensili)
      const monthDates = getCurrentMonthDates();
      const monthParams = {
        scadenza_da: monthDates.start.toISOString(),
        scadenza_a: monthDates.end.toISOString()
      };
      
      const monthResponse = await apiClient.get('/api/tasks', { params: monthParams });
      setMonthTasks(monthResponse.data.tasks || []);

      // 4. FETCH BONUS REALI DAL DATABASE
      const bonusParams = {
        data_da: monthDates.start.toISOString(),
        data_a: monthDates.end.toISOString()
      };
      
      const bonusResponse = await apiClient.get('/api/budget-control-advanced/overview', { 
        params: bonusParams 
      });
      
      // Filtra solo i bonus della risorsa loggata
      const myBonus = bonusResponse.data.task?.filter(
        t => t.utente_assegnato === userResponse.data.user.id && t.bonus_id
      ) || [];
      
      setMonthBonus(myBonus);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Errore nel caricamento dei dati');
      setLoading(false);
    }
  };

  // Classifica e ordina task per scadenza (SETTIMANA)
  const getClassifiedTasks = () => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const classified = {
      overdue: [],
      today: [],
      upcoming: []
    };

    weekTasks.forEach(task => {
      if (!task.scadenza) {
        classified.upcoming.push(task);
        return;
      }

      const scadenza = new Date(task.scadenza);

      if (scadenza < today && task.stato !== 'completata') {
        classified.overdue.push(task);
      } else if (scadenza >= today && scadenza <= todayEnd) {
        classified.today.push(task);
      } else {
        classified.upcoming.push(task);
      }
    });

    const sortByDate = (a, b) => new Date(a.scadenza) - new Date(b.scadenza);
    classified.overdue.sort(sortByDate);
    classified.today.sort(sortByDate);
    classified.upcoming.sort(sortByDate);

    return classified;
  };

  // Calcola ore settimanali (LAVORATE + ASSEGNATE)
  const calculateWeekHours = () => {
    const minutesWorked = weekTasks
      .filter(task => task.stato === 'completata')
      .reduce((sum, task) => sum + (task.ore_effettive || 0), 0);

    const minutesAssigned = weekTasks.reduce((sum, task) => {
      return sum + (task.ore_stimate || 0);
    }, 0);

    const hoursWorked = minutesWorked / 60;
    const hoursAssigned = minutesAssigned / 60;
    const weeklyTarget = 40;

    const percentageWorked = hoursWorked > 0 ? Math.round((hoursWorked / weeklyTarget) * 100) : 0;
    const percentageAssigned = hoursAssigned > 0 ? Math.round((hoursAssigned / weeklyTarget) * 100) : 0;

    return {
      worked: {
        hours: hoursWorked,
        minutes: minutesWorked,
        percentage: percentageWorked
      },
      assigned: {
        hours: hoursAssigned,
        minutes: minutesAssigned,
        percentage: percentageAssigned
      },
      target: weeklyTarget
    };
  };

  // Calcola ore MENSILI
  const calculateMonthHours = () => {
    const minutesWorked = monthTasks
      .filter(task => task.stato === 'completata')
      .reduce((sum, task) => sum + (task.ore_effettive || 0), 0);

    const minutesAssigned = monthTasks.reduce((sum, task) => {
      return sum + (task.ore_stimate || 0);
    }, 0);

    return {
      worked: minutesWorked / 60,
      assigned: minutesAssigned / 60
    };
  };

  // Raggruppa task per Cliente → Progetto → Area → Attività → Task (SETTIMANA)
  const getHierarchicalBreakdown = () => {
    const hierarchy = {};

    weekTasks.forEach(task => {
      const clienteName = task.cliente_nome || 'Senza Cliente';
      const progettoNome = task.progetto_nome || 'Senza Progetto';
      const areaNome = task.area_nome || 'Senza Area';
      const attivitaNome = task.attivita_nome || 'Senza Attività';

      if (!hierarchy[clienteName]) {
        hierarchy[clienteName] = {
          nome: clienteName,
          progetti: {},
          totalMinutes: 0
        };
      }

      if (!hierarchy[clienteName].progetti[progettoNome]) {
        hierarchy[clienteName].progetti[progettoNome] = {
          nome: progettoNome,
          aree: {},
          totalMinutes: 0
        };
      }

      if (!hierarchy[clienteName].progetti[progettoNome].aree[areaNome]) {
        hierarchy[clienteName].progetti[progettoNome].aree[areaNome] = {
          nome: areaNome,
          attivita: {},
          totalMinutes: 0
        };
      }

      if (!hierarchy[clienteName].progetti[progettoNome].aree[areaNome].attivita[attivitaNome]) {
        hierarchy[clienteName].progetti[progettoNome].aree[areaNome].attivita[attivitaNome] = {
          nome: attivitaNome,
          tasks: [],
          totalMinutes: 0
        };
      }

      const minutes = task.stato === 'completata' ? (task.ore_effettive || 0) : 0;

      hierarchy[clienteName].progetti[progettoNome].aree[areaNome].attivita[attivitaNome].tasks.push({
        ...task,
        minutes
      });

      hierarchy[clienteName].totalMinutes += minutes;
      hierarchy[clienteName].progetti[progettoNome].totalMinutes += minutes;
      hierarchy[clienteName].progetti[progettoNome].aree[areaNome].totalMinutes += minutes;
      hierarchy[clienteName].progetti[progettoNome].aree[areaNome].attivita[attivitaNome].totalMinutes += minutes;
    });

    return Object.values(hierarchy);
  };

  // Toggle espansione cliente
  const toggleClient = (clientName) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientName]: !prev[clientName]
    }));
  };

  // Azioni rapide basate su ruolo
  const getQuickActions = () => {
    const actions = [];
    
    actions.push(
      {
        label: 'Nuova Task',
        icon: CheckSquare,
        action: () => navigate('/tasks'),
        color: 'bg-blue-500 hover:bg-blue-600'
      },
      {
        label: 'Nuova Attività',
        icon: Briefcase,
        action: () => navigate('/activities'),
        color: 'bg-green-500 hover:bg-green-600'
      }
    );

    if (user?.ruolo === 'coordinatore' || user?.ruolo === 'manager' || user?.ruolo === 'super_admin') {
      actions.push({
        label: 'Nuova Area',
        icon: Target,
        action: () => navigate('/areas'),
        color: 'bg-yellow-500 hover:bg-yellow-600'
      });
    }

    if (user?.ruolo === 'manager' || user?.ruolo === 'super_admin') {
      actions.push(
        {
          label: 'Nuovo Progetto',
          icon: Briefcase,
          action: () => navigate('/projects'),
          color: 'bg-purple-500 hover:bg-purple-600'
        },
        {
          label: 'Nuovo Cliente',
          icon: User,
          action: () => navigate('/clients'),
          color: 'bg-red-500 hover:bg-red-600'
        }
      );
    }

    return actions;
  };

  // CALCOLO BONUS REALI DAL DATABASE
  
  // Calcola totale bonus positivi APPROVATI
  const calculateBonusPositivi = () => {
    return monthBonus
      .filter(t => t.importo_bonus > 0 && t.bonus_stato === 'approvato')
      .reduce((sum, t) => sum + parseFloat(t.importo_bonus || 0), 0);
  };

  // Calcola totale penalità APPROVATE
  const calculateBonusNegativi = () => {
    return monthBonus
      .filter(t => t.importo_bonus < 0 && t.bonus_stato === 'approvato')
      .reduce((sum, t) => sum + parseFloat(t.importo_bonus || 0), 0);
  };

  // Calcola bonus PENDING (in attesa approvazione)
  const calculateBonusPending = () => {
    return monthBonus
      .filter(t => t.bonus_stato === 'pending')
      .reduce((sum, t) => sum + parseFloat(t.importo_bonus || 0), 0);
  };

  // Calcola totale netto APPROVATO
  const calculateBonusTotale = () => {
    return calculateBonusPositivi() + calculateBonusNegativi();
  };

  // Conta task per tipo
  const countTaskByBonusType = (type) => {
    if (type === 'positivo') {
      return monthBonus.filter(t => t.importo_bonus > 0 && t.bonus_stato === 'approvato').length;
    } else if (type === 'negativo') {
      return monthBonus.filter(t => t.importo_bonus < 0 && t.bonus_stato === 'approvato').length;
    } else if (type === 'pending') {
      return monthBonus.filter(t => t.bonus_stato === 'pending').length;
    }
    return 0;
  };

  // Componente Task Card
const TaskCard = ({ task, variant = 'normal' }) => {
  const isCompleted = task.stato === 'completata';
  
  const getBorderColor = () => {
    if (isCompleted) return 'border-green-300 bg-green-50';
    if (variant === 'overdue') return 'border-red-300 bg-red-50';
    if (variant === 'today') return 'border-yellow-300 bg-yellow-50';
    return 'border-gray-200 bg-white';
  };

  const getBadgeColor = () => {
    if (variant === 'overdue') return 'bg-red-100 text-red-700';
    if (variant === 'today') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div
      onClick={() => navigate('/tasks')}
      className={`border-2 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer ${getBorderColor()} ${
        isCompleted ? 'opacity-75' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isCompleted && (
              <div className="bg-green-500 rounded-full p-0.5 flex-shrink-0">
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <h3 className={`font-semibold text-gray-900 text-sm truncate ${
              isCompleted ? 'line-through' : ''
            }`}>
              {task.nome}
            </h3>
          </div>
          
          <p className="text-xs text-gray-600 mt-1 truncate">
            {task.cliente_nome} • {task.progetto_nome}
          </p>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {isCompleted ? (
              <>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                  ✓ Completata
                </span>
                {task.data_completamento && (
                  <span className="text-xs text-gray-500 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(task.data_completamento, 'dd/MM')}
                  </span>
                )}
                {task.ore_effettive && (
                  <span className="text-xs text-gray-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatMinutesToHours(task.ore_effettive)}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getBadgeColor()}`}>
                  {variant === 'overdue' ? '🔴 Scaduta' : variant === 'today' ? '⚠️ Oggi' : formatDate(task.scadenza, 'dd/MM')}
                </span>
                <span className="text-xs text-gray-500 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatMinutesToHours(task.ore_stimate || 0)}
                </span>
              </>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </div>
    </div>
  );
};


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Errore</h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  const classifiedTasks = getClassifiedTasks();
  const weekHours = calculateWeekHours();
  const monthHours = calculateMonthHours();
  const hierarchicalData = getHierarchicalBreakdown();
  const quickActions = getQuickActions();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
          <h1 className="text-2xl md:text-3xl font-bold">
            Ciao, {user?.nome}! 👋
          </h1>
          <p className="text-blue-100 mt-1 text-sm">
            {new Date().toLocaleDateString('it-IT', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <p className="text-xs text-blue-200 mt-1">
            Ruolo: <span className="font-medium capitalize">{user?.ruolo}</span>
          </p>
        </div>

        {/* CRUSCOTTO BONUS MENSILI - DATI REALI */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center">
              <TrendingUp className="h-6 w-6 mr-2" />
              Bonus di {getMonthName()}
            </h2>
            <div className="text-right">
              <div className="text-xs bg-white/20 px-3 py-1 rounded-full mb-1">
                {monthBonus.length} task con bonus
              </div>
              <div className="text-xs opacity-75">
                {monthHours.worked.toFixed(1)}h lavorate
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* BONUS POSITIVI APPROVATI */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">Bonus Approvati</span>
                <div className="bg-green-400/30 p-1.5 rounded-full">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-green-300">
                +{calculateBonusPositivi().toFixed(2)}€
              </div>
              <div className="text-xs opacity-75 mt-1">
                {countTaskByBonusType('positivo')} task
              </div>
            </div>

            {/* PENALITÀ APPROVATE */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">Penalità</span>
                <div className="bg-red-400/30 p-1.5 rounded-full">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-red-300">
                {calculateBonusNegativi().toFixed(2)}€
              </div>
              <div className="text-xs opacity-75 mt-1">
                {countTaskByBonusType('negativo')} task
              </div>
            </div>

            {/* TOTALE NETTO */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border-2 border-white/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Totale Netto</span>
                <div className={`p-1.5 rounded-full ${
                  calculateBonusTotale() >= 0 ? 'bg-green-400/30' : 'bg-red-400/30'
                }`}>
                  {calculateBonusTotale() >= 0 ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                </div>
              </div>
              <div className={`text-4xl font-bold ${
                calculateBonusTotale() >= 0 ? 'text-green-300' : 'text-red-300'
              }`}>
                {calculateBonusTotale() >= 0 ? '+' : ''}{calculateBonusTotale().toFixed(2)}€
              </div>
              <div className="text-xs opacity-75 mt-1">
                Approvati
              </div>
            </div>
          </div>

          {/* BONUS IN ATTESA */}
          {calculateBonusPending() !== 0 && (
            <div className="mt-4 bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-300" />
                  <span className="text-sm font-medium">Bonus in Attesa di Approvazione</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-yellow-300">
                    {calculateBonusPending() >= 0 ? '+' : ''}{calculateBonusPending().toFixed(2)}€
                  </div>
                  <div className="text-xs opacity-75">
                    {countTaskByBonusType('pending')} task
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dettaglio breakdown */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <details className="cursor-pointer">
              <summary className="text-sm font-medium hover:text-white/80 transition-colors flex items-center">
                <ChevronDown className="h-4 w-4 mr-1" />
                Vedi dettaglio task con bonus
              </summary>
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {monthBonus.length > 0 ? (
                  monthBonus.map((task, idx) => (
                    <div key={idx} className="bg-white/5 rounded p-2 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate flex-1">{task.task_nome}</span>
                        <span className={`font-bold ml-2 ${
                          task.importo_bonus > 0 ? 'text-green-300' : 'text-red-300'
                        }`}>
                          {task.importo_bonus > 0 ? '+' : ''}{parseFloat(task.importo_bonus || 0).toFixed(2)}€
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs opacity-75">
                        <span>{task.cliente_nome}</span>
                        <span>•</span>
                        <span className={`px-1.5 py-0.5 rounded ${
                          task.bonus_stato === 'approvato' ? 'bg-green-500/30' :
                          task.bonus_stato === 'pending' ? 'bg-yellow-500/30' :
                          'bg-red-500/30'
                        }`}>
                          {task.bonus_stato === 'approvato' ? '✓ Approvato' :
                           task.bonus_stato === 'pending' ? '⏳ In attesa' :
                           '✗ Rifiutato'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center opacity-75 py-4">Nessun bonus registrato questo mese</p>
                )}
              </div>
            </details>
          </div>
        </div>

        {/* TASK E ORE AFFIANCATE SU DESKTOP */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* TASK DEL GIORNO E SETTIMANA */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-500" />
                Le Mie Task
              </h2>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                {weekTasks.length} totali
              </span>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              
              {/* Scadute */}
              {classifiedTasks.overdue.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Scadute ({classifiedTasks.overdue.length})
                  </h3>
                  <div className="space-y-2">
                    {classifiedTasks.overdue.map(task => (
                      <TaskCard key={task.id} task={task} variant="overdue" />
                    ))}
                  </div>
                </div>
              )}

              {/* Oggi */}
              {classifiedTasks.today.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-yellow-600 mb-2 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Oggi ({classifiedTasks.today.length})
                  </h3>
                  <div className="space-y-2">
                    {classifiedTasks.today.map(task => (
                      <TaskCard key={task.id} task={task} variant="today" />
                    ))}
                  </div>
                </div>
              )}

              {/* Prossime */}
              {classifiedTasks.upcoming.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Prossime ({classifiedTasks.upcoming.length})
                  </h3>
                  <div className="space-y-2">
                    {classifiedTasks.upcoming.slice(0, 10).map(task => (
                      <TaskCard key={task.id} task={task} variant="normal" />
                    ))}
                  </div>
                </div>
              )}

              {weekTasks.length === 0 && (
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nessuna task programmata</p>
                </div>
              )}
            </div>
          </div>

          {/* ORE SETTIMANALI CON DETTAGLIO */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
              Ore Settimanali
            </h2>

            {/* ORE LAVORATE (EFFETTIVE) */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800 flex items-center">
                  <CheckSquare className="h-4 w-4 mr-1 text-green-500" />
                  Ore Lavorate (Effettive)
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {weekHours.worked.hours.toFixed(1)}h / {weekHours.target}h
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      weekHours.worked.percentage >= 100 
                        ? 'bg-red-500' 
                        : weekHours.worked.percentage >= 80 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(weekHours.worked.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 w-12 text-right">
                  {weekHours.worked.percentage}%
                </span>
              </div>
            </div>

            {/* ORE ASSEGNATE (STIMATE) */}
            <div className="mb-5 pb-5 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800 flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-blue-500" />
                  Ore Assegnate (Stimate)
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {weekHours.assigned.hours.toFixed(1)}h / {weekHours.target}h
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      weekHours.assigned.percentage >= 100 
                        ? 'bg-orange-500' 
                        : weekHours.assigned.percentage >= 80 
                        ? 'bg-blue-400' 
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(weekHours.assigned.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 w-12 text-right">
                  {weekHours.assigned.percentage}%
                </span>
              </div>
            </div>

            {/* Breakdown Gerarchico */}
<div className="space-y-3">
  <h3 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-3">
    Dettaglio Ore Lavorate
  </h3>
  
  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
    {hierarchicalData.map((cliente, idx) => (
      <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
        
        {/* CLIENTE - Header sempre visibile */}
        <div
          onClick={() => toggleClient(cliente.nome)}
          className="bg-gray-50 p-3 cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <User className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span className="font-semibold text-gray-900 text-sm truncate">{cliente.nome}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-medium">
                {formatMinutesToHours(cliente.totalMinutes)}
              </span>
              <ChevronDown 
                className={`h-4 w-4 text-gray-500 transition-transform ${
                  expandedClients[cliente.nome] ? 'rotate-180' : ''
                }`} 
              />
            </div>
          </div>
        </div>

        {/* CONTENUTO CLIENTE - Scroll interno limitato */}
        {expandedClients[cliente.nome] && (
          <div className="bg-white max-h-[300px] overflow-y-auto">
            <div className="p-3 space-y-2">
              {Object.values(cliente.progetti).map((progetto, pIdx) => (
                <div key={pIdx} className="ml-4 border-l-2 border-gray-200 pl-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Briefcase className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-800 truncate">{progetto.nome}</span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatMinutesToHours(progetto.totalMinutes)}
                    </span>
                  </div>

                  {/* AREE */}
                  {Object.values(progetto.aree).map((area, aIdx) => (
                    <div key={aIdx} className="ml-4 border-l border-gray-200 pl-3 mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Target className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                          <span className="text-xs text-gray-700 truncate">{area.nome}</span>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatMinutesToHours(area.totalMinutes)}
                        </span>
                      </div>

                      {/* ATTIVITÀ */}
                      {Object.values(area.attivita).map((attivita, atIdx) => (
                        <div key={atIdx} className="ml-4 border-l border-gray-100 pl-3 mb-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Folder className="h-3 w-3 text-purple-500 flex-shrink-0" />
                              <span className="text-xs text-gray-600 truncate">{attivita.nome}</span>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatMinutesToHours(attivita.totalMinutes)}
                            </span>
                          </div>

                          {/* TASK */}
                          <div className="ml-4 space-y-0.5">
                            {attivita.tasks.filter(t => t.minutes > 0).map((task, tIdx) => (
                              <div key={tIdx} className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                  <FileText className="h-2.5 w-2.5 flex-shrink-0" />
                                  <span className="truncate">{task.nome}</span>
                                </div>
                                <span className="ml-2 flex-shrink-0">
                                  {formatMinutesToHours(task.minutes)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ))}

    {hierarchicalData.length === 0 && (
      <p className="text-center text-gray-500 py-4 text-sm">
        Nessuna ora lavorata questa settimana
      </p>
    )}
  </div>
</div>
          </div>

        </div>

        {/* AZIONI RAPIDE */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Plus className="h-5 w-5 mr-2 text-purple-500" />
            Azioni Rapide
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className={`${action.color} text-white rounded-lg p-4 transition-all duration-200 hover:shadow-lg transform hover:scale-105 text-center`}
                >
                  <Icon className="h-6 w-6 mb-2 mx-auto" />
                  <h3 className="font-semibold text-sm">{action.label}</h3>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;