import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, ChevronRight, X, Save } from 'lucide-react';
import api from '../utils/api';
import ResourceDrillDownModal from './ResourceDrillDownModal';

const ClientResourceAssignment = ({ clienteId, clienteBudget, clienteNome }) => {
  const [risorse, setRisorse] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // State per modal drill-down
  const [selectedRisorsa, setSelectedRisorsa] = useState(null);
  const [showDrillDownModal, setShowDrillDownModal] = useState(false);

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

  useEffect(() => {
    loadRisorse();
    loadAvailableUsers();
  }, [clienteId]);

  const loadRisorse = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/client-resources/${clienteId}`);
      setRisorse(response.data.risorse || []);
    } catch (error) {
      console.error('Errore caricamento risorse:', error);
      setRisorse([]);
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

  const handleDelete = async (risorsaId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Vuoi rimuovere questa risorsa dal cliente?')) return;
    
    try {
      await api.delete(`/client-resources/${clienteId}/${risorsaId}`);
      loadRisorse();
    } catch (error) {
      console.error('Errore rimozione risorsa:', error);
      alert('Errore nella rimozione della risorsa');
    }
  };

  const handleRisorsaClick = (risorsa) => {
    setSelectedRisorsa(risorsa);
    setShowDrillDownModal(true);
  };

  // Ottieni risorsa selezionata per mostrare costo orario
  const selectedUser = availableUsers.find(u => u.id === formData.risorsa_id);
  const costoOrarioBase = selectedUser?.costo_orario || 0;
  const costoOrarioFinale = selectedUser ? calcolaCostoOrarioFinale(costoOrarioBase, formData.margini) : 0;
  const budgetRisorsa = formData.ore_assegnate ? parseFloat(formData.ore_assegnate) * costoOrarioFinale : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Risorse Assegnate al Cliente</h2>
              <p className="text-sm text-gray-500 mt-1">
                Click su una risorsa per vedere progetti, aree, attività e task
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                     hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Annulla
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Assegna Risorsa
              </>
            )}
          </button>
        </div>

        {/* FORM ASSEGNAZIONE RISORSA */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assegna Nuova Risorsa</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Seleziona Risorsa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleziona Risorsa *
                </label>
                <select
                  value={formData.risorsa_id}
                  onChange={(e) => setFormData({ ...formData, risorsa_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                           focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleziona una risorsa...</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.nome} - €{parseFloat(user.costo_orario || 0).toFixed(2)}/h
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
                  min="0"
                  step="1"
                  value={formData.ore_assegnate}
                  onChange={(e) => setFormData({ ...formData, ore_assegnate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                           focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Es: 100"
                  required
                />
              </div>
            </div>

            {/* MARGINI PERSONALIZZABILI */}
            {selectedUser && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Margini e Costi</h4>
                
                {/* Riepilogo Costi */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Costo Orario Base</p>
                    <p className="text-lg font-bold text-gray-900">€{costoOrarioBase.toFixed(2)}/h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Costo Orario Finale</p>
                    <p className="text-lg font-bold text-blue-600">€{costoOrarioFinale.toFixed(2)}/h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Budget Totale Risorsa</p>
                    <p className="text-lg font-bold text-green-600">€{budgetRisorsa.toFixed(2)}</p>
                  </div>
                </div>

                {/* Checkbox Margini */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'costo_azienda', label: 'Costo Azienda', defaultPerc: 25 },
                    { key: 'utile_gestore_azienda', label: 'Utile Gestore Azienda', defaultPerc: 12.5 },
                    { key: 'utile_igs', label: 'Utile IGS', defaultPerc: 12.5 },
                    { key: 'costi_professionista', label: 'Costi Professionista', defaultPerc: 20 },
                    { key: 'bonus_professionista', label: 'Bonus Professionista', defaultPerc: 5 },
                    { key: 'gestore_societa', label: 'Gestore Società', defaultPerc: 3 },
                    { key: 'commerciale', label: 'Commerciale', defaultPerc: 8 },
                    { key: 'centrale_igs', label: 'Centrale IGS', defaultPerc: 4 },
                    { key: 'network_igs', label: 'Network IGS', defaultPerc: 10 }
                  ].map(margine => {
                    const isActive = formData.margini[`${margine.key}_attivo`];
                    const perc = formData.margini[`${margine.key}_perc`];
                    const importo = (costoOrarioBase * 5 * perc / 100).toFixed(2);
                    
                    return (
                      <div key={margine.key} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setFormData({
                              ...formData,
                              margini: {
                                ...formData.margini,
                                [`${margine.key}_attivo`]: e.target.checked
                              }
                            })}
                            className="w-4 h-4 text-blue-600"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{margine.label}</p>
                            <p className="text-xs text-gray-500">{perc}% = €{importo}/h</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg 
                         hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         transition-colors flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Assegna Risorsa
              </button>
            </div>
          </form>
        )}

        {/* LISTA RISORSE */}
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
                onClick={() => handleRisorsaClick(risorsa)}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 
                         rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md 
                         transition-all cursor-pointer group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {risorsa.risorsa_nome}
                    </h4>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      Risorsa
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-gray-700">Ore:</span>
                      {risorsa.ore_assegnate}h
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-gray-700">Base:</span>
                      €{parseFloat(risorsa.costo_orario_base).toFixed(2)}/h
                    </span>
                    <span className="flex items-center gap-1 text-blue-600 font-medium">
                      <span className="font-semibold text-gray-700">Finale:</span>
                      €{parseFloat(risorsa.costo_orario_finale).toFixed(2)}/h
                    </span>
                    <span className="flex items-center gap-1 text-green-600 font-semibold">
                      <span className="font-semibold text-gray-700">Budget:</span>
                      €{parseFloat(risorsa.budget_risorsa).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(risorsa.risorsa_id, e)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Rimuovi risorsa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center gap-2 pl-4 border-l border-gray-300">
                    <span className="text-sm text-gray-500 group-hover:text-blue-600 transition-colors">
                      Vedi progetti
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Drill-Down */}
      <ResourceDrillDownModal
        isOpen={showDrillDownModal}
        onClose={() => {
          setShowDrillDownModal(false);
          setSelectedRisorsa(null);
        }}
        risorsa={selectedRisorsa}
        clienteId={clienteId}
        clienteNome={clienteNome}
      />
    </>
  );
};

export default ClientResourceAssignment;