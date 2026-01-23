import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Building2, 
  User,
  DollarSign, 
  Clock, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Plus,
  Edit,
  Activity
} from 'lucide-react';
import * as api from '../../utils/api';

const AreaDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [area, setArea] = useState(null);
  const [attivita, setAttivita] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carica dati area
  useEffect(() => {
    loadAreaDetails();
  }, [id]);

  const loadAreaDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carica dettaglio area
      const areaResponse = await api.areeAPI.getById(id);
      setArea(areaResponse.data.area);

      // Carica attività dell'area
      const attivitaResponse = await api.activitiesAPI.getAll({ area_id: id });
      setAttivita(attivitaResponse.data.activities || []);

    } catch (err) {
      console.error('Errore caricamento area:', err);
      setError('Impossibile caricare i dettagli dell\'area');
    } finally {
      setLoading(false);
    }
  };

  // Calcola percentuale completamento
  const getPercentualeCompletamento = () => {
    if (!area || !area.numero_task || area.numero_task === 0) return 0;
    return Math.round((area.task_completate / area.numero_task) * 100);
  };

  // Naviga indietro al progetto
  const handleBack = () => {
    if (area?.progetto_id) {
      // Torna al modal del progetto (se implementato)
      navigate(-1);
    } else {
      navigate('/projects');
    }
  };

  // Gestisci creazione attività
  const handleCreateActivity = () => {
    // TODO: Aprire modal/form creazione attività con area pre-selezionata
    alert('Funzionalità "Nuova Attività" in arrivo!');
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-gray-600">Caricamento area...</span>
      </div>
    );
  }

  // Error state
  if (error || !area) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {error || 'Area non trovata'}
        </h3>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Torna Indietro
        </button>
      </div>
    );
  }

  const percentuale = getPercentualeCompletamento();

  return (
    <div className="space-y-6">
      
      {/* Header con Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span>{area.cliente_nome}</span>
              <span>›</span>
              <span>{area.progetto_nome}</span>
              <span>›</span>
              <span className="text-purple-600 font-semibold">Area</span>
            </div>
            
            {/* Titolo */}
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-purple-600" />
              {area.nome}
            </h1>
            
            {/* Descrizione */}
            {area.descrizione && (
              <p className="text-gray-600 mt-2">{area.descrizione}</p>
            )}
          </div>
        </div>

        {/* Azioni */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/areas/${id}/edit`)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Modifica
          </button>
          <button
            onClick={handleCreateActivity}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 shadow-md"
          >
            <Plus className="w-5 h-5" />
            Nuova Attività
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Coordinatore */}
        {area.coordinatore_nome && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-purple-600 font-medium">Coordinatore</div>
                <div className="text-lg font-bold text-gray-900">{area.coordinatore_nome}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Budget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-blue-600 font-medium">Budget Stimato</div>
              <div className="text-2xl font-bold text-gray-900">
                €{(area.budget_stimato || 0).toLocaleString('it-IT')}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Ore */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-green-600 font-medium">Ore</div>
              <div className="text-2xl font-bold text-gray-900">
                {area.ore_effettive || 0}h / {area.ore_stimate || 0}h
              </div>
              <div className="text-xs text-green-600">
                Effettive / Stimate
              </div>
            </div>
          </div>
        </motion.div>

        {/* Scadenza */}
        {area.scadenza && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <div className="text-sm text-orange-600 font-medium">Scadenza</div>
                <div className="text-lg font-bold text-gray-900">
                  {new Date(area.scadenza).toLocaleDateString('it-IT', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Progress e Statistiche */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Completamento Generale */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Completamento</h3>
            <span className="text-2xl font-bold text-purple-600">{percentuale}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentuale}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                percentuale === 100 ? 'bg-green-500' :
                percentuale >= 50 ? 'bg-blue-500' :
                'bg-orange-500'
              }`}
            />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Task Completate</span>
              <span className="font-semibold">{area.task_completate || 0}/{area.numero_task || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Attività Completate</span>
              <span className="font-semibold">{area.attivita_completate || 0}/{area.numero_attivita || 0}</span>
            </div>
          </div>
        </motion.div>

        {/* Statistiche Attività */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Attività</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Totali</span>
              <span className="text-xl font-bold text-gray-900">{area.numero_attivita || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-700">Completate</span>
              <span className="text-xl font-bold text-green-700">{area.attivita_completate || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">In Corso</span>
              <span className="text-xl font-bold text-blue-700">
                {(area.numero_attivita || 0) - (area.attivita_completate || 0)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Statistiche Task */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Task</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Totali</span>
              <span className="text-xl font-bold text-gray-900">{area.numero_task || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-700">Completate</span>
              <span className="text-xl font-bold text-green-700">{area.task_completate || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-sm text-orange-700">Da Fare</span>
              <span className="text-xl font-bold text-orange-700">
                {(area.numero_task || 0) - (area.task_completate || 0)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Lista Attività */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Attività dell'Area ({attivita.length})
            </h3>
          </div>
          <button
            onClick={handleCreateActivity}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuova Attività
          </button>
        </div>

        <div className="p-6">
          {attivita.length > 0 ? (
            <div className="space-y-4">
              {attivita.map(att => (
                <motion.div
                  key={att.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/activities/${att.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{att.nome}</h4>
                      {att.descrizione && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{att.descrizione}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {att.ore_effettive || 0}h / {att.ore_stimate || 0}h
                        </span>
                        {att.scadenza && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(att.scadenza).toLocaleDateString('it-IT')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge Stato */}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      att.stato === 'completata' ? 'bg-green-100 text-green-800' :
                      att.stato === 'in_esecuzione' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {att.stato === 'in_esecuzione' ? 'In Esecuzione' : 
                       att.stato === 'completata' ? 'Completata' : 'Pianificata'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Nessuna attività in quest'area</p>
              <button
                onClick={handleCreateActivity}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Crea la prima attività
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AreaDetailPage;