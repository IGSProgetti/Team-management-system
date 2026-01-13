const express = require('express');
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/database');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

const router = express.Router();

// POST /api/auth/register - Registrazione nuovo utente
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { nome, email, password, ruolo, compenso_annuale, costo_orario_manuale, costo_orario, ore_disponibili_manuale, ore_disponibili } = req.body;

    // Verifica se l'email è già in uso
    const existingUser = await query('SELECT id FROM utenti WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'Registration Error',
        details: 'Email already in use'
      });
    }

    // Hash della password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Calcolo costo orario e ore disponibili
    const finalCostoOrario = costo_orario_manuale ? costo_orario : compenso_annuale / 220 / 5;
    const finalOreDisponibili = ore_disponibili_manuale ? ore_disponibili : 8 * 220;

    // Inserimento utente nel database
    const result = await query(`
      INSERT INTO utenti (
        nome, email, password_hash, ruolo, compenso_annuale,
        costo_orario, costo_orario_manuale,
        ore_disponibili_anno, ore_disponibili_manuale
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, nome, email, ruolo, compenso_annuale, costo_orario, ore_disponibili_anno, data_creazione
    `, [
      nome, email, password_hash, ruolo, compenso_annuale,
      finalCostoOrario, costo_orario_manuale || false,
      finalOreDisponibili, ore_disponibili_manuale || false
    ]);

    const user = result.rows[0];

    // Genera tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        ruolo: user.ruolo,
        compenso_annuale: user.compenso_annuale,
        costo_orario: user.costo_orario,
        ore_disponibili_anno: user.ore_disponibili_anno,
        data_creazione: user.data_creazione
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to register user'
    });
  }
});

// POST /api/auth/login - Login utente
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trova utente per email
    const result = await query(`
      SELECT id, nome, email, password_hash, ruolo, compenso_annuale, 
             costo_orario, ore_disponibili_anno, attivo, data_creazione
      FROM utenti 
      WHERE email = $1 AND attivo = true
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Login Error',
        details: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Verifica password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Login Error',
        details: 'Invalid credentials'
      });
    }

    // Genera tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update last login (opzionale)
    await query('UPDATE utenti SET data_aggiornamento = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        ruolo: user.ruolo,
        compenso_annuale: user.compenso_annuale,
        costo_orario: user.costo_orario,
        ore_disponibili_anno: user.ore_disponibili_anno,
        data_creazione: user.data_creazione
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to login'
    });
  }
});

// POST /api/auth/refresh - Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh Error',
        details: 'Refresh token required'
      });
    }

    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');

    // Verifica refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Refresh Error',
        details: 'Invalid refresh token'
      });
    }

    // Trova utente
    const result = await query(`
      SELECT id, nome, email, ruolo, attivo
      FROM utenti 
      WHERE id = $1 AND attivo = true
    `, [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Refresh Error',
        details: 'User not found'
      });
    }

    const user = result.rows[0];

    // Genera nuovo access token
    const newToken = generateToken(user);

    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      error: 'Refresh Error',
      details: 'Invalid or expired refresh token'
    });
  }
});

// POST /api/auth/logout - Logout (opzionale - client-side principalmente)
router.post('/logout', (req, res) => {
  // In un sistema più complesso, potresti mantenere una blacklist dei token
  // Per ora, il logout è gestito principalmente client-side
  res.json({
    message: 'Logged out successfully'
  });
});

// GET /api/auth/verify - Verifica se il token è valido
router.get('/verify', require('../middleware/auth').authenticateToken, (req, res) => {
  res.json({
    message: 'Token is valid',
    user: {
      id: req.user.id,
      nome: req.user.nome,
      email: req.user.email,
      ruolo: req.user.ruolo
    }
  });
});

module.exports = router;
