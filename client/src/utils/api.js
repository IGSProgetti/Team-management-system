import axios from 'axios';
import toast from 'react-hot-toast';

// ✅ CONFIGURAZIONE PER RENDER
const getBaseURL = () => {
  // In produzione su Render, usa l'URL completo del backend
  if (window.location.hostname !== 'localhost') {
    return 'https://team-management-backend.onrender.com/api';
  }
  // In locale, usa il proxy o env variable
  return process.env.REACT_APP_API_URL || '/api';
};

// Create axios instance
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000, // Aumentato a 15s per Render (cold starts)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    let token = null;
    
    try {
      // Metodo 1: Token diretto (per compatibilità)
      token = localStorage.getItem('token');
      
      // Metodo 2: Token da auth-storage (Zustand store)
      if (!token) {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          try {
            const authData = JSON.parse(authStorage);
            token = authData?.state?.token;
          } catch (parseError) {
            console.warn('Error parsing auth-storage:', parseError);
            localStorage.removeItem('auth-storage');
          }
        }
      }
    } catch (error) {
      console.error('Error retrieving auth token:', error);
    }
    
    // Aggiungi token se presente e valido
    if (token && typeof token === 'string' && token.trim()) {
      config.headers.Authorization = `Bearer ${token.trim()}`;
    }
    
    // Log della request per debug
    console.log(`📤 API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  (error) => {
    const message = error.response?.data?.details || 
                   error.response?.data?.error || 
                   error.message || 
                   'Something went wrong';

    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      message: message,
      data: error.response?.data
    });

    // Handle specific error codes
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status === 403) {
      toast.error('Access denied. Insufficient permissions.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR') {
      toast.error('Network error. Check your connection.');
    } else {
      if (!error.config?.skipErrorToast) {
        toast.error(message);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  register: (userData) => 
    api.post('/auth/register', userData),
  
  refresh: (refreshToken) => 
    api.post('/auth/refresh', { refreshToken }),
  
  logout: () => 
    api.post('/auth/logout'),
  
  verify: () => 
    api.get('/auth/verify'),
};

// Users API
export const usersAPI = {
  getUsers: (params = {}) => 
    api.get('/users', { params }),
  
  // ✅ Lista semplice per dropdown (accessibile a tutti)
  getUsersList: () => 
    api.get('/users/list'),
  
  getProfile: () => 
    api.get('/users/profile'),
  
  updateProfile: (userId, data) => 
    api.put(`/users/${userId}`, data),
  
  getUserDetails: (userId) => 
    api.get(`/users/${userId}`),
  
  deactivateUser: (userId) => 
    api.delete(`/users/${userId}`),
  
  getUserHours: (userId, params = {}) => 
    api.get(`/users/${userId}/hours`, { params }),
};

// Clients API
export const clientsAPI = {
  getClients: (params = {}) => 
    api.get('/clients', { params }),
  
  createClient: (data) => 
    api.post('/clients', data),
  
  getClient: (clientId) => 
    api.get(`/clients/${clientId}`),
  
  updateClient: (clientId, data) => 
    api.put(`/clients/${clientId}`, data),
  
  deleteClient: (clientId) => 
    api.delete(`/clients/${clientId}`),
  
  getPendingApprovals: () => 
    api.get('/clients/pending-approval'),
  
  approveClient: (clientId, data) => 
    api.put(`/clients/${clientId}/approve`, data),
};

// Projects API
export const projectsAPI = {
  getProjects: (params = {}) => 
    api.get('/projects', { params }),
  
  createProject: (data) => 
    api.post('/projects', data),
  
  getProject: (projectId) => 
    api.get(`/projects/${projectId}`),
  
  updateProject: (projectId, data) => 
    api.put(`/projects/${projectId}`, data),
  
  deleteProject: (projectId) => 
    api.delete(`/projects/${projectId}`),
  
  assignResources: (projectId, data) => 
    api.post(`/projects/${projectId}/assign`, data),
  
  approveProject: (projectId, data) => 
    api.put(`/projects/${projectId}/approve`, data),
};

// Activities API
export const activitiesAPI = {
  getActivities: (params = {}) => 
    api.get('/activities', { params }),
  
  createActivity: (data) => 
    api.post('/activities', data),
  
  getActivity: (activityId) => 
    api.get(`/activities/${activityId}`),
  
  updateActivity: (activityId, data) => 
    api.put(`/activities/${activityId}`, data),
  
  deleteActivity: (activityId) => 
    api.delete(`/activities/${activityId}`),
};

// Tasks API
export const tasksAPI = {
  getTasks: (params = {}) => 
    api.get('/tasks', { params }),
  
  createTask: (data) => 
    api.post('/tasks', data),
  
  getTask: (taskId) => 
    api.get(`/tasks/${taskId}`),
  
  updateTask: (taskId, data) => 
    api.put(`/tasks/${taskId}`, data),
  
  completeTask: (taskId, data) => 
    api.put(`/tasks/${taskId}/complete`, data),
  
  deleteTask: (taskId) => 
    api.delete(`/tasks/${taskId}`),
};

// Dashboard API
export const dashboardAPI = {
  getOverview: () => 
    api.get('/dashboard/overview'),
  
  getUsersPerformance: (params = {}) => 
    api.get('/dashboard/users-performance', { params }),
  
  getProjectsCosts: (params = {}) => 
    api.get('/dashboard/projects-costs', { params }),
};

// Calendar API
export const calendarAPI = {
  getEvents: (params = {}) => 
    api.get('/calendar/events', { params }),
  
  createEvent: (data) => 
    api.post('/calendar/events', data),
};

// Budget Control API
export const budgetAPI = {
  getOverview: () => 
    api.get('/budget/overview'),
  
  getUnusedHours: (params = {}) => 
    api.get('/budget/unused-hours', { params }),
  
  reassignHours: (data) => 
    api.post('/budget/reassign-hours', data),
  
  getReassignmentHistory: (params = {}) => 
    api.get('/budget/reassignment-history', { params }),
};

export default api;