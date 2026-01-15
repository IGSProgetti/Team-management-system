import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { Eye, EyeOff, User, Mail, Lock, DollarSign } from 'lucide-react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    ruolo: 'risorsa',
    compenso_annuale: 30000
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome obbligatorio';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email obbligatoria';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email non valida';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password obbligatoria';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password minimo 6 caratteri';
    }
    
    if (!formData.compenso_annuale || formData.compenso_annuale <= 0) {
      newErrors.compenso_annuale = 'Compenso annuale obbligatorio';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await register(formData);
      // Il redirect sarà gestito dal hook useAuth
    } catch (error) {
      console.error('Errore registrazione:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'compenso_annuale' ? Number(value) : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Registrazione Team Management
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Crea il tuo account per iniziare
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="nome"
                type="text"
                value={formData.nome}
                onChange={handleChange}
                className={`pl-10 block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.nome ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Es: Mario Rossi"
              />
            </div>
            {errors.nome && <p className="mt-1 text-sm text-red-600">{errors.nome}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={`pl-10 block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="mario@azienda.com"
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                className={`pl-10 pr-10 block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Minimo 6 caratteri"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 
                  <EyeOff className="h-5 w-5 text-gray-400" /> : 
                  <Eye className="h-5 w-5 text-gray-400" />
                }
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

          {/* Ruolo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ruolo
            </label>
            <select
              name="ruolo"
              value={formData.ruolo}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="risorsa">Risorsa</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          {/* Compenso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compenso annuale (€)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="compenso_annuale"
                type="number"
                min="1"
                step="100"
                value={formData.compenso_annuale}
                onChange={handleChange}
                className={`pl-10 block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.compenso_annuale ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="30000"
              />
            </div>
            {errors.compenso_annuale && <p className="mt-1 text-sm text-red-600">{errors.compenso_annuale}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Registrazione...
              </div>
            ) : (
              'Registra Account'
            )}
          </button>

          {/* Link Login */}
          <div className="text-center">
            <Link 
              to="/login" 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Hai già un account? Accedi qui
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;