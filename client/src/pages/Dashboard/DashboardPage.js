import React from 'react';
import { 
  CheckSquare, 
  Clock, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Target,
  DollarSign
} from 'lucide-react';
import { useAuth, useDashboard, useTasks } from '../../hooks';
import { formatCurrency, formatMinutesToHours } from '../../utils/helpers';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend = null }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center">
      <div className={`p-3 rounded-lg bg-${color}-100`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
      <div className="ml-4 flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className={`flex items-center mt-2 text-sm ${
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            <TrendingUp className="w-4 h-4 mr-1" />
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
    </div>
  </div>
);

const TaskCard = ({ task, onClick }) => {
  const isOverdue = new Date(task.scadenza) < new Date() && task.stato !== 'completata';
  
  return (
    <div
      onClick={() => onClick?.(task)}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-gray-900 truncate flex-1">{task.nome}</h3>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
          task.stato === 'completata' 
            ? 'bg-green-100 text-green-800'
            : task.stato === 'in_esecuzione'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {task.stato === 'completata' ? 'Completata' : 
           task.stato === 'in_esecuzione' ? 'In Corso' : 'Programmata'}
        </span>
      </div>
      
      {task.descrizione && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.descrizione}</p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center">
          <Calendar className="w-4 h-4 mr-1" />
          {new Date(task.scadenza).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short'
          })}
        </span>
        
        <span className="flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          {formatMinutesToHours(task.ore_stimate)}
        </span>
        
        {isOverdue && (
          <span className="flex items-center text-red-500">
            <AlertTriangle className="w-4 h-4 mr-1" />
            In ritardo
          </span>
        )}
      </div>
      
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {task.progetto_nome} • {task.cliente_nome}
        </span>
        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-medium">
            {task.utente_nome?.charAt(0)?.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const { overview, usersPerformance, projectsPerformance, isLoading } = useDashboard();
  const { tasks, summary } = useTasks({ 
    stato: user?.ruolo === 'risorsa' ? undefined : 'all',
    limit: 6 
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isManager = user?.ruolo === 'manager';

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Benvenuto, {user?.nome}! 👋
        </h1>
        <p className="text-blue-100">
          {isManager 
            ? 'Ecco una panoramica del tuo team e dei progetti attivi'
            : 'Ecco le tue task e attività in corso'
          }
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isManager ? (
          <>
            <StatCard
              title="Progetti Attivi"
              value={overview?.progetti?.approvati || 0}
              subtitle={`${overview?.progetti?.pending || 0} in approvazione`}
              icon={Target}
              color="blue"
            />
            <StatCard
              title="Task Completate"
              value={overview?.task?.completata || 0}
              subtitle={`${overview?.task?.in_esecuzione || 0} in corso`}
              icon={CheckSquare}
              color="green"
            />
            <StatCard
              title="Team Members"
              value={overview?.utenti?.totali_attivi || 0}
              subtitle="Risorse attive"
              icon={Users}
              color="purple"
            />
            <StatCard
              title="Budget Utilizzato"
              value={formatCurrency(overview?.budget?.costo_effettivo_totale || 0)}
              subtitle={`${formatCurrency(overview?.budget?.budget_assegnato_progetti || 0)} disponibile`}
              icon={DollarSign}
              color="orange"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Le Mie Task"
              value={summary?.totali || 0}
              subtitle={`${summary?.completate || 0} completate`}
              icon={CheckSquare}
              color="blue"
            />
            <StatCard
              title="In Corso"
              value={summary?.in_esecuzione || 0}
              subtitle="Task attive"
              icon={Clock}
              color="green"
            />
            <StatCard
              title="Programmate"
              value={summary?.programmate || 0}
              subtitle="Da iniziare"
              icon={Calendar}
              color="purple"
            />
            <StatCard
              title="In Ritardo"
              value={summary?.in_ritardo || 0}
              subtitle="Attenzione richiesta"
              icon={AlertTriangle}
              color="red"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {isManager ? 'Task Recenti del Team' : 'Le Mie Task'}
            </h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Vedi tutte
            </button>
          </div>

          <div className="space-y-4">
            {tasks.length > 0 ? (
              tasks.slice(0, 5).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Nessuna task da visualizzare</p>
                <button className="mt-2 text-blue-600 hover:text-blue-700 font-medium">
                  Crea la prima task
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Performance Chart or Team Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {isManager ? 'Performance Team' : 'La Mia Performance'}
            </h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Dettagli
            </button>
          </div>

          {isManager && usersPerformance.length > 0 ? (
            <div className="space-y-4">
              {usersPerformance.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {user.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{user.nome}</p>
                      <p className="text-sm text-gray-500">
                        {user.task_completate} task • {formatMinutesToHours(user.ore_lavorate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(user.valore_generato)}
                    </p>
                    <p className={`text-sm ${
                      user.scostamento_percentuale > 0 
                        ? 'text-red-600' 
                        : user.scostamento_percentuale < 0 
                        ? 'text-green-600' 
                        : 'text-gray-500'
                    }`}>
                      {user.scostamento_percentuale > 0 ? '+' : ''}{user.scostamento_percentuale}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Dati performance in caricamento...</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Azioni Rapide</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition-colors">
            <CheckSquare className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-blue-900">Nuova Task</span>
          </button>
          
          <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition-colors">
            <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-green-900">Nuovo Progetto</span>
          </button>
          
          <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition-colors">
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-purple-900">Nuovo Cliente</span>
          </button>
          
          <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-center transition-colors">
            <Calendar className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-orange-900">Calendario</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
