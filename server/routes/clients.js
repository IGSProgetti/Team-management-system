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

// GET /api/clienti/risorsa/:risorsaId/assegnati - Clienti assegnati a una risorsa
router.get('/risorsa/:risorsaId/assegnati', authenticateToken, async (req, res) => {
  try {
    const { risorsaId } = req.params;

    console.log(`📊 Recupero clienti assegnati per risorsa: ${risorsaId}`);

    const result = await query(`
      SELECT 
        c.id,
        c.nome,
        c.descrizione,
        acr.ore_assegnate,
        acr.costo_orario_finale,
        acr.budget_risorsa,
        acr.data_assegnazione
      FROM clienti c
      JOIN assegnazione_cliente_risorsa acr ON c.id = acr.cliente_id
      WHERE acr.risorsa_id = $1
        AND c.attivo = true
      ORDER BY c.nome ASC
    `, [risorsaId]);

    console.log(`✅ Trovati ${result.rows.length} clienti per risorsa ${risorsaId}`);

    res.json({
      clienti: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Errore recupero clienti assegnati:', error);
    res.status(500).json({ 
      error: 'Errore nel recupero dei clienti assegnati', 
      details: error.message 
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

// GET /api/clients/:id/resources - Ottieni risorse assegnate al cliente
router.get('/:id/resources', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        acr.id as assegnazione_id,
        acr.risorsa_id,
        u.id,
        u.nome,
        u.email,
        u.ruolo,
        acr.ore_assegnate,
        acr.costo_orario_base
      FROM assegnazione_cliente_risorsa acr
      JOIN utenti u ON acr.risorsa_id = u.id
      WHERE acr.cliente_id = $1
        AND u.attivo = true
      ORDER BY u.nome
    `, [id]);

    res.json({
      success: true,
      resources: result.rows
    });

  } catch (error) {
    console.error('Error fetching client resources:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento risorse cliente',
      details: error.message 
    });
  }
});

// ============================================
// DELETE /api/clients/:id - Elimina cliente e TUTTO il cascade
// ============================================
router.delete('/:id', bypassAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validazione UUID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'Validation Error', 
        details: 'Invalid client ID format' 
      });
    }

    await transaction(async (client) => {
      // 🔍 Verifica che il cliente esista
      const clienteCheck = await client.query(`
        SELECT id, nome FROM clienti WHERE id = $1
      `, [id]);

      if (clienteCheck.rows.length === 0) {
        throw new Error('Cliente non trovato');
      }

      const clienteNome = clienteCheck.rows[0].nome;
      console.log(`🗑️ Inizio eliminazione cliente: ${clienteNome}`);

      // 📊 Conta cosa verrà eliminato (per log)
      const stats = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM progetti WHERE cliente_id = $1) as progetti,
          (SELECT COUNT(*) FROM aree a 
           JOIN progetti p ON a.progetto_id = p.id 
           WHERE p.cliente_id = $1) as aree,
          (SELECT COUNT(*) FROM attivita att
           JOIN aree a ON att.area_id = a.id
           JOIN progetti p ON a.progetto_id = p.id
           WHERE p.cliente_id = $1) as attivita,
          (SELECT COUNT(*) FROM task t
           JOIN attivita att ON t.attivita_id = att.id
           JOIN aree a ON att.area_id = a.id
           JOIN progetti p ON a.progetto_id = p.id
           WHERE p.cliente_id = $1) as task
      `, [id]);

      const counts = stats.rows[0];
      console.log(`📊 Verranno eliminati:`, counts);

      // 🗑️ FASE 1: Elimina Riassegnazioni Ore
console.log('🗑️ FASE 1: Eliminazione Riassegnazioni Ore...');
await client.query(`
  DELETE FROM riassegnazioni_ore
  WHERE task_sorgente_id IN (
    SELECT t.id FROM task t
    JOIN attivita att ON t.attivita_id = att.id
    JOIN progetti p ON att.progetto_id = p.id
    WHERE p.cliente_id = $1
  )
  OR task_destinazione_id IN (
    SELECT t.id FROM task t
    JOIN attivita att ON t.attivita_id = att.id
    JOIN progetti p ON att.progetto_id = p.id
    WHERE p.cliente_id = $1
  )
`, [id]);

// 🗑️ FASE 2: Elimina Task
console.log('🗑️ FASE 2: Eliminazione Task...');
await client.query(`
  DELETE FROM task 
  WHERE attivita_id IN (
    SELECT att.id FROM attivita att
    JOIN progetti p ON att.progetto_id = p.id
    WHERE p.cliente_id = $1
  )
`, [id]);

// 🗑️ FASE 3: Elimina Assegnazioni Attività
console.log('🗑️ FASE 3: Eliminazione Assegnazioni Attività...');
await client.query(`
  DELETE FROM assegnazioni_attivita
  WHERE attivita_id IN (
    SELECT att.id FROM attivita att
    JOIN progetti p ON att.progetto_id = p.id
    WHERE p.cliente_id = $1
  )
`, [id]);

// 🗑️ FASE 4: Elimina Attività
console.log('🗑️ FASE 4: Eliminazione Attività...');
await client.query(`
  DELETE FROM attivita
  WHERE progetto_id IN (
    SELECT id FROM progetti WHERE cliente_id = $1
  )
`, [id]);

// 🗑️ FASE 5: Elimina Aree
console.log('🗑️ FASE 5: Eliminazione Aree...');
await client.query(`
  DELETE FROM aree
  WHERE progetto_id IN (
    SELECT id FROM progetti WHERE cliente_id = $1
  )
`, [id]);

// 🗑️ FASE 6: Elimina Assegnazioni Progetto
console.log('🗑️ FASE 6: Eliminazione Assegnazioni Progetto...');
await client.query(`
  DELETE FROM assegnazioni_progetto
  WHERE progetto_id IN (
    SELECT id FROM progetti WHERE cliente_id = $1
  )
`, [id]);

// 🗑️ FASE 7: Elimina Progetti
console.log('🗑️ FASE 7: Eliminazione Progetti...');
await client.query(`
  DELETE FROM progetti WHERE cliente_id = $1
`, [id]);

// 🗑️ FASE 8: Elimina Assegnazioni Cliente-Risorsa
console.log('🗑️ FASE 8: Eliminazione Assegnazioni Cliente-Risorsa...');
await client.query(`
  DELETE FROM assegnazione_cliente_risorsa WHERE cliente_id = $1
`, [id]);

// 🗑️ FASE 9: Elimina Cliente
console.log('🗑️ FASE 9: Eliminazione Cliente...');
await client.query(`
  DELETE FROM clienti WHERE id = $1
`, [id]);

      console.log(`✅ Cliente "${clienteNome}" eliminato con successo!`);

      res.json({
        success: true,
        message: `Cliente "${clienteNome}" eliminato con successo`,
        deleted: {
          cliente: clienteNome,
          progetti: parseInt(counts.progetti),
          aree: parseInt(counts.aree),
          attivita: parseInt(counts.attivita),
          task: parseInt(counts.task)
        }
      });
    });

  } catch (error) {
    console.error('❌ Delete client error:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      details: error.message || 'Failed to delete client' 
    });
  }
});


module.exports = router;