import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, AlertCircle, CheckCircle, Clock, DollarSign, 
  TrendingUp, ArrowRight, Package, Building2, Layers,
  FolderKanban, ListTodo, CheckSquare
} from 'lucide-react';
import api from '../utils/api';
import CalcolaMarginiModal from './CalcolaMarginiModal';

const AssegnaOreModal = ({ risorsa, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Cliente, 2: Livello, 3: Conferma
  
  // Dati
  const [clienti, setClienti] = useState([]);
  const [progetti, setProgetti] = useState([]);
  const [aree, setAree] = useState([]);
  const [attivita, setAttivita] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showMarginiModal, setShowMarginiModal] = useState(false);
  const [clienteSelezionato, setClienteSelezionato] = useState(null);
  const [risorsaGiaAssegnata, setRisorsaGiaAssegnata] = useState(false);
  
  // Form
  const [formData, setFormData] = useState({
    cliente_id: '',
    tipo_assegnazione: '', // 'progetto' | 'area' | 'attivita' | 'task'
    progetto_id: '',
    area_id: '',
    attivita_id: '',
    task_id: '',
    ore_da_assegnare: '',
    tipo_monte: 'progetti' // 'progetti' o 'tesoretto'
  });
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Determina livelli disponibili in base al ruolo
  const getLivelliDisponibili = () => {
    const ruolo = risorsa.ruolo.toLowerCase();
    
    if (ruolo === 'manager' || ruolo === 'super_admin') {
      return ['progetto', 'area', 'attivita', 'task'];
    } else if (ruolo === 'coordinatore') {
      return ['area', 'attivita', 'task'];
    } else {
      return ['attivita', 'task'];
    }
  };

  useEffect(() => {
    fetchClienti();
  }, []);

  // Verifica se risorsa è già assegnata al cliente
const verificaAssegnazioneCliente = async (clienteId) => {
  try {
    const response = await api.get(`/clients/${clienteId}/resources`);
    const risorse = response.data.resources || [];
    const assegnata = risorse.some(r => r.id === risorsa.id || r.risorsa_id === risorsa.id);
    setRisorsaGiaAssegnata(assegnata);
    return assegnata;
  } catch (err) {
    console.error('Errore verifica assegnazione:', err);
    return false;
  }
};

// Quando cambia il cliente, verifica assegnazione
useEffect(() => {
  if (formData.cliente_id) {
    const cliente = clienti.find(c => c.id === formData.cliente_id);
    setClienteSelezionato(cliente);
    verificaAssegnazioneCliente(formData.cliente_id);
  }
}, [formData.cliente_id]);

  // Fetch cascata
  useEffect(() => {
    if (formData.cliente_id) {
      fetchProgetti(formData.cliente_id);
    }
  }, [formData.cliente_id]);

  useEffect(() => {
    if (formData.progetto_id) {
      fetchAree(formData.progetto_id);
    }
  }, [formData.progetto_id]);

  useEffect(() => {
    if (formData.area_id) {
      fetchAttivita(formData.area_id);
    }
  }, [formData.area_id]);

  useEffect(() => {
    if (formData.attivita_id) {
      fetchTasks(formData.attivita_id);
    }
  }, [formData.attivita_id]);

  const fetchClienti = async () => {
    try {
      const response = await api.get('/clients');
      setClienti(response.data.clients || []);
    } catch (err) {
      console.error('Errore caricamento clienti:', err);
    }
  };

  const fetchProgetti = async (clienteId) => {
    try {
      const response = await api.get(`/projects?cliente_id=${clienteId}`);
      setProgetti(response.data.projects || []);
    } catch (err) {
      console.error('Errore caricamento progetti:', err);
    }
  };

  const fetchAree = async (progettoId) => {
    try {
      const response = await api.get(`/aree?progetto_id=${progettoId}`);
      setAree(response.data.aree || []);
    } catch (err) {
      console.error('Errore caricamento aree:', err);
    }
  };

  const fetchAttivita = async (areaId) => {
    try {
      const response = await api.get(`/activities?area_id=${areaId}`);
      setAttivita(response.data.activities || []);
    } catch (err) {
      console.error('Errore caricamento attività:', err);
    }
  };

  const fetchTasks = async (attivitaId) => {
    try {
      const response = await api.get(`/tasks?attivita_id=${attivitaId}`);
      setTasks(response.data.tasks || []);
    } catch (err) {
      console.error('Errore caricamento tasks:', err);
    }
  };

  const handleSubmit = async (marginiData = null) => {
  setError(null);
  
  // Se marginiData è un evento, lo ignoriamo
  if (marginiData && marginiData.nativeEvent) {
    marginiData = null;
  }

  console.log('🔍 handleSubmit chiamato con marginiData:', marginiData);
  console.log('🔍 risorsaGiaAssegnata:', risorsaGiaAssegnata);

  // Validazioni
  if (!formData.cliente_id) {
    setError('Seleziona un cliente');
    return;
  }

  if (!formData.tipo_assegnazione) {
    setError('Seleziona un livello di assegnazione');
    return;
  }

  const ore = parseFloat(formData.ore_da_assegnare);
  if (isNaN(ore) || ore <= 0) {
    setError('Inserisci un numero di ore valido');
    return;
  }

  const oreDisponibili = parseFloat(
    formData.tipo_monte === 'progetti' 
      ? risorsa.ore_disponibili_progetti 
      : risorsa.ore_disponibili_tesoretto
  );

  if (ore > oreDisponibili) {
    setError(`Ore insufficienti! Disponibili: ${oreDisponibili.toFixed(2)}h`);
    return;
  }

  // Se la risorsa NON è assegnata al cliente e non abbiamo i margini, apri modal margini
  if (!risorsaGiaAssegnata && !marginiData) {
    setShowMarginiModal(true);
    return;
  }

  try {
    setLoading(true);
    
    const payload = {
  cliente_id: formData.cliente_id,
  ore_da_assegnare: ore,
  tipo_monte: formData.tipo_monte,
  tipo_assegnazione: formData.tipo_assegnazione,
  progetto_id: formData.progetto_id || null,
  area_id: formData.area_id || null,
  attivita_id: formData.attivita_id || null,
  task_id: formData.task_id || null
};

// Se abbiamo i margini, crea un oggetto pulito serializzabile
if (marginiData) {
  payload.margini = {
    costo_azienda_perc: Number(marginiData.costo_azienda_perc),
    utile_gestore_azienda_perc: Number(marginiData.utile_gestore_azienda_perc),
    utile_igs_perc: Number(marginiData.utile_igs_perc),
    costi_professionista_perc: Number(marginiData.costi_professionista_perc),
    bonus_professionista_perc: Number(marginiData.bonus_professionista_perc),
    gestore_societa_perc: Number(marginiData.gestore_societa_perc),
    commerciale_perc: Number(marginiData.commerciale_perc),
    centrale_igs_perc: Number(marginiData.centrale_igs_perc),
    network_igs_perc: Number(marginiData.network_igs_perc),
    costo_orario_finale: Number(marginiData.costo_orario_finale)
  };
}

    await api.post(`/budget-control-resources/${risorsa.id}/assegna-ore`, payload);
    
    setSuccess(true);
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 1500);
  } catch (err) {
    console.error('Errore assegnazione ore:', err);
    setError(err.response?.data?.error || 'Errore durante l\'assegnazione');
  } finally {
    setLoading(false);
  }
};

const handleMarginiConfirm = async (marginiData) => {
  setShowMarginiModal(false);
  await handleSubmit(marginiData);
};

const handleMarginiCancel = () => {
  setShowMarginiModal(false);
  setError('Calcolo margini annullato. Assegnazione non completata.');
};

  const formatHours = (value) => {
    return `${parseFloat(value).toFixed(2)}h`;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const costoStimato = parseFloat(formData.ore_da_assegnare || 0) * parseFloat(risorsa.costo_orario || 0);
  
  const oreAttualiDisponibili = parseFloat(
    formData.tipo_monte === 'progetti' 
      ? risorsa.ore_disponibili_progetti 
      : risorsa.ore_disponibili_tesoretto
  );
  const oreRimanenti = oreAttualiDisponibili - parseFloat(formData.ore_da_assegnare || 0);

  const livelliDisponibili = getLivelliDisponibili();

  const canProceedToStep2 = formData.cliente_id !== '';
  const canProceedToStep3 = formData.tipo_assegnazione !== '' && formData.ore_da_assegnare !== '';

  return (
   <>  
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Assegna Ore - {risorsa.nome}</h2>
            <p className="text-blue-100 text-sm mt-1">
              {step === 1 && 'Step 1: Seleziona Cliente'}
              {step === 2 && 'Step 2: Seleziona Livello di Assegnazione'}
              {step === 3 && 'Step 3: Conferma Assegnazione'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="bg-blue-50 px-6 py-3 flex items-center gap-2">
          <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* STEP 1: Cliente */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleziona Cliente *
                  </label>
                  <select
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleziona un cliente...</option>
                    {clienti.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Info Risorsa */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Informazioni Risorsa</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Ruolo</p>
                      <p className="font-semibold text-gray-900 capitalize">{risorsa.ruolo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Costo Orario</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(risorsa.costo_orario)}/h</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Ore Disponibili</p>
                      <p className="font-semibold text-green-600">{formatHours(risorsa.ore_disponibili_progetti)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Livello Assegnazione */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Livello di Assegnazione *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {livelliDisponibili.includes('progetto') && (
                      <LivelloButton
                        selected={formData.tipo_assegnazione === 'progetto'}
                        onClick={() => setFormData({ ...formData, tipo_assegnazione: 'progetto' })}
                        icon={<FolderKanban className="w-5 h-5" />}
                        label="Progetto"
                        color="purple"
                      />
                    )}
                    {livelliDisponibili.includes('area') && (
                      <LivelloButton
                        selected={formData.tipo_assegnazione === 'area'}
                        onClick={() => setFormData({ ...formData, tipo_assegnazione: 'area' })}
                        icon={<Layers className="w-5 h-5" />}
                        label="Area"
                        color="green"
                      />
                    )}
                    {livelliDisponibili.includes('attivita') && (
                      <LivelloButton
                        selected={formData.tipo_assegnazione === 'attivita'}
                        onClick={() => setFormData({ ...formData, tipo_assegnazione: 'attivita' })}
                        icon={<ListTodo className="w-5 h-5" />}
                        label="Attività"
                        color="orange"
                      />
                    )}
                    {livelliDisponibili.includes('task') && (
                      <LivelloButton
                        selected={formData.tipo_assegnazione === 'task'}
                        onClick={() => setFormData({ ...formData, tipo_assegnazione: 'task' })}
                        icon={<CheckSquare className="w-5 h-5" />}
                        label="Task"
                        color="blue"
                      />
                    )}
                  </div>
                </div>

                {/* Selezione CASCADE */}
                {formData.tipo_assegnazione === 'progetto' && (
                  <SelectProgetto 
                    progetti={progetti}
                    value={formData.progetto_id}
                    onChange={(val) => setFormData({ ...formData, progetto_id: val })}
                  />
                )}

                {formData.tipo_assegnazione === 'area' && (
                  <>
                    <SelectProgetto 
                      progetti={progetti}
                      value={formData.progetto_id}
                      onChange={(val) => setFormData({ ...formData, progetto_id: val })}
                    />
                    {formData.progetto_id && (
                      <SelectArea 
                        aree={aree}
                        value={formData.area_id}
                        onChange={(val) => setFormData({ ...formData, area_id: val })}
                      />
                    )}
                  </>
                )}

                {formData.tipo_assegnazione === 'attivita' && (
                  <>
                    <SelectProgetto 
                      progetti={progetti}
                      value={formData.progetto_id}
                      onChange={(val) => setFormData({ ...formData, progetto_id: val })}
                    />
                    {formData.progetto_id && (
                      <SelectArea 
                        aree={aree}
                        value={formData.area_id}
                        onChange={(val) => setFormData({ ...formData, area_id: val })}
                      />
                    )}
                    {formData.area_id && (
                      <SelectAttivita 
                        attivita={attivita}
                        value={formData.attivita_id}
                        onChange={(val) => setFormData({ ...formData, attivita_id: val })}
                      />
                    )}
                  </>
                )}

                {formData.tipo_assegnazione === 'task' && (
                  <>
                    <SelectProgetto 
                      progetti={progetti}
                      value={formData.progetto_id}
                      onChange={(val) => setFormData({ ...formData, progetto_id: val })}
                    />
                    {formData.progetto_id && (
                      <SelectArea 
                        aree={aree}
                        value={formData.area_id}
                        onChange={(val) => setFormData({ ...formData, area_id: val })}
                      />
                    )}
                    {formData.area_id && (
                      <SelectAttivita 
                        attivita={attivita}
                        value={formData.attivita_id}
                        onChange={(val) => setFormData({ ...formData, attivita_id: val })}
                      />
                    )}
                    {formData.attivita_id && (
                      <SelectTask 
                        tasks={tasks}
                        value={formData.task_id}
                        onChange={(val) => setFormData({ ...formData, task_id: val })}
                      />
                    )}
                  </>
                )}

                {/* Ore da Assegnare */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ore da Assegnare *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.ore_da_assegnare}
                      onChange={(e) => setFormData({ ...formData, ore_da_assegnare: e.target.value })}
                      placeholder="Es: 40"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Tipo Monte */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assegna da:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo_monte: 'progetti' })}
                      className={`p-3 border-2 rounded-lg transition-all text-left ${
                        formData.tipo_monte === 'progetti'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Package className={`w-4 h-4 ${formData.tipo_monte === 'progetti' ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div>
                          <p className="font-semibold text-sm">Monte Progetti</p>
                          <p className="text-xs text-gray-500">{formatHours(risorsa.ore_disponibili_progetti)}</p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo_monte: 'tesoretto' })}
                      className={`p-3 border-2 rounded-lg transition-all text-left ${
                        formData.tipo_monte === 'tesoretto'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <DollarSign className={`w-4 h-4 ${formData.tipo_monte === 'tesoretto' ? 'text-purple-600' : 'text-gray-400'}`} />
                        <div>
                          <p className="font-semibold text-sm">Tesoretto</p>
                          <p className="text-xs text-gray-500">{formatHours(risorsa.ore_disponibili_tesoretto)}</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Conferma */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800 mb-3">
                    <TrendingUp className="w-5 h-5" />
                    <span className="font-semibold">Riepilogo Assegnazione</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cliente:</span>
                      <span className="font-semibold">{clienti.find(c => c.id === formData.cliente_id)?.nome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Livello:</span>
                      <span className="font-semibold capitalize">{formData.tipo_assegnazione}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ore da assegnare:</span>
                      <span className="font-semibold">{formatHours(formData.ore_da_assegnare)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Da monte:</span>
                      <span className="font-semibold capitalize">{formData.tipo_monte}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Costo totale:</span>
                      <span className="font-semibold">{formatCurrency(costoStimato)}</span>
                    </div>
                    <div className="border-t border-blue-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ore rimanenti:</span>
                        <span className="font-bold text-blue-600">{formatHours(oreRimanenti)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error/Success */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">Ore assegnate con successo!</span>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
          <button
            type="button"
            onClick={() => {
              if (step > 1) {
                setStep(step - 1);
                setError(null);
              } else {
                onClose();
              }
            }}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {step === 1 ? 'Annulla' : 'Indietro'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && canProceedToStep2) {
                  setStep(2);
                  setError(null);
                } else if (step === 2 && canProceedToStep3) {
                  setStep(3);
                  setError(null);
                } else {
                  setError('Completa tutti i campi obbligatori');
                }
              }}
              disabled={
                (step === 1 && !canProceedToStep2) ||
                (step === 2 && !canProceedToStep3)
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>Avanti</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Assegnazione...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Conferma Assegnazione</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
    
    {/* Modal Calcola Margini */}
    {showMarginiModal && clienteSelezionato && (
      <CalcolaMarginiModal
        risorsa={risorsa}
        cliente={clienteSelezionato}
        onConfirm={handleMarginiConfirm}
        onCancel={handleMarginiCancel}
      />
    )}
  </>
);
};

// Componente Bottone Livello
const LivelloButton = ({ selected, onClick, icon, label, color }) => {
  const colorClasses = {
    purple: selected ? 'border-purple-600 bg-purple-50' : '',
    green: selected ? 'border-green-600 bg-green-50' : '',
    orange: selected ? 'border-orange-600 bg-orange-50' : '',
    blue: selected ? 'border-blue-600 bg-blue-50' : ''
  };

  const iconColorClasses = {
    purple: selected ? 'text-purple-600' : 'text-gray-400',
    green: selected ? 'text-green-600' : 'text-gray-400',
    orange: selected ? 'text-orange-600' : 'text-gray-400',
    blue: selected ? 'text-blue-600' : 'text-gray-400'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 border-2 rounded-lg transition-all ${
        selected ? colorClasses[color] : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={iconColorClasses[color]}>
          {icon}
        </div>
        <span className="font-semibold text-gray-900">{label}</span>
      </div>
    </button>
  );
};

// Select Components
const SelectProgetto = ({ progetti, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Progetto *
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">Seleziona progetto...</option>
      {progetti.map(p => (
        <option key={p.id} value={p.id}>{p.nome}</option>
      ))}
    </select>
  </div>
);

const SelectArea = ({ aree, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Area *
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">Seleziona area...</option>
      {aree.map(a => (
        <option key={a.id} value={a.id}>{a.nome}</option>
      ))}
    </select>
  </div>
);

const SelectAttivita = ({ attivita, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Attività *
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">Seleziona attività...</option>
      {attivita.map(a => (
        <option key={a.id} value={a.id}>{a.nome}</option>
      ))}
    </select>
  </div>
);

const SelectTask = ({ tasks, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Task *
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">Seleziona task...</option>
      {tasks.map(t => (
        <option key={t.id} value={t.id}>{t.nome}</option>
      ))}
    </select>
  </div>
);

export default AssegnaOreModal;
