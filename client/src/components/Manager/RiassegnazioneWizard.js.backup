import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ArrowRight,
  ArrowLeft,
  Clock, 
  CheckCircle,
  AlertTriangle,
  Target,
  Plus,
  Minus,
  Search,
  Building,
  User,
  Activity
} from 'lucide-react';

const RiassegnazioneWizard = ({ isOpen, onClose, initialResource = null }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Dati wizard
  const [crediti, setCrediti] = useState([]);
  const [debiti, setDebiti] = useState([]);
  const [progetti, setProgetti] = useState([]);
  
  // Stato wizard
  const [selectedCredito, setSelectedCredito] = useState(null);
  const [minutiDaPrelevare, setMinutiDaPrelevare] = useState(0);
  const [tipoDestinazione, setTipoDestinazione] = useState('task_esistente'); // task_esistente, nuova_task
  const [selectedDebito, setSelectedDebito] = useState(null);
  const [selectedProgetto, setSelectedProgetto] = useState(null);
  const [nuovaTaskNome, setNuovaTaskNome] = useState('');
  const [motivo, setMotivo] = useState('');

  // Fetch crediti disponibili
  const fetchCrediti = async () => {
    try {
      const response = await fetch('/api/riassegnazioni/crediti-disponibili', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setCrediti(data.crediti || []);
    } catch (error) {
      console.error('Error fetching crediti:', error);
    }
  };

  // Fetch debiti compensabili
  const fetchDebiti = async () => {
    try {
      const response = await fetch('/api/riassegnazioni/debiti', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setDebiti(data.debiti || []);
    } catch (error) {
      console.error('Error fetching debiti:', error);
    }
  };

  const getToken = () => {
    const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    return authData.state?.token;
  };

  useEffect(() => {
    if (isOpen) {
      fetchCrediti();
      fetchDebiti();
    }
  }, [isOpen]);

  // Format time
  const formatTime = (minutes) => {
    if (!minutes) return '0min';
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  // Reset wizard
  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedCredito(null);
    setMinutiDaPrelevare(0);
    setTipoDestinazione('task_esistente');
    setSelectedDebito(null);
    setSelectedProgetto(null);
    setNuovaTaskNome('');
    setMotivo('');
  };

  // Handle close
  const handleClose = () => {
    resetWizard();
    onClose();
  };

  // Esegui riassegnazione
  const executeRiassegnazione = async () => {
    try {
      setLoading(true);
      
      const payload = {
        task_sorgente_id: selectedCredito.task_id,
        minuti_prelevati: minutiDaPrelevare,
        minuti_assegnati: minutiDaPrelevare,
        motivo: motivo,
        tipo_destinazione: tipoDestinazione
      };

      if (tipoDestinazione === 'task_esistente') {
        payload.task_destinazione_id = selectedDebito.task_id;
      } else {
        payload.progetto_destinazione_id = selectedProgetto.id;
        payload.nome_nuova_task = nuovaTaskNome;
      }

      const response = await fetch('/api/riassegnazioni/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        handleClose();
        // TODO: Show success toast
        // TODO: Refresh parent data
      } else {
        // TODO: Handle error
      }
    } catch (error) {
      console.error('Error creating riassegnazione:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Riassegnazione Ore</h3>
              <p className="text-green-600 font-medium">
                Step {currentStep} di 4 - Compensa Eccedenze con Risparmi
              </p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step <= currentStep ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`w-16 h-1 mx-2 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Seleziona Credito</span>
              <span>Imposta Minuti</span>
              <span>Scegli Destinazione</span>
              <span>Conferma</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* STEP 1: Seleziona Task con Crediti */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold mb-4">Seleziona Task con Ore in Credito</h4>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {crediti.map((credito) => (
                    <motion.div
                      key={credito.task_id}
                      whileHover={{ scale: 1.01 }}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedCredito?.task_id === credito.task_id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                      onClick={() => setSelectedCredito(credito)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium text-gray-900">{credito.task_nome}</h5>
                          <p className="text-sm text-gray-600">{credito.attivita_nome}</p>
                          <p className="text-xs text-gray-500">
                            {credito.progetto_nome} • {credito.cliente_nome} • {credito.risorsa_nome}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle size={16} className="text-green-600" />
                            <span className="text-lg font-bold text-green-600">
                              +{formatTime(credito.credito_disponibile_minuti)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatTime(credito.ore_stimate)} stim. → {formatTime(credito.ore_effettive)} eff.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Imposta quanti minuti prelevare */}
            {currentStep === 2 && selectedCredito && (
              <div className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Task Selezionata:</h4>
                  <p className="text-green-800">{selectedCredito.task_nome}</p>
                  <p className="text-green-700 text-sm">{selectedCredito.progetto_nome} • {selectedCredito.risorsa_nome}</p>
                  <p className="text-green-600 font-bold">
                    Credito disponibile: {formatTime(selectedCredito.credito_disponibile_minuti)}
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-4">Quanti minuti vuoi prelevare?</h4>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <button
                      onClick={() => setMinutiDaPrelevare(Math.max(0, minutiDaPrelevare - 5))}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Minus size={20} />
                    </button>
                    
                    <div className="flex-1 max-w-xs">
                      <input
                        type="number"
                        min="0"
                        max={selectedCredito.credito_disponibile_minuti}
                        value={minutiDaPrelevare}
                        onChange={(e) => setMinutiDaPrelevare(Math.min(selectedCredito.credito_disponibile_minuti, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full px-4 py-2 text-center text-xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                      <p className="text-center text-sm text-gray-500 mt-1">minuti</p>
                    </div>
                    
                    <button
                      onClick={() => setMinutiDaPrelevare(Math.min(selectedCredito.credito_disponibile_minuti, minutiDaPrelevare + 5))}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setMinutiDaPrelevare(Math.floor(selectedCredito.credito_disponibile_minuti / 2))}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      Metà ({formatTime(Math.floor(selectedCredito.credito_disponibile_minuti / 2))})
                    </button>
                    <button
                      onClick={() => setMinutiDaPrelevare(selectedCredito.credito_disponibile_minuti)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      Tutto ({formatTime(selectedCredito.credito_disponibile_minuti)})
                    </button>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-blue-800">
                      <strong>Risultato:</strong> Preleverai {formatTime(minutiDaPrelevare)} da questa task.
                      Rimarranno disponibili {formatTime(selectedCredito.credito_disponibile_minuti - minutiDaPrelevare)}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Scegli destinazione */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold">Dove vuoi assegnare i {formatTime(minutiDaPrelevare)}?</h4>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="destinazione"
                      value="task_esistente"
                      checked={tipoDestinazione === 'task_esistente'}
                      onChange={(e) => setTipoDestinazione(e.target.value)}
                      className="text-green-600"
                    />
                    <div>
                      <h5 className="font-medium">Compensa Task in Eccedenza</h5>
                      <p className="text-sm text-gray-600">Usa questi minuti per compensare task che hanno superato la stima</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="destinazione"
                      value="nuova_task"
                      checked={tipoDestinazione === 'nuova_task'}
                      onChange={(e) => setTipoDestinazione(e.target.value)}
                      className="text-green-600"
                    />
                    <div>
                      <h5 className="font-medium">Crea Nuova Task</h5>
                      <p className="text-sm text-gray-600">Assegna questi minuti a una nuova task su un progetto esistente</p>
                    </div>
                  </label>
                </div>

                {/* Lista debiti se selezionato */}
                {tipoDestinazione === 'task_esistente' && (
                  <div className="mt-6">
                    <h5 className="font-medium mb-3">Seleziona Task da Compensare:</h5>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {debiti.map((debito) => (
                        <div
                          key={debito.task_id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedDebito?.task_id === debito.task_id
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-200 hover:border-red-300'
                          }`}
                          onClick={() => setSelectedDebito(debito)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{debito.task_nome}</p>
                              <p className="text-sm text-gray-600">{debito.progetto_nome} • {debito.risorsa_nome}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-red-600 font-bold">-{formatTime(debito.debito_residuo_minuti)}</p>
                              <p className="text-xs text-gray-500">da compensare</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Conferma */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold">Conferma Riassegnazione</h4>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-3 bg-green-100 rounded-lg">
                      <p className="text-sm text-gray-600">DA (Credito):</p>
                      <p className="font-semibold">{selectedCredito?.task_nome}</p>
                      <p className="text-sm">{selectedCredito?.progetto_nome}</p>
                      <p className="text-green-600 font-bold">-{formatTime(minutiDaPrelevare)}</p>
                    </div>
                    
                    <ArrowRight className="w-6 h-6 text-gray-400" />
                    
                    <div className="flex-1 p-3 bg-blue-100 rounded-lg">
                      <p className="text-sm text-gray-600">A (Destinazione):</p>
                      <p className="font-semibold">
                        {tipoDestinazione === 'task_esistente' ? selectedDebito?.task_nome : nuovaTaskNome || 'Nuova Task'}
                      </p>
                      <p className="text-sm">
                        {tipoDestinazione === 'task_esistente' ? selectedDebito?.progetto_nome : selectedProgetto?.nome}
                      </p>
                      <p className="text-blue-600 font-bold">+{formatTime(minutiDaPrelevare)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo della riassegnazione:
                  </label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Es: Compensazione eccedenza task login per ottimizzazione sviluppo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
            <button
              onClick={currentStep === 1 ? handleClose : () => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
              disabled={loading}
            >
              <ArrowLeft size={16} />
              {currentStep === 1 ? 'Annulla' : 'Indietro'}
            </button>

            <button
              onClick={currentStep === 4 ? executeRiassegnazione : () => setCurrentStep(currentStep + 1)}
              disabled={
                (currentStep === 1 && !selectedCredito) ||
                (currentStep === 2 && minutiDaPrelevare === 0) ||
                (currentStep === 3 && tipoDestinazione === 'task_esistente' && !selectedDebito) ||
                (currentStep === 3 && tipoDestinazione === 'nuova_task' && (!selectedProgetto || !nuovaTaskNome)) ||
                loading
              }
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:bg-gray-400"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                currentStep === 4 ? 'Conferma Riassegnazione' : 'Avanti'
              )}
              {!loading && currentStep < 4 && <ArrowRight size={16} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RiassegnazioneWizard;