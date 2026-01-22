const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'team-management-secret-key-change-in-production';

// Middleware per autenticazione
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access Denied', 
        details: 'Token required' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verifica che l'utente esista ancora nel database
    const result = await query(
      'SELECT id, nome, email, ruolo, attivo FROM utenti WHERE id = $1 AND attivo = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Access Denied', 
        details: 'User not found or inactive' 
      });
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      ruolo: decoded.ruolo,
      ...result.rows[0]
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Access Denied', 
        details: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Access Denied', 
        details: 'Token expired' 
      });
    }

    return res.status(500).json({ 
      error: 'Server Error', 
      details: 'Authentication failed' 
    });
  }
};

// Middleware per autorizzazione manager
const requireManager = (req, res, next) => {
  if (req.user && req.user.ruolo === 'manager') {
    next();
  } else {
    res.status(403).json({ 
      error: 'Access Denied', 
      details: 'Manager role required' 
    });
  }
};

// Middleware per autorizzazione risorsa (o manager)
const requireResource = (req, res, next) => {
  if (req.user && (req.user.ruolo === 'risorsa' || req.user.ruolo === 'manager')) {
    next();
  } else {
    res.status(403).json({ 
      error: 'Access Denied', 
      details: 'Resource or Manager role required' 
    });
  }
};

// Helper per generare token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      ruolo: user.ruolo 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Helper per refresh token (da implementare per sessioni lunghe)
const generateRefreshToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      type: 'refresh' 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = {
  authenticateToken,
  requireManager,
  requireResource,
  generateToken,
  generateRefreshToken,
  JWT_SECRET
};
