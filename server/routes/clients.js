const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireManager, requireResource } = require('../middleware/auth');
const { validateClient, validateUUID, validatePagination } = require('../middleware/validation');

const router = express.Router();

// BYPASS AUTH MIDDLEWARE TEMPORANEO PER TEST
const bypassAuth = (req, res, next) => {
  req.user = { 
    id: '88e88c2b-f1ec-4a97-9143-2033e7476626', // testmanager@team.com dal database
    ruolo: 'manager',
    email: 'testmanager@team.com'
  };
  next();
};

// GET /api/clients - Lista clienti (BYPASS AUTH TEMPORANEO)
router.get('/', bypassAuth, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'nome', order = 'asc', stato_approvazione } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    // Manager vede tutti, risorsa solo approvati (e quelli che ha creato)
    if (req.user.ruolo === 'risorsa') {
      whereClause += ' AND (stato_approvazione = $1 OR creato_da = $2)';
      params.push('approvata', req.user.id);
    } else if (stato_approvazione) {
      whereClause += ' AND c.stato_approvazione = $' + (params.length + 1);
      params.push(stato_approvazione);
    }

    const countResult = await query(`SELECT COUNT(*) FROM clienti ${whereClause}`, params);
    const totalClients = parseInt(countResult.rows[0].count);

    const result = await query(`
      SELECT 
        c.id,
        c.nome,
        c.descrizione,
        c.budget,
        c.budget_utilizzato,
        c.stato_approvazione,
        c.creato_da,
        c.data_creazione,
        c.data_aggiornamento,
        c.approvato_da,
        c.data_approvazione,
        c.attivo,
        u.nome as creato_da_nome,
        COUNT(DISTINCT p.id) as numero_progetti,
        COALESCE(SUM(DISTINCT p.budget_assegnato), 0) as budget_progetti_assegnato,
        -- Budget risorse (sottoquery per evitare duplicati)
        COALESCE((
          SELECT SUM(budget_risorsa) 
          FROM assegnazione_cliente_risorsa 
          WHERE cliente_id = c.id
        ), 0) as budget_risorse_assegnato
      FROM clienti c
      LEFT JOIN utenti u ON c.creato_da = u.id
      LEFT JOIN progetti p ON p.cliente_id = c.id
      ${whereClause}
      GROUP BY c.id, c.nome, c.descrizione, c.budget, c.budget_utilizzato, 
               c.stato_approvazione, c.creato_da, c.data_creazione, c.data_aggiornamento,
               c.approvato_da, c.data_approvazione, c.attivo, u.nome
      ORDER BY ${sort === 'nome' ? 'c.nome' : 'c.' + sort} ${order.toUpperCase()}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    res.json({
      clients: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalClients / limit),
        totalClients,
        hasNext: offset + limit < totalClients,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch clients'
    });
  }
});

// POST /api/clients - Crea nuovo cliente (BYPASS AUTH TEMPORANEO)
router.post('/', bypassAuth, validateClient, async (req, res) => {
  try {
    const { nome, descrizione, budget } = req.body;

    // Manager approva automaticamente, risorsa va in pending
    const statoApprovazione = req.user.ruolo === 'manager' ? 'approvata' : 'pending_approval';

    const result = await query(`
      INSERT INTO clienti (nome, descrizione, budget, stato_approvazione, creato_da)
      VALUES ($1, $2, $3, $4, $5)
RETURNING *
`, [nome, descrizione, budget, statoApprovazione, req.user.id]);

    const client = result.rows[0];

    res.status(201).json({
      message: statoApprovazione === 'pending_approval' 
        ? 'Client created and pending approval' 
        : 'Client created successfully',
      client: {
        ...client,
        pending_approval: statoApprovazione === 'pending_approval'
      }
    });

  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to create client'
    });
  }
});

// GET /api/clients/:id - Dettagli cliente specifico (BYPASS AUTH)
router.get('/:id', bypassAuth, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        c.id, c.nome, c.descrizione, c.budget, c.budget_utilizzato,
        c.stato_approvazione, c.data_creazione, c.data_aggiornamento,
        u.nome as creato_da_nome,
        -- Budget progetti
        COALESCE(SUM(DISTINCT p.budget_assegnato), 0) as budget_progetti_assegnato,
        -- Budget risorse (sottoquery per evitare duplicati)
        COALESCE((
          SELECT SUM(budget_risorsa) 
          FROM assegnazione_cliente_risorsa 
          WHERE cliente_id = c.id
        ), 0) as budget_risorse_assegnato,
        -- Budget residuo
        c.budget - COALESCE((
          SELECT SUM(budget_risorsa) 
          FROM assegnazione_cliente_risorsa 
          WHERE cliente_id = c.id
        ), 0) as budget_residuo
      FROM clienti c
      LEFT JOIN utenti u ON c.creato_da = u.id
      LEFT JOIN progetti p ON c.id = p.cliente_id
      WHERE c.id = $1
      GROUP BY c.id, c.nome, c.descrizione, c.budget, c.budget_utilizzato,
               c.stato_approvazione, c.data_creazione, c.data_aggiornamento, u.nome
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Client not found'
      });
    }

    const client = result.rows[0];
    
    res.json({
      client: client
    });
    
  } catch (error) {
    console.error('Get client details error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch client details'
    });
  }
});

module.exports = router;