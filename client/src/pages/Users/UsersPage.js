import React, { useState } from 'react';
import { 
  Plus, 
  Users, 
  ShieldCheck,
  UserCheck, 
  DollarSign,
  Clock,
  Calendar,
  MoreHorizontal,
  Filter,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../hooks';

// Utils
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const getRoleBadge = (ruolo) => {
  return ruolo === 'manager' ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                   bg-purple-100 text-purple-800 border border-purple-200">
      <ShieldCheck className="w-3 h-3 mr-1" />
      Manager
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                   bg-blue-100 text-blue-800 border border-blue-200">
      <UserCheck className="w-3 h-3 mr-1" />
      Risorsa
    </span>
  );
};

// Component UserCard
const UserCard = ({ user, onEdit, onView, onDeactivate }) => {
  const [showMenu, setShowMenu] = useState(false);

  const costoOrarioDisplay = user.costo_orario_manuale ? 
    `${formatCurrency(user.costo_orario)}/h (manuale)` :
    `${formatCurrency(user.costo_orario)}/h (auto)`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 
                    hover:border-gray-300 group cursor-pointer">
      
      {/* Header con nome e ruolo */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 
                         transition-colors line-clamp-1 mb-2">
            {user.nome}
          </h3>
          {getRoleBadge(user.ruolo)}
        </div>
        
        {/* Menu dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                     rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              <div className="py-1">
                <button
                  onClick={() => { onView(user); setShowMenu(false); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Eye className="w-4 h-4 mr-3" />
                  Visualizza
                </button>
                <button
                  onClick={() => { onEdit(user); setShowMenu(false); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Edit className="w-4 h-4 mr-3" />
                  Modifica
                </button>
                <button
                  onClick={() => { onDeactivate(user); setShowMenu(false); }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-3" />
                  Disattiva
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email */}
      <p className="text-sm text-gray-600 mb-4">{user.email}</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <DollarSign className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">Compenso</span>
          </div>
          <div className="font-semibold text-green-900 text-xs">
            {formatCurrency(user.compenso_annuale)}/anno
          </div>
        </div>
        
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <Clock className="w-4 h-4 text-blue-600 mr-1" />
            <span className="text-sm text-blue-600">Costo/h</span>
          </div>
          <div className="font-semibold text-blue-900 text-xs">
            {formatCurrency(user.costo_orario)}
          </div>
        </div>
      </div>

      {/* Ore disponibili */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600">Ore Disponibili/Anno</span>
          <span className="text-sm font-medium text-gray-900">
            {user.ore_disponibili_anno}h {user.ore_disponibili_manuale ? '(manuale)' : '(auto)'}
          </span>
        </div>
      </div>

      {/* Footer con data creazione */}
      <div className="pt-4 border-t border-gray-100 text-sm text-gray-500">
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          Creato {new Date(user.data_creazione).toLocaleDateString('it-IT')}
        </div>
      </div>
    </div>
  );
};

// Component CreateUserModal
const CreateUserModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    ruolo: 'risorsa',
    compenso_annuale: '',
    costo_orario_manuale: false,
    costo_orario: '',
    ore_disponibili_manuale: false,
    ore_disponibili: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form quando si apre/chiude
  React.useEffect(() => {
    if (!isOpen) {
      setFormData({
        nome: '',
        email: '',
        password: '',
        ruolo: 'risorsa',
        compenso_annuale: '',
        costo_orario_manuale: false,
        costo_orario: '',
        ore_disponibili_manuale: false,
        ore_disponibili: ''
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome?.trim()) {
      newErrors.nome = 'Il nome è obbligatorio';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'L\'email è obbligatoria';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Inserisci un\'email valida';
    }

    if (!formData.password?.trim()) {
      newErrors.password = 'La password è obbligatoria';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La password deve essere di almeno 6 caratteri';
    }

    if (!formData.compenso_annuale) {
      newErrors.compenso_annuale = 'Il compenso annuale è obbligatorio';
    } else if (isNaN(parseFloat(formData.compenso_annuale)) || parseFloat(formData.compenso_annuale) <= 0) {
      newErrors.compenso_annuale = 'Inserisci un compenso valido';
    }

    if (formData.costo_orario_manuale && (!formData.costo_orario || isNaN(parseFloat(formData.costo_orario)))) {
      newErrors.costo_orario = 'Inserisci un costo orario valido';
    }

    if (formData.ore_disponibili_manuale && (!formData.ore_disponibili || isNaN(parseInt(formData.ore_disponibili)))) {
      newErrors.ore_disponibili = 'Inserisci ore disponibili valide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Rimuovi errore se l'utente ha corretto
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Chiamata API reale
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: formData.nome.trim(),
          email: formData.email.trim(),
          password: formData.password,
          ruolo: formData.ruolo,
          compenso_annuale: parseFloat(formData.compenso_annuale),
          costo_orario_manuale: formData.costo_orario_manuale,
          costo_orario: formData.costo_orario_manuale ? parseFloat(formData.costo_orario) : null,
          ore_disponibili_manuale: formData.ore_disponibili_manuale,
          ore_disponibili: formData.ore_disponibili_manuale ? parseInt(formData.ore_disponibili) : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Errore durante la creazione');
      }

      const result = await response.json();
      console.log('Utente creato:', result);

      // Notifica successo
      alert(`Utente ${formData.nome} creato con successo!`); // Sostituire con toast
      
      // Chiudi modal e callback
      onClose();
      if (onSubmit) onSubmit(result.user);
      
    } catch (error) {
      console.error('Errore creazione utente:', error);
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Nuovo Utente
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Crea un nuovo utente del sistema con ruolo e compenso
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          
          {/* Nome */}
          <div className="mb-4">
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleInputChange}
              placeholder="es. Mario Rossi"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.nome ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.nome && <p className="text-sm text-red-600 mt-1">{errors.nome}</p>}
          </div>

          {/* Email */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="mario.rossi@team.com"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Minimo 6 caratteri"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
          </div>

          {/* Ruolo */}
          <div className="mb-4">
            <label htmlFor="ruolo" className="block text-sm font-medium text-gray-700 mb-2">
              Ruolo *
            </label>
            <select
              id="ruolo"
              name="ruolo"
              value={formData.ruolo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
            >
              <option value="risorsa">Risorsa</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          {/* Compenso Annuale */}
          <div className="mb-4">
            <label htmlFor="compenso_annuale" className="block text-sm font-medium text-gray-700 mb-2">
              Compenso Annuale * <span className="text-gray-500">(EUR)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
              <input
                type="number"
                id="compenso_annuale"
                name="compenso_annuale"
                value={formData.compenso_annuale}
                onChange={handleInputChange}
                placeholder="35000"
                min="0"
                step="1000"
                className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.compenso_annuale ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
            </div>
            {errors.compenso_annuale && <p className="text-sm text-red-600 mt-1">{errors.compenso_annuale}</p>}
          </div>

          {/* Costo Orario Opzioni */}
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="costo_orario_manuale"
                name="costo_orario_manuale"
                checked={formData.costo_orario_manuale}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="costo_orario_manuale" className="ml-2 text-sm text-gray-700">
                Imposta costo orario manualmente
              </label>
            </div>
            
            {formData.costo_orario_manuale && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
                <input
                  type="number"
                  id="costo_orario"
                  name="costo_orario"
                  value={formData.costo_orario}
                  onChange={handleInputChange}
                  placeholder="25"
                  min="0"
                  step="0.5"
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.costo_orario ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.costo_orario && <p className="text-sm text-red-600 mt-1">{errors.costo_orario}</p>}
              </div>
            )}
            
            {!formData.costo_orario_manuale && (
              <p className="text-xs text-gray-500">
                Calcolato automaticamente: €{formData.compenso_annuale ? (parseFloat(formData.compenso_annuale) / 220 / 5).toFixed(2) : '0.00'}/h
              </p>
            )}
          </div>

          {/* Ore Disponibili Opzioni */}
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="ore_disponibili_manuale"
                name="ore_disponibili_manuale"
                checked={formData.ore_disponibili_manuale}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="ore_disponibili_manuale" className="ml-2 text-sm text-gray-700">
                Imposta ore disponibili manualmente
              </label>
            </div>
            
            {formData.ore_disponibili_manuale && (
              <input
                type="number"
                id="ore_disponibili"
                name="ore_disponibili"
                value={formData.ore_disponibili}
                onChange={handleInputChange}
                placeholder="1760"
                min="0"
                step="40"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.ore_disponibili ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
            )}
            
            {!formData.ore_disponibili_manuale && (
              <p className="text-xs text-gray-500">
                Calcolato automaticamente: 1760h/anno (8h/giorno × 220 giorni)
              </p>
            )}
            {errors.ore_disponibili && <p className="text-sm text-red-600 mt-1">{errors.ore_disponibili}</p>}
          </div>

          {/* Errore submit */}
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crea Utente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main UsersPage Component  
const UsersPage = () => {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    ruolo: 'all'
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch utenti da API
  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Utenti caricati:', data.users);
          setUsers(data.users || []);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('Errore fetch utenti:', error);
        // Nessun fallback per gli utenti - è una pagina manager only
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Solo manager può accedere
  if (user?.ruolo !== 'manager') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldCheck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Accesso Negato</h3>
          <p className="text-gray-500">
            Solo i manager possono gestire gli utenti
          </p>
        </div>
      </div>
    );
  }

  // Filtri
  const filteredUsers = users.filter(user => {
    if (filters.ruolo === 'all') return true;
    return user.ruolo === filters.ruolo;
  });

  const statsData = {
    totale: users.length,
    manager: users.filter(u => u.ruolo === 'manager').length,
    risorse: users.filter(u => u.ruolo === 'risorsa').length,
    costo_totale: users.reduce((sum, u) => sum + (Number(u.compenso_annuale) || 0), 0)
  };

  const handleUserCreated = (newUser) => {
    setUsers(prev => [newUser, ...prev]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Utenti</h1>
          <p className="text-gray-500 mt-1">
            Crea e gestisci utenti del sistema con ruoli e compensi
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                   hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Utente
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-blue-900">
                {statsData.totale}
              </div>
              <div className="text-sm text-blue-600">Totale Utenti</div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-purple-900">
                {statsData.manager}
              </div>
              <div className="text-sm text-purple-600">Manager</div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-900">
                {statsData.risorse}
              </div>
              <div className="text-sm text-green-600">Risorse</div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-yellow-900">
                {formatCurrency(statsData.costo_totale)}
              </div>
              <div className="text-sm text-yellow-600">Costo Totale</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtri:</span>
        </div>

        <select
          value={filters.ruolo}
          onChange={(e) => setFilters({ ...filters, ruolo: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 
                   focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Tutti i ruoli</option>
          <option value="manager">Solo Manager</option>
          <option value="risorsa">Solo Risorse</option>
        </select>

        {filters.ruolo !== 'all' && (
          <button
            onClick={() => setFilters({ ruolo: 'all' })}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Cancella filtri
          </button>
        )}
      </div>

      {/* Lista Utenti */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <UserCard 
              key={user.id} 
              user={user}
              onView={(user) => console.log('View:', user)}
              onEdit={(user) => console.log('Edit:', user)}
              onDeactivate={(user) => console.log('Deactivate:', user)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {filters.ruolo === 'all' ? 'Nessun utente trovato' : `Nessun ${filters.ruolo} trovato`}
          </h3>
          <p className="text-gray-500 mb-6">
            {filters.ruolo === 'all' 
              ? 'Crea il primo utente per iniziare a gestire il team'
              : 'Prova a modificare i filtri per vedere altri utenti'
            }
          </p>
          {filters.ruolo === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                       hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crea Primo Utente
            </button>
          )}
        </div>
      )}

      {/* Modal Creazione Utente */}
      {showCreateModal && (
        <CreateUserModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleUserCreated}
        />
      )}
    </div>
  );
};

export default UsersPage;