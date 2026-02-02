const { body, param, query, validationResult } = require('express-validator');

// Middleware per gestire errori di validazione
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array().map(err => `${err.path}: ${err.msg}`).join(', ')
    });
  }
  next();
};

// Validazioni per utenti
const validateUserRegistration = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Nome must be between 2 and 255 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('ruolo')
    .isIn(['risorsa', 'manager'])
    .withMessage('Role must be either "risorsa" or "manager"'),
  body('compenso_annuale')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Annual compensation must be a positive number'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .notEmpty()
    .withMessage('Password required'),
  handleValidationErrors
];

// Validazioni per clienti
const validateClient = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Client name must be between 2 and 255 characters'),
  body('budget')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),
  body('descrizione')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  handleValidationErrors
];

// Validazioni per progetti
const validateProject = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Project name must be between 2 and 255 characters'),
  body('cliente_id')
    .isUUID()
    .withMessage('Valid client ID required'),
  body('budget_assegnato')
    .optional()  // 🆕 ORA È OPZIONALE (calcolato dalle risorse)
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Assigned budget must be a positive number'),
  body('descrizione')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('data_inizio')
    .optional()
    .isISO8601()
    .withMessage('Start date must be valid ISO date'),
  body('data_fine')
    .optional()
    .isISO8601()
    .withMessage('End date must be valid ISO date'),
  // 🆕 AGGIUNGI VALIDAZIONE RISORSE ASSEGNATE
  body('risorse_assegnate')
    .optional()
    .isArray()
    .withMessage('risorse_assegnate must be an array'),
  body('risorse_assegnate.*.risorsa_id')
    .optional()
    .isUUID()
    .withMessage('Each resource must have a valid risorsa_id (UUID)'),
  body('risorse_assegnate.*.ore_assegnate')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Each resource must have valid ore_assegnate (> 0)'),
  handleValidationErrors
];

// ✅ Validazioni per attività SENZA ore_stimate (ora automatiche!)
const validateActivity = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Activity name must be between 2 and 255 characters'),
  body('progetto_id')
    .isUUID()
    .withMessage('Valid project ID required'),
  body('scadenza')
    .isISO8601()
    .withMessage('Due date must be valid ISO datetime'),
  body('descrizione')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('risorse_assegnate')
    .isArray({ min: 1 })
    .withMessage('At least one resource must be assigned'),
  body('risorse_assegnate.*')
    .isUUID()
    .withMessage('Each assigned resource must be a valid UUID'),
  handleValidationErrors
];

// Validazioni per task
const validateTask = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Task name must be between 2 and 255 characters'),
  body('attivita_id')
    .isUUID()
    .withMessage('Valid activity ID required'),
  body('utente_assegnato')
    .isUUID()
    .withMessage('Valid user ID required'),
  body('ore_stimate')
    .isInt({ min: 1 })
    .withMessage('Estimated hours must be a positive integer (in minutes)'),
  body('scadenza')
    .isISO8601()
    .withMessage('Due date must be valid ISO datetime'),
  body('descrizione')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('task_collegata_id')
    .optional()
    .isUUID()
    .withMessage('Connected task must be a valid UUID'),
  handleValidationErrors
];

// Validazione per completamento task (richiede ore effettive)
const validateTaskCompletion = [
  body('ore_effettive')
    .isInt({ min: 1 })
    .withMessage('Actual hours are required and must be positive (in minutes)'),
  handleValidationErrors
];

// Validazioni per assegnazioni progetto
const validateProjectAssignment = [
  body('progetto_id')
    .isUUID()
    .withMessage('Valid project ID required'),
  body('assegnazioni')
    .isArray({ min: 1 })
    .withMessage('At least one assignment required'),
  body('assegnazioni.*.utente_id')
    .isUUID()
    .withMessage('Valid user ID required'),
  body('assegnazioni.*.ore_assegnate')
    .isInt({ min: 1 })
    .withMessage('Assigned hours must be positive'),
  handleValidationErrors
];

// Validazioni per parametri URL
const validateUUID = (paramName) => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`),
  handleValidationErrors
];

// Validazioni per query parameters
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['nome', 'data_creazione', 'data_aggiornamento', 'scadenza'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be "asc" or "desc"'),
  handleValidationErrors
];

const validateDateRange = [
  query('data_inizio')
    .optional()
    .isISO8601()
    .withMessage('Start date must be valid ISO date'),
  query('data_fine')
    .optional()
    .isISO8601()
    .withMessage('End date must be valid ISO date'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateClient,
  validateProject,
  validateActivity,
  validateTask,
  validateTaskCompletion,
  validateProjectAssignment,
  validateUUID,
  validatePagination,
  validateDateRange
};