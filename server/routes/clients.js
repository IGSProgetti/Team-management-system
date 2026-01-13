const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireManager, requireResource } = require('../middleware/auth');
const { validateClient, validateUUID, validatePagination } = require('../middleware/validation');

const router = express.Router();

// GET /api/clients - Lista clienti
router.get('/', authenticateToken, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'nome', order = 'asc', stato_approvazione } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    // Manager vede tutti, risorsa solo approvati (e quelli che ha creato)
    if (req.user.ruolo === 'risorsa') {
      whereClause += ' AND (stato_approvazione = $1 OR creato_da_risorsa = $2)';
      params.push('approvata', req.user.id);
    } else if (stato_approvazione) {
      whereClause += ' AND stato_approvazione = $' + (params.length + 1);
      params.push(stato_approvazione);
    }

    const countResult = await query(`SELECT COUNT(*) FROM clienti ${whereClause}`, params);
    const totalClients = parseInt(countResult.rows[0].count);

    const result = await query(`
      SELECT 
        c.id, c.nome, c.descrizione, c.budget, c.budget_utilizzato,
        c.stato_approvazione, c.data_creazione, c.data_aggiornamento,
        u.nome as creato_da_nome,
        -- Conteggio progetti
        COUNT(p.id) as numero_progetti,
        COALESCE(SUM(p.budget_assegnato), 0) as budget_progetti_assegnato
      FROM clienti c
      LEFT JOIN utenti u ON c.creato_da_risorsa = u.id
      LEFT JOIN progetti p ON c.id = p.cliente_id
      ${whereClause}
      GROUP BY c.id, c.nome, c.descrizione, c.budget, c.budget_utilizzato,
               c.stato_approvazione, c.data_creazione, c.data_aggiornamento, u.nome
      ORDER BY ${sort === 'nome' ? 'c.nome' : 'c.' + sort} ${order.toUpperCase()}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    res.json({
      clients: result.rows.map(client => ({
        ...client,
        budget_residuo: parseFloat(client.budget) - parseFloat(client.budget_progetti_assegnato)
      })),
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

// GET /api/clients/pending-approval - Clienti in attesa di approvazione (solo manager)
router.get('/pending-approval', authenticateToken, requireManager, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        c.id, c.nome, c.descrizione, c.budget,
        c.data_creazione, u.nome as creato_da_nome, u.email as creato_da_email
      FROM clienti c
      JOIN utenti u ON c.creato_da_risorsa = u.id
      WHERE c.stato_approvazione = 'pending_approval'
      ORDER BY c.data_creazione ASC
    `);

    res.json({
      pending_clients: result.rows
    });

  } catch (error) {
    console.error('Get pending clients error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch pending clients'
    });
  }
});

// POST /api/clients - Crea nuovo cliente
router.post('/', authenticateToken, requireResource, validateClient, async (req, res) => {
  try {
    const { nome, descrizione, budget } = req.body;

    // Determina stato approvazione
    const statoApprovazione = req.user.ruolo === 'manager' ? 'approvata' : 'pending_approval';
    const creatoDataRisorsa = req.user.ruolo === 'risorsa' ? req.user.id : null;

    const result = await query(`
      INSERT INTO clienti (nome, descrizione, budget, stato_approvazione, creato_da_risorsa)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [nome, descrizione, budget, statoApprovazione, creatoDataRisorsa]);

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

// GET /api/clients/:id - Dettagli cliente specifico
router.get('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        c.id, c.nome, c.descrizione, c.budget, c.budget_utilizzato,
        c.stato_approvazione, c.data_creazione, c.data_aggiornamento,
        u.nome as creato_da_nome,
        -- Budget info
        COALESCE(SUM(p.budget_assegnato), 0) as budget_progetti_assegnato,
        c.budget - COALESCE(SUM(p.budget_assegnato), 0) as budget_residuo
      FROM clienti c
      LEFT JOIN utenti u ON c.creato_da_risorsa = u.id
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

    // Verifica permessi per risorsa
    if (req.user.ruolo === 'risorsa' && 
        client.stato_approvazione !== 'approvata' && 
        client.creato_da_risorsa !== req.user.id) {
      return res.status(403).json({
        error: 'Access Denied',
        details: 'Cannot access unapproved client'
      });
    }

    // Ottieni progetti del cliente
    const projectsResult = await query(`
      SELECT 
        id, nome, descrizione, budget_assegnato, budget_utilizzato,
        data_inizio, data_fine, data_creazione
      FROM progetti 
      WHERE cliente_id = $1
      ORDER BY data_creazione DESC
    `, [id]);

    res.json({
      client: {
        ...client,
        progetti: projectsResult.rows
      }
    });

  } catch (error) {
    console.error('Get client details error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch client details'
    });
  }
});

// PUT /api/clients/:id - Aggiorna cliente
router.put('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descrizione, budget } = req.body;

    // Verifica permessi
    const clientCheck = await query(`
      SELECT stato_approvazione, creato_da_risorsa 
      FROM clienti 
      WHERE id = $1
    `, [id]);

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Client not found'
      });
    }

    const client = clientCheck.rows[0];

    // Solo manager o creatore della risorsa possono modificare
    if (req.user.ruolo !== 'manager' && client.creato_da_risorsa !== req.user.id) {
      return res.status(403).json({
        error: 'Access Denied',
        details: 'You can only modify clients you created'
      });
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (nome) {
      updateFields.push(`nome = $${paramCount++}`);
      updateValues.push(nome);
    }
    if (descrizione !== undefined) {
      updateFields.push(`descrizione = $${paramCount++}`);
      updateValues.push(descrizione);
    }
    if (budget) {
      updateFields.push(`budget = $${paramCount++}`);
      updateValues.push(budget);
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
      UPDATE clienti 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, updateValues);

    res.json({
      message: 'Client updated successfully',
      client: result.rows[0]
    });

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to update client'
    });
  }
});

// PUT /api/clients/:id/approve - Approva cliente (solo manager)
router.put('/:id/approve', authenticateToken, requireManager, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { approva, note } = req.body;

    const nuovoStato = approva ? 'approvata' : 'rifiutata';

    const result = await query(`
      UPDATE clienti 
      SET stato_approvazione = $1, data_aggiornamento = CURRENT_TIMESTAMP
      WHERE id = $2 AND stato_approvazione = 'pending_approval'
      RETURNING *, 
      (SELECT nome FROM utenti WHERE id = clienti.creato_da_risorsa) as creato_da_nome
    `, [nuovoStato, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Client not found or already processed'
      });
    }

    const client = result.rows[0];

    // TODO: Invia notifica alla risorsa che ha creato il cliente
    console.log(`Cliente ${client.nome} ${nuovoStato} per risorsa ${client.creato_da_nome}`);

    res.json({
      message: `Client ${approva ? 'approved' : 'rejected'} successfully`,
      client: result.rows[0],
      note
    });

  } catch (error) {
    console.error('Approve client error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to process client approval'
    });
  }
});

// DELETE /api/clients/:id - Elimina cliente (solo manager, se non ha progetti)
router.delete('/:id', authenticateToken, requireManager, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se ha progetti
    const projectsResult = await query('SELECT COUNT(*) FROM progetti WHERE cliente_id = $1', [id]);
    if (parseInt(projectsResult.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Delete Error',
        details: 'Cannot delete client with existing projects'
      });
    }

    const result = await query(`
      DELETE FROM clienti 
      WHERE id = $1
      RETURNING nome
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Client not found'
      });
    }

    res.json({
      message: 'Client deleted successfully',
      client_name: result.rows[0].nome
    });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to delete client'
    });
  }
});

module.exports = router;
