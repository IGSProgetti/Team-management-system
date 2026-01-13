import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Store
import { useAuthStore, useUIStore } from './store';

import LoginPage from './pages/Auth/LoginPage';
import { RegisterPage, ActivitiesPage, ProjectsPage, ClientsPage, CalendarPage, ProfilePage, UsersPage } from './pages';
import DashboardPage from './pages/Dashboard/DashboardPage';
import TasksPage from './pages/Tasks/TasksPage';

// Components
import Layout from './components/Layout';
import { LoadingSpinner, ErrorBoundary } from './components';

// Hooks
import { useAuth, useOnlineStatus } from './hooks';

// Styles
import './styles/index.css';

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error.response?.status >= 400 && error.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Component (redirect if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Manager Only Route
const ManagerRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.ruolo !== 'manager') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Offline Banner Component
const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-2 text-center text-sm font-medium"
    >
      ⚠️ Sei offline. Alcune funzionalità potrebbero non essere disponibili.
    </motion.div>
  );
};

// Main App Component
function App() {
  const { theme } = useUIStore();

  // Apply theme to document
  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  // Check for saved auth on app start
  useEffect(() => {
    const savedAuth = localStorage.getItem('auth-storage');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        if (authData.state?.token) {
          // Token exists, the auth store will handle it
          console.log('Found saved authentication');
        }
      } catch (error) {
        console.error('Error parsing saved auth:', error);
        localStorage.removeItem('auth-storage');
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="App min-h-screen bg-gray-50">
            <OfflineBanner />
            
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                className: 'text-sm',
                style: {
                  borderRadius: '12px',
                  padding: '12px 16px',
                },
                success: {
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#FFFFFF',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#FFFFFF',
                  },
                },
              }}
            />

            <AnimatePresence mode="wait">
              <Routes>
                {/* Public Routes */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicRoute>
                      <RegisterPage />
                    </PublicRoute>
                  }
                />

                {/* Protected Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  {/* Dashboard */}
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />

                  {/* Tasks & Activities */}
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="activities" element={<ActivitiesPage />} />

                  {/* Projects & Clients */}
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="clients" element={<ClientsPage />} />

                  {/* Calendar */}
                  <Route path="calendar" element={<CalendarPage />} />

                  {/* Profile */}
                  <Route path="profile" element={<ProfilePage />} />

                  {/* Manager Only Routes */}
                  <Route
                    path="users"
                    element={
                      <ManagerRoute>
                        <UsersPage />
                      </ManagerRoute>
                    }
                  />
                </Route>

                {/* Catch all - redirect to dashboard */}
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <Navigate to="/dashboard" replace />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </AnimatePresence>
          </div>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
