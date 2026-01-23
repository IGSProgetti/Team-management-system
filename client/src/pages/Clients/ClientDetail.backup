import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, DollarSign, Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';
import ClientResourceAssignment from '../../components/ClientResourceAssignment';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCliente();
  }, [id]);

  const loadCliente = async () => {
    try {
      const response = await api.get(`/clients/${id}`);
      setCliente(response.data.client || response.data);
    } catch (error) {
      console.error('Errore caricamento cliente:', error);
      setError('Impossibile caricare i dettagli del cliente');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {error || 'Cliente non trovato'}
        </h3>
        <button
          onClick={() => navigate('/clients')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Torna ai Clienti
        </button>
      </div>
    );
  }

  const budgetUtilizzato = parseFloat(cliente.budget_utilizzato || 0);
  const budgetTotale = parseFloat(cliente.budget || 0);
  const budgetDisponibile = budgetTotale - budgetUtilizzato;
  const percentualeUtilizzo = budgetTotale > 0 ? (budgetUtilizzato / budgetTotale) * 100 : 0;

  const getStatoColor = (stato) => {
    switch (stato) {
      case 'approvata': return 'text-green-700 bg-green-50 border-green-200';
      case 'pending_approval': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'rifiutata': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatoLabel = (stato) => {
    switch (stato) {
      case 'approvata': return 'Approvato';
      case 'pending_approval': return 'In Attesa';
      case 'rifiutata': return 'Rifiutato';
      default: return stato;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con breadcrumb */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/clients')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span>Clienti</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">{cliente.nome}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{cliente.nome}</h1>
        </div>

        <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatoColor(cliente.stato_approvazione)}`}>
          {getStatoLabel(cliente.stato_approvazione)}
        </div>
      </div>

      {/* Card Informazioni Cliente */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Informazioni Cliente
            </h2>
            {cliente.descrizione && (
              <p className="text-gray-600">{cliente.descrizione}</p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Budget Totale */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Budget Totale</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              €{budgetTotale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Budget Utilizzato */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Budget Utilizzato</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              €{budgetUtilizzato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-blue-600 mb-1">
                <span>{percentualeUtilizzo.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(percentualeUtilizzo, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Budget Disponibile */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Budget Disponibile</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              €{budgetDisponibile.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Metadati */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {cliente.creato_da_nome && (
              <div>
                <span className="text-gray-500">Creato da:</span>
                <span className="ml-2 font-medium text-gray-900">{cliente.creato_da_nome}</span>
              </div>
            )}
            {cliente.data_creazione && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Creato il:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(cliente.data_creazione).toLocaleDateString('it-IT')}
                </span>
              </div>
            )}
            {cliente.numero_progetti !== undefined && (
              <div>
                <span className="text-gray-500">Progetti:</span>
                <span className="ml-2 font-medium text-gray-900">{cliente.numero_progetti}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Componente Assegnazione Risorse */}
      <ClientResourceAssignment 
        clienteId={id} 
        clienteBudget={budgetTotale}
      />
    </div>
  );
};

export default ClientDetail;