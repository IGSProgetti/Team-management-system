const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { validateUUID, validatePagination } = require('../middleware/validation');

const router = express.Router();

// GET /api/users - Lista tutti gli utenti (solo manager)
router.get('/', authenticateToken, requireManager, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'nome', order = 'asc', ruolo } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE attivo = true';
    let params = [];
    
    if (ruolo && ['risorsa', 'manager'].includes(ruolo)) {
      whereClause += ' AND ruolo = $1';
      params.push(ruolo);
    }

    const countResult = await query(`SELECT COUNT(*) FROM utenti ${whereClause}`, params);
    const totalUsers = parseInt(countResult.rows[0].count);

    const result = await query(`
      SELECT 
        id, nome, email, ruolo, compenso_annuale, costo_orario,
        ore_disponibili_anno, costo_orario_manuale, ore_disponibili_manuale,
        data_creazione, data_aggiornamento
      FROM utenti 
      ${whereClause}
      ORDER BY ${sort} ${order.toUpperCase()}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    res.json({
      users: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: offset + limit < totalUsers,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch users'
    });
  }
});

// GET /api/users/profile - Profilo utente corrente
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, nome, email, ruolo, compenso_annuale, costo_orario,
        ore_disponibili_anno, costo_orario_manuale, ore_disponibili_manuale,
        data_creazione, data_aggiornamento
      FROM utenti 
      WHERE id = $1 AND attivo = true
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'User profile not found'
      });
    }

    res.json({
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch profile'
    });
  }
});

// GET /api/users/:id - Dettagli utente specifico (solo manager)
router.get('/:id', authenticateToken, requireManager, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        u.id, u.nome, u.email, u.ruolo, u.compenso_annuale, u.costo_orario,
        u.ore_disponibili_anno, u.costo_orario_manuale, u.ore_disponibili_manuale,
        u.data_creazione, u.data_aggiornamento,
        -- Calcolo ore utilizzate nei progetti attivi
        COALESCE(SUM(ap.ore_utilizzate), 0) as ore_utilizzate_progetti,
        COALESCE(u.ore_disponibili_anno - SUM(ap.ore_utilizzate), u.ore_disponibili_anno) as ore_residue
      FROM utenti u
      LEFT JOIN assegnazioni_progetto ap ON u.id = ap.utente_id
      WHERE u.id = $1 AND u.attivo = true
      GROUP BY u.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'User not found'
      });
    }

    // Ottieni progetti assegnati
    const projectsResult = await query(`
      SELECT 
        p.id, p.nome, c.nome as cliente_nome,
        ap.ore_assegnate, ap.ore_utilizzate,
        ap.data_assegnazione
      FROM assegnazioni_progetto ap
      JOIN progetti p ON ap.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      WHERE ap.utente_id = $1
      ORDER BY ap.data_assegnazione DESC
    `, [id]);

    res.json({
      user: {
        ...result.rows[0],
        progetti_assegnati: projectsResult.rows
      }
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch user details'
    });
  }
});

// PUT /api/users/:id - Aggiorna utente (solo manager o se è il proprio profilo)
router.put('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      email,
      compenso_annuale,
      costo_orario,
      costo_orario_manuale,
      ore_disponibili_anno,
      ore_disponibili_manuale,
      ruolo
    } = req.body;

    // Verifica permessi: manager può modificare tutti, risorsa solo se stesso
    if (req.user.ruolo !== 'manager' && req.user.id !== id) {
      return res.status(403).json({
        error: 'Access Denied',
        details: 'You can only modify your own profile'
      });
    }

    // Solo manager può modificare ruolo
    if (ruolo && req.user.ruolo !== 'manager') {
      return res.status(403).json({
        error: 'Access Denied',
        details: 'Only managers can change user roles'
      });
    }

    // Verifica se l'email è già in uso da un altro utente
    if (email) {
      const emailCheck = await query('SELECT id FROM utenti WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          error: 'Update Error',
          details: 'Email already in use'
        });
      }
    }

    // Calcola valori automatici se necessario
    let finalCostoOrario = costo_orario;
    if (compenso_annuale && !costo_orario_manuale) {
      finalCostoOrario = compenso_annuale / 220 / 5;
    }

    let finalOreDisponibili = ore_disponibili_anno;
    if (!ore_disponibili_manuale) {
      finalOreDisponibili = 8 * 220;
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (nome) {
      updateFields.push(`nome = $${paramCount++}`);
      updateValues.push(nome);
    }
    if (email) {
      updateFields.push(`email = $${paramCount++}`);
      updateValues.push(email);
    }
    if (compenso_annuale) {
      updateFields.push(`compenso_annuale = $${paramCount++}`);
      updateValues.push(compenso_annuale);
    }
    if (finalCostoOrario) {
      updateFields.push(`costo_orario = $${paramCount++}`);
      updateValues.push(finalCostoOrario);
    }
    if (typeof costo_orario_manuale === 'boolean') {
      updateFields.push(`costo_orario_manuale = $${paramCount++}`);
      updateValues.push(costo_orario_manuale);
    }
    if (finalOreDisponibili) {
      updateFields.push(`ore_disponibili_anno = $${paramCount++}`);
      updateValues.push(finalOreDisponibili);
    }
    if (typeof ore_disponibili_manuale === 'boolean') {
      updateFields.push(`ore_disponibili_manuale = $${paramCount++}`);
      updateValues.push(ore_disponibili_manuale);
    }
    if (ruolo && req.user.ruolo === 'manager') {
      updateFields.push(`ruolo = $${paramCount++}`);
      updateValues.push(ruolo);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'Update Error',
        details: 'No valid fields to update'
      });
    }

    updateFields.push(`data_aggiornamento = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const result = await query(`
      UPDATE utenti 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND attivo = true
      RETURNING id, nome, email, ruolo, compenso_annuale, costo_orario,
                ore_disponibili_anno, costo_orario_manuale, ore_disponibili_manuale,
                data_aggiornamento
    `, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'User not found'
      });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to update user'
    });
  }
});

// DELETE /api/users/:id - Disattiva utente (soft delete, solo manager)
router.delete('/:id', authenticateToken, requireManager, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    // Non permettere di disattivare se stesso
    if (req.user.id === id) {
      return res.status(400).json({
        error: 'Delete Error',
        details: 'You cannot deactivate your own account'
      });
    }

    // Verifica se l'utente ha task attive
    const activeTasksResult = await query(`
      SELECT COUNT(*) 
      FROM task 
      WHERE utente_assegnato = $1 AND stato IN ('programmata', 'in_esecuzione')
    `, [id]);

    if (parseInt(activeTasksResult.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Delete Error',
        details: 'Cannot deactivate user with active tasks'
      });
    }

    const result = await query(`
      UPDATE utenti 
      SET attivo = false, data_aggiornamento = CURRENT_TIMESTAMP
      WHERE id = $1 AND attivo = true
      RETURNING id, nome, email
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'User not found'
      });
    }

    res.json({
      message: 'User deactivated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to deactivate user'
    });
  }
});

// GET /api/users/:id/hours - Statistiche ore utente
router.get('/:id/hours', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { anno = new Date().getFullYear(), mese } = req.query;

    // Verifica permessi: manager può vedere tutti, risorsa solo se stesso
    if (req.user.ruolo !== 'manager' && req.user.id !== id) {
      return res.status(403).json({
        error: 'Access Denied',
        details: 'You can only view your own hours'
      });
    }

    let dateFilter = 'EXTRACT(YEAR FROM data) = $2';
    let params = [id, anno];

    if (mese) {
      dateFilter += ' AND EXTRACT(MONTH FROM data) = $3';
      params.push(mese);
    }

    // Ore giornaliere
    const dailyHoursResult = await query(`
      SELECT 
        data,
        ore_lavorate,
        ore_disponibili,
        ultimo_aggiornamento
      FROM ore_giornaliere 
      WHERE utente_id = $1 AND ${dateFilter}
      ORDER BY data DESC
    `, params);

    // Sommario mensile
    const monthlyResult = await query(`
      SELECT 
        EXTRACT(MONTH FROM data) as mese,
        SUM(ore_lavorate) as ore_lavorate_totali,
        COUNT(*) as giorni_lavorati
      FROM ore_giornaliere 
      WHERE utente_id = $1 AND EXTRACT(YEAR FROM data) = $2
      GROUP BY EXTRACT(MONTH FROM data)
      ORDER BY mese
    `, [id, anno]);

    res.json({
      ore_giornaliere: dailyHoursResult.rows,
      sommario_mensile: monthlyResult.rows,
      filtri: { anno, mese }
    });

  } catch (error) {
    console.error('Get user hours error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch user hours'
    });
  }
});

module.exports = router;
