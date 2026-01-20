import React, { useState, useEffect } from 'react';
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
import { dashboardAPI } from '../../utils/api';

// Modale Dettaglio Risorsa
const UserDetailModal = ({ userId, userName, onClose }) => {
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carica dati quando si apre la modale
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getUserDetail(userId);
        setDetailData(response.data);
      } catch (error) {
        console.error('Errore caricamento dettagli:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchDetail();
    }
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{userName}</h2>
            <p className="text-sm text-gray-500">Dettaglio Performance</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : detailData ? (
            <div className="space-y-6">
              {/* Statistiche Questo Mese */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Questo Mese</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Ore Lavorate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatMinutesToHours(detailData.statistics.questo_mese.ore_lavorate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ore Attese</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatMinutesToHours(detailData.statistics.questo_mese.ore_attese)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Scostamento</p>
                    <p className={`text-2xl font-bold ${
                      detailData.statistics.questo_mese.scostamento_ore >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {detailData.statistics.questo_mese.scostamento_ore >= 0 ? '+' : ''}
                      {formatMinutesToHours(detailData.statistics.questo_mese.scostamento_ore)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Task Completate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {detailData.statistics.questo_mese.task_completate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ore Giornaliere - SEZIONE CRITICA */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Ore Lavorate per Giorno (Ultimi 30 giorni)</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {detailData.daily_hours.length > 0 ? (
                    detailData.daily_hours.map((day) => (
                      <div 
                        key={day.data} 
                        className={`p-4 rounded-lg border-2 ${
                          day.status === 'completo' ? 'border-green-200 bg-green-50' :
                          day.status === 'parziale' ? 'border-yellow-200 bg-yellow-50' :
                          'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">
                              {day.status === 'completo' ? '🟢' : day.status === 'parziale' ? '🟡' : '🔴'}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {new Date(day.data).toLocaleDateString('it-IT', { 
                                  weekday: 'long', 
                                  day: '2-digit', 
                                  month: 'long' 
                                })}
                              </p>
                              <p className="text-sm text-gray-500">
                                {day.task_completate} task completate
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              {day.ore_lavorate_decimale}h
                            </p>
                            <p className="text-sm text-gray-500">
                              su 8h previste
                            </p>
                          </div>
                        </div>

                        {/* Dettaglio Task del giorno */}
                        {day.task_dettaglio && day.task_dettaglio.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Task del giorno:</p>
                            <div className="space-y-1">
                              {day.task_dettaglio.map((task, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-700">
                                    {task.task_nome} • {task.progetto} ({task.cliente})
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {(task.ore / 60).toFixed(1)}h
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      Nessuna ora lavorata negli ultimi 30 giorni
                    </p>
                  )}
                </div>
              </div>

              {/* Progetti Attivi */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💼 Progetti Attivi</h3>
                <div className="space-y-3">
                  {detailData.active_projects.length > 0 ? (
                    detailData.active_projects.map((project) => (
                      <div key={project.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{project.nome}</p>
                            <p className="text-sm text-gray-500">{project.cliente_nome}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatMinutesToHours(project.ore_lavorate)} / {formatMinutesToHours(project.ore_assegnate)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {project.percentuale_completamento}% completato
                            </p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${project.percentuale_completamento}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">Nessun progetto attivo</p>
                  )}
                </div>
              </div>

              {/* Pulsante Dettaglio Completo */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  onClick={() => {
                    alert(`Funzionalità "Dettaglio Completo" in arrivo!\nPagina: /risorse/${userId}/dettaglio`);
                  }}
                >
                  📊 Vedi Dettaglio Completo
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Errore nel caricamento dei dati</p>
          )}
        </div>
      </div>
    </div>
  );
};

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

  const [selectedUser, setSelectedUser] = useState(null);

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
      <div 
  key={user.id} 
  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-blue-50 hover:border-blue-300 border-2 border-transparent transition-all cursor-pointer"
  title={`Clicca per vedere il dettaglio di ${user.nome}`}
  onClick={() => setSelectedUser({ id: user.id, nome: user.nome })}
>
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium">
              {user.nome.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="ml-3">
            <p className="font-medium text-gray-900">{user.nome}</p>
            <p 
              className="text-sm text-gray-500 cursor-help"
              title={`Task completate: ${user.task_completate}\nOre effettive lavorate: ${formatMinutesToHours(user.ore_lavorate)}\nProgetti attivi: ${user.progetti_attivi || 0}`}
            >
              {user.task_completate} task • {formatMinutesToHours(user.ore_lavorate)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p 
            className="font-medium text-gray-900 cursor-help"
            title={`Costo sostenuto per questa risorsa\n(Ore lavorate × Costo orario)`}
          >
            {formatCurrency(user.valore_generato)}
          </p>
          <p 
            className={`text-sm cursor-help ${
              user.scostamento_percentuale > 0 
                ? 'text-red-600' 
                : user.scostamento_percentuale < 0 
                ? 'text-green-600' 
                : 'text-gray-500'
            }`}
            title={
              user.scostamento_percentuale > 0 
                ? `⚠️ Sforamento ore: ha lavorato il ${user.scostamento_percentuale}% in più del previsto\n(Ore effettive > Ore stimate)` 
                : user.scostamento_percentuale < 0 
                ? `✅ Sotto budget: ha lavorato il ${Math.abs(user.scostamento_percentuale)}% in meno del previsto\n(Ore effettive < Ore stimate)`
                : 'Perfettamente nei tempi previsti'
            }
          >
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

      {/* Modale Dettaglio Utente */}
      {selectedUser && (
        <UserDetailModal
          userId={selectedUser.id}
          userName={selectedUser.nome}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
