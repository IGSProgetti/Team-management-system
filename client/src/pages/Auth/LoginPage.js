import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckSquare, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    email: 'manager@team.com', // Pre-filled for testing
    password: 'password123'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email richiesta';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email non valida';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password richiesta';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await login(formData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <CheckSquare className="w-7 h-7 text-white" />
            </div>
            <div className="ml-3">
              <h1 className="text-2xl font-bold text-gray-900">Team Manager</h1>
              <p className="text-sm text-gray-600">Sistema Gestione Team</p>
            </div>
          </div>
        </div>

        <h2 className="mt-8 text-center text-3xl font-bold tracking-tight text-gray-900">
          Accedi al tuo account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Gestisci i tuoi progetti e task in modo efficace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 mx-4 sm:mx-0">
          {/* Demo Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Account Demo:</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <div><strong>Manager:</strong> manager@team.com / password123</div>
              <div><strong>Risorsa:</strong> mario@team.com / password123</div>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="La tua email"
                />
                {errors.email && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-12 py-3 border rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="La tua password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Ricordami
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Password dimenticata?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white transition-all duration-200 ${
                  loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 hover:shadow-lg'
                }`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Accesso in corso...
                  </div>
                ) : (
                  'Accedi'
                )}
              </button>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Non hai un account?{' '}
                <Link
                  to="/register"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Registrati
                </Link>
              </span>
            </div>
          </form>

          {/* Quick Actions */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-4">Accesso rapido demo:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setFormData({ email: 'manager@team.com', password: 'password123' });
                    handleSubmit({ preventDefault: () => {} });
                  }}
                  className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  👨‍💼 Manager
                </button>
                <button
                  onClick={() => {
                    setFormData({ email: 'mario@team.com', password: 'password123' });
                    handleSubmit({ preventDefault: () => {} });
                  }}
                  className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  👨‍💻 Risorsa
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Sviluppato con ❤️ per la gestione efficace dei team
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
