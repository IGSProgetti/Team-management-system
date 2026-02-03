import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, AlertCircle, CheckCircle, DollarSign, TrendingUp, 
  Percent, Calculator 
} from 'lucide-react';

const CalcolaMarginiModal = ({ risorsa, cliente, onConfirm, onCancel }) => {
  const [margini, setMargini] = useState({
    costo_azienda_perc: 25.00,
    utile_gestore_azienda_perc: 12.50,
    utile_igs_perc: 12.50,
    costi_professionista_perc: 20.00,
    bonus_professionista_perc: 5.00,
    gestore_societa_perc: 3.00,
    commerciale_perc: 8.00,
    centrale_igs_perc: 4.00,
    network_igs_perc: 10.00
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const costoOrarioBase = parseFloat(risorsa.costo_orario);

  // Calcola costo orario finale con ricarichi
  const calcolaCostoFinale = () => {
    const totalePercentuali = Object.values(margini).reduce((sum, val) => sum + parseFloat(val), 0);
    const moltiplicatore = 1 + (totalePercentuali / 100);
    return (costoOrarioBase * moltiplicatore).toFixed(2);
  };

  const costoOrarioFinale = calcolaCostoFinale();
  const ricaricoTotale = (parseFloat(costoOrarioFinale) - costoOrarioBase).toFixed(2);
  const ricaricoPercentuale = ((ricaricoTotale / costoOrarioBase) * 100).toFixed(2);

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError(null);

  // Validazione
  const totale = Object.values(margini).reduce((sum, val) => sum + parseFloat(val), 0);
  if (totale < 0 || totale > 200) {
    setError('La somma delle percentuali deve essere tra 0% e 200%');
    return;
  }

  setLoading(true);
  
  try {
    // Crea un oggetto pulito senza riferimenti circolari
    const marginiData = {
      costo_azienda_perc: parseFloat(margini.costo_azienda_perc),
      utile_gestore_azienda_perc: parseFloat(margini.utile_gestore_azienda_perc),
      utile_igs_perc: parseFloat(margini.utile_igs_perc),
      costi_professionista_perc: parseFloat(margini.costi_professionista_perc),
      bonus_professionista_perc: parseFloat(margini.bonus_professionista_perc),
      gestore_societa_perc: parseFloat(margini.gestore_societa_perc),
      commerciale_perc: parseFloat(margini.commerciale_perc),
      centrale_igs_perc: parseFloat(margini.centrale_igs_perc),
      network_igs_perc: parseFloat(margini.network_igs_perc),
      costo_orario_finale: parseFloat(costoOrarioFinale)
    };
    
    await onConfirm(marginiData);
  } catch (err) {
    setError(err.message || 'Errore durante il calcolo');
    setLoading(false);
  }
};

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Calcola Margini Cliente</h2>
            <p className="text-green-100 text-sm mt-1">
              {risorsa.nome} → {cliente.nome}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-2 hover:bg-green-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info Base */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 mb-3">
                <Calculator className="w-5 h-5" />
                <span className="font-semibold">Costo Orario Base</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Risorsa</p>
                  <p className="text-lg font-bold text-gray-900">{risorsa.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Costo Base</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(costoOrarioBase)}/h</p>
                </div>
              </div>
            </div>

            {/* Percentuali Margini */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Percentuali di Ricarico
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <PercentInput
                  label="Costo Azienda"
                  value={margini.costo_azienda_perc}
                  onChange={(val) => setMargini({ ...margini, costo_azienda_perc: val })}
                />
                <PercentInput
                  label="Utile Gestore Azienda"
                  value={margini.utile_gestore_azienda_perc}
                  onChange={(val) => setMargini({ ...margini, utile_gestore_azienda_perc: val })}
                />
                <PercentInput
                  label="Utile IGS"
                  value={margini.utile_igs_perc}
                  onChange={(val) => setMargini({ ...margini, utile_igs_perc: val })}
                />
                <PercentInput
                  label="Costi Professionista"
                  value={margini.costi_professionista_perc}
                  onChange={(val) => setMargini({ ...margini, costi_professionista_perc: val })}
                />
                <PercentInput
                  label="Bonus Professionista"
                  value={margini.bonus_professionista_perc}
                  onChange={(val) => setMargini({ ...margini, bonus_professionista_perc: val })}
                />
                <PercentInput
                  label="Gestore Società"
                  value={margini.gestore_societa_perc}
                  onChange={(val) => setMargini({ ...margini, gestore_societa_perc: val })}
                />
                <PercentInput
                  label="Commerciale"
                  value={margini.commerciale_perc}
                  onChange={(val) => setMargini({ ...margini, commerciale_perc: val })}
                />
                <PercentInput
                  label="Centrale IGS"
                  value={margini.centrale_igs_perc}
                  onChange={(val) => setMargini({ ...margini, centrale_igs_perc: val })}
                />
                <PercentInput
                  label="Network IGS"
                  value={margini.network_igs_perc}
                  onChange={(val) => setMargini({ ...margini, network_igs_perc: val })}
                />
              </div>
            </div>

            {/* Riepilogo Calcolo */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 mb-3">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold">Riepilogo Calcolo</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Costo Orario Base:</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(costoOrarioBase)}/h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ricarico Totale:</span>
                  <span className="font-semibold text-orange-600">
                    +{formatCurrency(ricaricoTotale)} ({ricaricoPercentuale}%)
                  </span>
                </div>
                <div className="border-t border-green-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Costo Orario Finale:</span>
                    <span className="text-2xl font-bold text-green-600">{formatCurrency(costoOrarioFinale)}/h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Calcolo...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Conferma e Procedi</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Input Percentuale
const PercentInput = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <div className="relative">
      <input
        type="number"
        step="0.01"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
      <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
    </div>
  </div>
);

export default CalcolaMarginiModal;
