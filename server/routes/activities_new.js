const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireManager, requireResource } = require('../middleware/auth');
const { validateActivity, validateUUID, validatePagination } = require('../middleware/validation');

const router = express.Router();

// GET /api/activities - Lista attività
router.get('/', authenticateToken, validatePagination, async (req, res) => {
  try {
    const { progetto_id, stato, utente_id } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    // Filtro per risorsa: vede solo le sue attività
    if (req.user.ruolo === 'risorsa') {
      whereClause += ' AND EXISTS (SELECT 1 FROM assegnazioni_attivita aa WHERE aa.attivita_id = a.id AND aa.utente_id = $1)';
      params.push(req.user.id);
    }

    if (progetto_id) {
      whereClause += ' AND a.progetto_id = $' + (params.length + 1);
      params.push(progetto_id);
    }

    if (stato) {
      whereClause += ' AND a.stato = $' + (params.length + 1);
      params.push(stato);
    }

    if (utente_id && req.user.ruolo === 'manager') {
      whereClause += ' AND EXISTS (SELECT 1 FROM assegnazioni_attivita aa WHERE aa.attivita_id = a.id AND aa.utente_id = $' + (params.length + 1) + ')';
      params.push(utente_id);
    }

    const result = await query(`
      SELECT 
        a.id, a.nome, a.descrizione, a.ore_stimate, a.ore_effettive,
        a.scadenza, a.stato, a.data_creazione,
        p.nome as progetto_nome, p.id as progetto_id,
        c.nome as cliente_nome,
        -- Risorse assegnate
        COUNT(DISTINCT aa.utente_id) as numero_risorse,
        -- Task statistiche  
        COUNT(DISTINCT t.id) as numero_task,
        COUNT(DISTINCT CASE WHEN t.stato = 'completata' THEN t.id END) as task_completate,
        -- Performance ore stimate vs effettive
        CASE 
          WHEN a.ore_effettive > 0 THEN 
            ROUND(((a.ore_effettive - a.ore_stimate)::decimal / a.ore_stimate) * 100, 1)
          ELSE NULL 
        END as scostamento_percentuale
      FROM attivita a
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN assegnazioni_attivita aa ON a.id = aa.attivita_id
      LEFT JOIN task t ON a.id = t.attivita_id
      ${whereClause}
      GROUP BY a.id, a.nome, a.descrizione, a.ore_stimate, a.ore_effettive,
               a.scadenza, a.stato, a.data_creazione, p.nome, p.id, c.nome
      ORDER BY a.scadenza ASC
    `, params);

    // Ottieni risorse per ogni attività
    for (let activity of result.rows) {
      const resourcesResult = await query(`
        SELECT u.id, u.nome, u.email, aa.data_assegnazione
        FROM assegnazioni_attivita aa
        JOIN utenti u ON aa.utente_id = u.id
        WHERE aa.attivita_id = $1
        ORDER BY aa.data_assegnazione ASC
      `, [activity.id]);

      activity.risorse_assegnate = resourcesResult.rows;
    }

    res.json({ activities: result.rows });

  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch activities' });
  }
});

// POST /api/activities - Crea nuova attività
router.post('/', authenticateToken, requireResource, validateActivity, async (req, res) => {
  try {
    const { nome, descrizione, progetto_id, ore_stimate, scadenza, risorse_assegnate } = req.body;

    await transaction(async (client) => {
      // Verifica permessi sul progetto
      const projectCheck = await client.query(`
  SELECT p.id, p.stato_approvazione 
  FROM progetti p
  WHERE p.id = $1 AND (
    p.stato_approvazione = 'approvata' OR 
    $2 = 'manager' OR 
    p.creato_da = $3
  )
`, [progetto_id, req.user.ruolo, req.user.id]);

      if (projectCheck.rows.length === 0) {
        throw new Error('Project not found or access denied');
      }

      // Crea attività
const activityResult = await client.query(`
  INSERT INTO attivita (nome, descrizione, progetto_id, ore_stimate, scadenza, creata_da)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *
`, [nome, descrizione, progetto_id, ore_stimate, scadenza, req.user.id]);

      const activity = activityResult.rows[0];

      // Assegna risorse all'attività
      const assignments = [];
      for (const utente_id of risorse_assegnate) {
        const assignmentResult = await client.query(`
          INSERT INTO assegnazioni_attivita (attivita_id, utente_id)
          VALUES ($1, $2)
          RETURNING *
        `, [activity.id, utente_id]);

        assignments.push(assignmentResult.rows[0]);
      }

      res.status(201).json({
        message: 'Activity created successfully',
        activity: {
          ...activity,
          risorse_assegnate: assignments
        }
      });
    });

  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Server Error', details: error.message || 'Failed to create activity' });
  }
});

// GET /api/activities/:id - Dettagli attività
router.get('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica permessi
    let accessCheck = '';
    let accessParams = [id];
    
    if (req.user.ruolo === 'risorsa') {
      accessCheck = ' AND EXISTS (SELECT 1 FROM assegnazioni_attivita aa WHERE aa.attivita_id = a.id AND aa.utente_id = $2)';
      accessParams.push(req.user.id);
    }

    const result = await query(`
      SELECT 
        a.id, a.nome, a.descrizione, a.ore_stimate, a.ore_effettive,
        a.scadenza, a.stato, a.data_creazione, a.data_aggiornamento,
        p.nome as progetto_nome, p.id as progetto_id,
        c.nome as cliente_nome, c.id as cliente_id,
        -- Performance calcoli
        CASE 
          WHEN a.ore_effettive > 0 THEN 
            ROUND(((a.ore_effettive - a.ore_stimate)::decimal / a.ore_stimate) * 100, 1)
          ELSE NULL 
        END as scostamento_percentuale,
        -- Progresso completamento
        ROUND(
          CASE 
            WHEN COUNT(t.id) > 0 THEN 
              (COUNT(CASE WHEN t.stato = 'completata' THEN 1 END)::decimal / COUNT(t.id)) * 100 
            ELSE 0 
          END, 1
        ) as progresso_completamento
      FROM attivita a
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN task t ON a.id = t.attivita_id
      WHERE a.id = $1 ${accessCheck}
      GROUP BY a.id, a.nome, a.descrizione, a.ore_stimate, a.ore_effettive,
               a.scadenza, a.stato, a.data_creazione, a.data_aggiornamento,
               p.nome, p.id, c.nome, c.id
    `, accessParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', details: 'Activity not found or access denied' });
    }

    const activity = result.rows[0];

    // Ottieni risorse assegnate
    const resourcesResult = await query(`
      SELECT 
        u.id, u.nome, u.email, u.costo_orario, aa.data_assegnazione,
        -- Ore lavorate da questa risorsa su questa attività
        COALESCE(SUM(
          CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
          THEN t.ore_effettive ELSE 0 END
        ), 0) as ore_lavorate,
        -- Costo per questa risorsa
        COALESCE(SUM(
          CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
          THEN (t.ore_effettive::decimal / 60) * u.costo_orario ELSE 0 END
        ), 0) as costo_risorsa
      FROM assegnazioni_attivita aa
      JOIN utenti u ON aa.utente_id = u.id
      LEFT JOIN task t ON t.attivita_id = $1 AND t.utente_assegnato = u.id
      WHERE aa.attivita_id = $1
      GROUP BY u.id, u.nome, u.email, u.costo_orario, aa.data_assegnazione
      ORDER BY aa.data_assegnazione ASC
    `, [id]);

    // Ottieni task dell'attività
    const tasksResult = await query(`
      SELECT 
        t.id, t.nome, t.descrizione, t.ore_stimate, t.ore_effettive,
        t.scadenza, t.stato, t.data_creazione,
        u.nome as utente_nome, u.id as utente_id,
        -- Performance task
        CASE 
          WHEN t.ore_effettive IS NOT NULL AND t.ore_stimate > 0 THEN 
            ROUND(((t.ore_effettive - t.ore_stimate)::decimal / t.ore_stimate) * 100, 1)
          ELSE NULL 
        END as scostamento_percentuale
      FROM task t
      JOIN utenti u ON t.utente_assegnato = u.id
      WHERE t.attivita_id = $1
      ORDER BY t.scadenza ASC
    `, [id]);

    res.json({
      activity: {
        ...activity,
        risorse_assegnate: resourcesResult.rows,
        task: tasksResult.rows,
        costo_totale_effettivo: resourcesResult.rows.reduce((sum, r) => sum + parseFloat(r.costo_risorsa || 0), 0)
      }
    });

  } catch (error) {
    console.error('Get activity details error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch activity details' });
  }
});

// PUT /api/activities/:id - Aggiorna attività
router.put('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descrizione, ore_stimate, scadenza, stato } = req.body;

    // Verifica permessi
    let permissionCheck = '';
    let params = [id];

    if (req.user.ruolo === 'risorsa') {
      permissionCheck = ' AND EXISTS (SELECT 1 FROM assegnazioni_attivita aa WHERE aa.attivita_id = $1 AND aa.utente_id = $2)';
      params.push(req.user.id);
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = params.length + 1;

    if (nome) {
      updateFields.push(`nome = $${paramCount++}`);
      updateValues.push(nome);
    }
    if (descrizione !== undefined) {
      updateFields.push(`descrizione = $${paramCount++}`);
      updateValues.push(descrizione);
    }
    if (ore_stimate) {
      updateFields.push(`ore_stimate = $${paramCount++}`);
      updateValues.push(ore_stimate);
    }
    if (scadenza) {
      updateFields.push(`scadenza = $${paramCount++}`);
      updateValues.push(scadenza);
    }
    if (stato) {
      updateFields.push(`stato = $${paramCount++}`);
      updateValues.push(stato);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Update Error', details: 'No valid fields to update' });
    }

    updateFields.push(`data_aggiornamento = CURRENT_TIMESTAMP`);
    const finalParams = [...params, ...updateValues];

    const result = await query(`
      UPDATE attivita 
      SET ${updateFields.join(', ')}
      WHERE id = $1 ${permissionCheck}
      RETURNING *
    `, finalParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', details: 'Activity not found or access denied' });
    }

    res.json({
      message: 'Activity updated successfully',
      activity: result.rows[0]
    });

  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to update activity' });
  }
});

// DELETE /api/activities/:id - Elimina attività (se non ha task completate)
router.delete('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    // Solo manager può eliminare attività
    if (req.user.ruolo !== 'manager') {
      return res.status(403).json({ error: 'Access Denied', details: 'Manager role required' });
    }

    await transaction(async (client) => {
      // Verifica se ha task completate
      const completedTasksResult = await client.query(`
        SELECT COUNT(*) FROM task WHERE attivita_id = $1 AND stato = 'completata'
      `, [id]);

      if (parseInt(completedTasksResult.rows[0].count) > 0) {
        throw new Error('Cannot delete activity with completed tasks');
      }

      // Rimuovi assegnazioni
      await client.query('DELETE FROM assegnazioni_attivita WHERE attivita_id = $1', [id]);

      // Rimuovi task non completate
      await client.query('DELETE FROM task WHERE attivita_id = $1', [id]);

      // Elimina attività
      const result = await client.query(`
        DELETE FROM attivita WHERE id = $1 RETURNING nome
      `, [id]);

      if (result.rows.length === 0) {
        throw new Error('Activity not found');
      }

      res.json({
        message: 'Activity deleted successfully',
        activity_name: result.rows[0].nome
      });
    });

  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ error: 'Server Error', details: error.message || 'Failed to delete activity' });
  }
});

module.exports = router;
