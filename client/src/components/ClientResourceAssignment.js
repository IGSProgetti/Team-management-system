import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import api from '../utils/api';

const ClientResourceAssignment = ({ clienteId, clienteBudget }) => {
  const [risorse, setRisorse] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    risorsa_id: '',
    ore_assegnate: '',
    margini: {
      costo_azienda_perc: 25,
      costo_azienda_attivo: true,
      utile_gestore_azienda_perc: 12.5,
      utile_gestore_azienda_attivo: true,
      utile_igs_perc: 12.5,
      utile_igs_attivo: true,
      costi_professionista_perc: 20,
      costi_professionista_attivo: true,
      bonus_professionista_perc: 5,
      bonus_professionista_attivo: true,
      gestore_societa_perc: 3,
      gestore_societa_attivo: true,
      commerciale_perc: 8,
      commerciale_attivo: true,
      centrale_igs_perc: 4,
      centrale_igs_attivo: true,
      network_igs_perc: 10,
      network_igs_attivo: true
    }
  });

  // Carica risorse assegnate
  useEffect(() => {
    loadRisorse();
    loadAvailableUsers();
  }, [clienteId]);

  const loadRisorse = async () => {
    try {
      const response = await api.get(`/client-resources/${clienteId}`);
      setRisorse(response.data.risorse || []);
    } catch (error) {
      console.error('Errore caricamento risorse:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await api.get('/users');
      setAvailableUsers(response.data.users || []);
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
    }
  };

  // Calcola costo orario finale in tempo reale
const calcolaCostoOrarioFinale = (costoBase, margini) => {
  const base = parseFloat(costoBase);
  
  // Il totale è SEMPRE costo base × 5 (100/20 = 5)
  const costoTotale = base * 5;
  
  const marginiConfig = [
    { nome: 'costo_azienda', perc: margini.costo_azienda_perc, attivo: margini.costo_azienda_attivo },
    { nome: 'utile_gestore_azienda', perc: margini.utile_gestore_azienda_perc, attivo: margini.utile_gestore_azienda_attivo },
    { nome: 'utile_igs', perc: margini.utile_igs_perc, attivo: margini.utile_igs_attivo },
    { nome: 'costi_professionista', perc: margini.costi_professionista_perc, attivo: margini.costi_professionista_attivo },
    { nome: 'bonus_professionista', perc: margini.bonus_professionista_perc, attivo: margini.bonus_professionista_attivo },
    { nome: 'gestore_societa', perc: margini.gestore_societa_perc, attivo: margini.gestore_societa_attivo },
    { nome: 'commerciale', perc: margini.commerciale_perc, attivo: margini.commerciale_attivo },
    { nome: 'centrale_igs', perc: margini.centrale_igs_perc, attivo: margini.centrale_igs_attivo },
    { nome: 'network_igs', perc: margini.network_igs_perc, attivo: margini.network_igs_attivo }
  ];

  // Sottrai le percentuali NON attive dal totale
  let costoFinale = costoTotale;
  
  marginiConfig.forEach(m => {
    if (!m.attivo) {
      // Se NON attivo, sottrai questa percentuale dal totale
      const importoDaSottrarre = costoTotale * (parseFloat(m.perc || 0) / 100);
      costoFinale -= importoDaSottrarre;
    }
  });

  return costoFinale;
};

  // Gestione form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await api.post(`/client-resources/${clienteId}`, formData);
      
      setShowAddForm(false);
      resetForm();
      loadRisorse();
    } catch (error) {
      console.error('Errore assegnazione risorsa:', error);
      alert('Errore nell\'assegnazione della risorsa');
    }
  };

  const handleDelete = async (risorsaId) => {
    if (!window.confirm('Vuoi rimuovere questa risorsa dal cliente?')) return;
    
    try {
      await api.delete(`/client-resources/${clienteId}/${risorsaId}`);
      loadRisorse();
    } catch (error) {
      console.error('Errore rimozione risorsa:', error);
      alert('Errore nella rimozione della risorsa');
    }
  };

  const resetForm = () => {
    setFormData({
      risorsa_id: '',
      ore_assegnate: '',
      margini: {
        costo_azienda_perc: 25,
        costo_azienda_attivo: true,
        utile_gestore_azienda_perc: 12.5,
        utile_gestore_azienda_attivo: true,
        utile_igs_perc: 12.5,
        utile_igs_attivo: true,
        costi_professionista_perc: 20,
        costi_professionista_attivo: true,
        bonus_professionista_perc: 5,
        bonus_professionista_attivo: true,
        gestore_societa_perc: 3,
        gestore_societa_attivo: true,
        commerciale_perc: 8,
        commerciale_attivo: true,
        centrale_igs_perc: 4,
        centrale_igs_attivo: true,
        network_igs_perc: 10,
        network_igs_attivo: true
      }
    });
  };

  // Calcoli in tempo reale
  const selectedUser = availableUsers.find(u => u.id === formData.risorsa_id);
const costoOrarioBase = parseFloat(selectedUser?.costo_orario || 0);
  const costoOrarioFinale = calcolaCostoOrarioFinale(costoOrarioBase, formData.margini);
  const budgetRisorsa = costoOrarioFinale * parseFloat(formData.ore_assegnate || 0);
  const budgetTotale = risorse.reduce((sum, r) => sum + parseFloat(r.budget_risorsa || 0), 0);

  if (loading) {
    return <div className="animate-pulse">Caricamento risorse...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Risorse Assegnate</h3>
            <p className="text-sm text-gray-500">
              Budget totale: €{budgetTotale.toFixed(2)} / €{clienteBudget.toFixed(2)}
            </p>
          </div>
        </div>
        
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Aggiungi Risorsa
          </button>
        )}
      </div>

      {/* Form Aggiungi Risorsa */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Nuova Assegnazione</h4>
            <button
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selezione Risorsa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risorsa *
              </label>
              <select
                value={formData.risorsa_id}
                onChange={(e) => setFormData({ ...formData, risorsa_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleziona risorsa...</option>
                {availableUsers
                  .filter(u => !risorse.find(r => r.risorsa_id === u.id))
                  .map(user => (
                    <option key={user.id} value={user.id}>
                      {user.nome} - €{user.costo_orario}/h
                    </option>
                  ))}
              </select>
            </div>

            {/* Ore Assegnate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ore Assegnate *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.ore_assegnate}
                onChange={(e) => setFormData({ ...formData, ore_assegnate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Es: 100"
                required
              />
            </div>

            {/* Margini */}
            {selectedUser && (
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">Margini Applicabili</h5>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'costo_azienda', label: 'Costo Azienda', default: 25 },
                    { key: 'utile_gestore_azienda', label: 'Utile Gestore Azienda', default: 12.5 },
                    { key: 'utile_igs', label: 'Utile IGS', default: 12.5 },
                    { key: 'costi_professionista', label: 'Costi Professionista', default: 20 },
                    { key: 'bonus_professionista', label: 'Bonus Professionista', default: 5 },
                    { key: 'gestore_societa', label: 'Gestore Società', default: 3 },
                    { key: 'commerciale', label: 'Commerciale', default: 8 },
                    { key: 'centrale_igs', label: 'Centrale IGS', default: 4 },
                    { key: 'network_igs', label: 'Network IGS', default: 10 }
                  ].map(margine => (
                    <div key={margine.key} className="flex items-center gap-3 p-3 bg-white rounded border border-gray-200">
                      <input
                        type="checkbox"
                        checked={formData.margini[`${margine.key}_attivo`]}
                        onChange={(e) => setFormData({
                          ...formData,
                          margini: {
                            ...formData.margini,
                            [`${margine.key}_attivo`]: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700">
                          {margine.label}
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={formData.margini[`${margine.key}_perc`]}
                            onChange={(e) => setFormData({
                              ...formData,
                              margini: {
                                ...formData.margini,
                                [`${margine.key}_perc`]: parseFloat(e.target.value) || 0
                              }
                            })}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                            disabled={!formData.margini[`${margine.key}_attivo`]}
                          />
                          <span className="text-sm text-gray-500">%</span>
                          {formData.margini[`${margine.key}_attivo`] && (
  <span className="text-sm text-blue-600 font-medium">
    +€{(parseFloat(costoOrarioBase) * formData.margini[`${margine.key}_perc`] / 100).toFixed(2)}
  </span>
)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Riepilogo Calcoli */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Costo Orario Base:</span>
                      <span className="ml-2 font-semibold">€{costoOrarioBase.toFixed(2)}/h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Costo Orario Finale:</span>
                      <span className="ml-2 font-semibold text-blue-600">€{costoOrarioFinale.toFixed(2)}/h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Ore Assegnate:</span>
                      <span className="ml-2 font-semibold">{formData.ore_assegnate || 0}h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Budget Risorsa:</span>
                      <span className="ml-2 font-semibold text-green-600">€{budgetRisorsa.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={!selectedUser || !formData.ore_assegnate}
              >
                Assegna Risorsa
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista Risorse Assegnate */}
      {risorse.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nessuna risorsa assegnata a questo cliente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {risorse.map(risorsa => (
            <div
              key={risorsa.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{risorsa.risorsa_nome}</h4>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <span>Ore: {risorsa.ore_assegnate}h</span>
                  <span>Base: €{parseFloat(risorsa.costo_orario_base).toFixed(2)}/h</span>
                  <span className="text-blue-600 font-medium">
                    Finale: €{parseFloat(risorsa.costo_orario_finale).toFixed(2)}/h
                  </span>
                  <span className="text-green-600 font-semibold">
                    Budget: €{parseFloat(risorsa.budget_risorsa).toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(risorsa.risorsa_id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Rimuovi risorsa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientResourceAssignment;