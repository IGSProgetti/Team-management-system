import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token (VERSIONE CORRETTA)
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
            // Fallback: prova a pulire e riprovare
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
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const message = error.response?.data?.details || 
                   error.response?.data?.error || 
                   error.message || 
                   'Something went wrong';

    // Handle specific error codes
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status === 403) {
      toast.error('Access denied. Insufficient permissions.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.code === 'NETWORK_ERROR') {
      toast.error('Network error. Check your connection.');
    } else {
      // Don't show toast for expected errors (like validation)
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
  
  getProjectsPerformance: (params = {}) => 
    api.get('/dashboard/projects-performance', { params }),
  
  // AGGIUNGI QUESTO:
  getUserDetail: (userId) => 
    api.get(`/dashboard/user-detail/${userId}`),
};

// Calendar API
export const calendarAPI = {
  getEvents: (params = {}) => 
    api.get('/calendar/events', { params }),
  
  getDayEvents: (date, params = {}) => 
    api.get(`/calendar/day/${date}`, { params }),
  
  getWeekEvents: (startDate, params = {}) => 
    api.get(`/calendar/week/${startDate}`, { params }),
  
  getMonthEvents: (year, month, params = {}) => 
    api.get(`/calendar/month/${year}/${month}`, { params }),
  
  getUpcomingEvents: (params = {}) => 
    api.get('/calendar/upcoming', { params }),
};

// Utility functions
export const uploadFile = (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentage = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentage);
      }
    },
  });
};

// Health check
export const healthCheck = () => api.get('/health');

// Generic CRUD operations helper
export const createCRUDAPI = (endpoint) => ({
  getAll: (params = {}) => api.get(`/${endpoint}`, { params }),
  create: (data) => api.post(`/${endpoint}`, data),
  getOne: (id) => api.get(`/${endpoint}/${id}`),
  update: (id, data) => api.put(`/${endpoint}/${id}`, data),
  delete: (id) => api.delete(`/${endpoint}/${id}`),
});

export default api;