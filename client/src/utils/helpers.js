import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

// Date utilities
export const formatDate = (date, formatString = 'dd/MM/yyyy') => {
  if (!date) return '';
  return format(new Date(date), formatString, { locale: it });
};

export const formatTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'HH:mm');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'dd/MM/yyyy HH:mm');
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  const targetDate = new Date(date);
  
  if (isToday(targetDate)) {
    return `Oggi alle ${formatTime(date)}`;
  } else if (isTomorrow(targetDate)) {
    return `Domani alle ${formatTime(date)}`;
  } else if (isYesterday(targetDate)) {
    return `Ieri alle ${formatTime(date)}`;
  } else {
    return formatDistanceToNow(targetDate, { 
      addSuffix: true, 
      locale: it 
    });
  }
};

export const isOverdue = (date) => {
  if (!date) return false;
  return new Date(date) < new Date();
};

export const isDueToday = (date) => {
  if (!date) return false;
  return isToday(new Date(date));
};

export const isDueSoon = (date, days = 3) => {
  if (!date) return false;
  const dueDate = new Date(date);
  const soon = new Date();
  soon.setDate(soon.getDate() + days);
  return dueDate <= soon && dueDate >= new Date();
};

export const getWeekDates = (date = new Date()) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(start, i));
  }
  
  return { start, end, dates };
};

// Status utilities
export const getStatusColor = (status) => {
  const colors = {
    'programmata': 'bg-gray-100 text-gray-800',
    'pianificata': 'bg-gray-100 text-gray-800',
    'in_esecuzione': 'bg-blue-100 text-blue-800',
    'completata': 'bg-green-100 text-green-800',
    'pending_approval': 'bg-yellow-100 text-yellow-800',
    'approvata': 'bg-green-100 text-green-800',
    'rifiutata': 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getStatusText = (status) => {
  const texts = {
    'programmata': 'Programmata',
    'pianificata': 'Pianificata',
    'in_esecuzione': 'In Corso',
    'completata': 'Completata',
    'pending_approval': 'In Approvazione',
    'approvata': 'Approvata',
    'rifiutata': 'Rifiutata',
  };
  return texts[status] || status;
};

export const getPriorityColor = (priority) => {
  const colors = {
    'low': 'bg-green-100 text-green-800',
    'medium': 'bg-yellow-100 text-yellow-800',
    'high': 'bg-orange-100 text-orange-800',
    'urgent': 'bg-red-100 text-red-800',
    'overdue': 'bg-red-500 text-white',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

export const getPriorityText = (priority) => {
  const texts = {
    'low': 'Bassa',
    'medium': 'Media',
    'high': 'Alta',
    'urgent': 'Urgente',
    'overdue': 'In Ritardo',
  };
  return texts[priority] || priority;
};

// Hours utilities
export const formatMinutesToHours = (minutes) => {
  if (!minutes || minutes === 0) return '0h';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
};

export const parseHoursToMinutes = (hoursString) => {
  if (!hoursString) return 0;
  
  // Parse formats like "2h 30min", "2.5h", "150min", "2:30"
  const str = hoursString.toLowerCase().trim();
  
  // Format: "2h 30min"
  const hoursMinutesMatch = str.match(/(\d+)h\s*(\d+)min/);
  if (hoursMinutesMatch) {
    return parseInt(hoursMinutesMatch[1]) * 60 + parseInt(hoursMinutesMatch[2]);
  }
  
  // Format: "2h"
  const hoursMatch = str.match(/(\d+(?:\.\d+)?)h/);
  if (hoursMatch) {
    return Math.round(parseFloat(hoursMatch[1]) * 60);
  }
  
  // Format: "150min"
  const minutesMatch = str.match(/(\d+)min/);
  if (minutesMatch) {
    return parseInt(minutesMatch[1]);
  }
  
  // Format: "2:30" or "2.5"
  if (str.includes(':')) {
    const [hours, minutes] = str.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  } else if (!isNaN(parseFloat(str))) {
    return Math.round(parseFloat(str) * 60);
  }
  
  return 0;
};

export const calculateProgress = (completed, total) => {
  if (!total || total === 0) return 0;
  return Math.round((completed / total) * 100);
};

// Text utilities
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const capitalize = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const initials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

// Validation utilities
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateRequired = (value) => {
  return value !== null && value !== undefined && value.toString().trim() !== '';
};

export const validateMinLength = (value, minLength) => {
  return value && value.length >= minLength;
};

export const validatePositiveNumber = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
};

// Array utilities
export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key];
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {});
};

export const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const filterBy = (array, filters) => {
  return array.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === 'all' || value === null || value === undefined) return true;
      return item[key] === value;
    });
  });
};

// Number utilities
export const formatCurrency = (amount, currency = 'EUR') => {
  if (amount === null || amount === undefined) return '';
  
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '';
  
  return new Intl.NumberFormat('it-IT', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined) return '';
  
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

// Local storage utilities
export const saveToLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const getFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

export const removeFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// URL utilities
export const buildURL = (base, params = {}) => {
  const url = new URL(base, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

export const getQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
};

// Device utilities
export const isMobile = () => {
  return window.innerWidth < 768;
};

export const isTablet = () => {
  return window.innerWidth >= 768 && window.innerWidth < 1024;
};

export const isDesktop = () => {
  return window.innerWidth >= 1024;
};

export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Color utilities
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const getContrastColor = (hexColor) => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#000000';
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

// Debounce utility
export const debounce = (func, wait, immediate) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

export default {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  isOverdue,
  isDueToday,
  isDueSoon,
  getWeekDates,
  getStatusColor,
  getStatusText,
  getPriorityColor,
  getPriorityText,
  formatMinutesToHours,
  parseHoursToMinutes,
  calculateProgress,
  truncateText,
  capitalize,
  initials,
  validateEmail,
  validateRequired,
  validateMinLength,
  validatePositiveNumber,
  groupBy,
  sortBy,
  filterBy,
  formatCurrency,
  formatPercentage,
  formatNumber,
  saveToLocalStorage,
  getFromLocalStorage,
  removeFromLocalStorage,
  buildURL,
  getQueryParams,
  isMobile,
  isTablet,
  isDesktop,
  isTouchDevice,
  hexToRgb,
  getContrastColor,
  debounce,
  copyToClipboard,
};
