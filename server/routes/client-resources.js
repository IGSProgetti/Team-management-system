const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { validateUUID } = require('../middleware/validation');

// ========================================
// GET /api/client-resources/:cliente_id
// Ottiene tutte le risorse assegnate a un cliente
// ========================================
router.get('/:cliente_id', authenticateToken, validateUUID('cliente_id'), async (req, res) => {
  try {
    const { cliente_id } = req.params;

    const result = await query(`
      SELECT 
        acr.*,
        u.nome as risorsa_nome,
        u.email as risorsa_email,
        u.ruolo as risorsa_ruolo
      FROM assegnazione_cliente_risorsa acr
      JOIN utenti u ON acr.risorsa_id = u.id
      WHERE acr.cliente_id = $1
      ORDER BY u.nome
    `, [cliente_id]);

    res.json({
      cliente_id,
      risorse: result.rows,
      totale_risorse: result.rows.length,
      budget_totale: result.rows.reduce((sum, r) => sum + parseFloat(r.budget_risorsa || 0), 0)
    });

  } catch (error) {
    console.error('Get client resources error:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento risorse cliente',
      details: error.message 
    });
  }
});

// ========================================
// POST /api/client-resources/:cliente_id
// Assegna una risorsa a un cliente
// ========================================
router.post('/:cliente_id', authenticateToken, requireManager, validateUUID('cliente_id'), async (req, res) => {
  try {
    const { cliente_id } = req.params;
    const { 
      risorsa_id,
      ore_assegnate,
      margini // oggetto con i margini attivi/disattivi
    } = req.body;

    // Validazione
    if (!risorsa_id || !ore_assegnate) {
      return res.status(400).json({ 
        error: 'Risorsa e ore assegnate sono obbligatori' 
      });
    }

    await transaction(async (client) => {
      // Verifica che il cliente esista
      const clienteCheck = await client.query(
        'SELECT id, budget FROM clienti WHERE id = $1',
        [cliente_id]
      );

      if (clienteCheck.rows.length === 0) {
        throw new Error('Cliente non trovato');
      }

      // Ottieni costo orario base della risorsa
      const risorsaCheck = await client.query(
        'SELECT id, nome, costo_orario FROM utenti WHERE id = $1',
        [risorsa_id]
      );

      if (risorsaCheck.rows.length === 0) {
        throw new Error('Risorsa non trovata');
      }

      const risorsa = risorsaCheck.rows[0];
      const costo_orario_base = parseFloat(risorsa.costo_orario);

      // Calcola costo orario finale con i margini
      let costo_orario_finale = costo_orario_base;

      if (margini) {
        // Applica ogni margine se attivo
        const marginiConfig = {
          costo_azienda: { perc: margini.costo_azienda_perc || 25, attivo: margini.costo_azienda_attivo !== false },
          utile_gestore_azienda: { perc: margini.utile_gestore_azienda_perc || 12.5, attivo: margini.utile_gestore_azienda_attivo !== false },
          utile_igs: { perc: margini.utile_igs_perc || 12.5, attivo: margini.utile_igs_attivo !== false },
          costi_professionista: { perc: margini.costi_professionista_perc || 20, attivo: margini.costi_professionista_attivo !== false },
          bonus_professionista: { perc: margini.bonus_professionista_perc || 5, attivo: margini.bonus_professionista_attivo !== false },
          gestore_societa: { perc: margini.gestore_societa_perc || 3, attivo: margini.gestore_societa_attivo !== false },
          commerciale: { perc: margini.commerciale_perc || 8, attivo: margini.commerciale_attivo !== false },
          centrale_igs: { perc: margini.centrale_igs_perc || 4, attivo: margini.centrale_igs_attivo !== false },
          network_igs: { perc: margini.network_igs_perc || 10, attivo: margini.network_igs_attivo !== false }
        };

        // Somma le percentuali attive
        let percentuale_totale = 0;
        Object.values(marginiConfig).forEach(m => {
          if (m.attivo) percentuale_totale += m.perc;
        });

        // Calcola costo finale
        costo_orario_finale = costo_orario_base * (1 + percentuale_totale / 100);
      }

      // Calcola budget risorsa
      const budget_risorsa = costo_orario_finale * parseFloat(ore_assegnate);

      // Inserisci assegnazione
      const result = await client.query(`
        INSERT INTO assegnazione_cliente_risorsa (
          cliente_id, risorsa_id, ore_assegnate, costo_orario_base,
          costo_azienda_perc, utile_gestore_azienda_perc, utile_igs_perc,
          costi_professionista_perc, bonus_professionista_perc, 
          gestore_societa_perc, commerciale_perc, centrale_igs_perc, network_igs_perc,
          costo_azienda_attivo, utile_gestore_azienda_attivo, utile_igs_attivo,
          costi_professionista_attivo, bonus_professionista_attivo,
          gestore_societa_attivo, commerciale_attivo, centrale_igs_attivo, network_igs_attivo,
          costo_orario_finale, budget_risorsa
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22,
          $23, $24
        )
        RETURNING *
      `, [
        cliente_id, risorsa_id, ore_assegnate, costo_orario_base,
        margini?.costo_azienda_perc || 25, margini?.utile_gestore_azienda_perc || 12.5, margini?.utile_igs_perc || 12.5,
        margini?.costi_professionista_perc || 20, margini?.bonus_professionista_perc || 5,
        margini?.gestore_societa_perc || 3, margini?.commerciale_perc || 8, margini?.centrale_igs_perc || 4, margini?.network_igs_perc || 10,
        margini?.costo_azienda_attivo !== false, margini?.utile_gestore_azienda_attivo !== false, margini?.utile_igs_attivo !== false,
        margini?.costi_professionista_attivo !== false, margini?.bonus_professionista_attivo !== false,
        margini?.gestore_societa_attivo !== false, margini?.commerciale_attivo !== false, margini?.centrale_igs_attivo !== false, margini?.network_igs_attivo !== false,
        costo_orario_finale, budget_risorsa
      ]);

      res.status(201).json({
        message: 'Risorsa assegnata al cliente con successo',
        assegnazione: result.rows[0]
      });
    });

  } catch (error) {
    console.error('Assign resource to client error:', error);
    res.status(500).json({ 
      error: 'Errore nell\'assegnazione risorsa',
      details: error.message 
    });
  }
});

// ========================================
// PUT /api/client-resources/:cliente_id/:risorsa_id
// Modifica assegnazione risorsa
// ========================================
router.put('/:cliente_id/:risorsa_id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { cliente_id, risorsa_id } = req.params;
    const { ore_assegnate, margini } = req.body;

    await transaction(async (client) => {
      // Ottieni assegnazione corrente
      const current = await client.query(
        'SELECT * FROM assegnazione_cliente_risorsa WHERE cliente_id = $1 AND risorsa_id = $2',
        [cliente_id, risorsa_id]
      );

      if (current.rows.length === 0) {
        throw new Error('Assegnazione non trovata');
      }

      const currentData = current.rows[0];

      // Usa valori correnti se non specificati
      const newOre = ore_assegnate !== undefined ? ore_assegnate : currentData.ore_assegnate;
      const costo_orario_base = parseFloat(currentData.costo_orario_base);

      // Ricalcola costo orario finale
      let costo_orario_finale = costo_orario_base;
      
      if (margini) {
        let percentuale_totale = 0;
        
        const checkMargine = (nome, defaultPerc, defaultAttivo = true) => {
          const perc = margini[`${nome}_perc`] !== undefined ? margini[`${nome}_perc`] : currentData[`${nome}_perc`] || defaultPerc;
          const attivo = margini[`${nome}_attivo`] !== undefined ? margini[`${nome}_attivo`] : currentData[`${nome}_attivo`] !== false;
          if (attivo) percentuale_totale += parseFloat(perc);
          return { perc, attivo };
        };

        const m = {
          costo_azienda: checkMargine('costo_azienda', 25),
          utile_gestore_azienda: checkMargine('utile_gestore_azienda', 12.5),
          utile_igs: checkMargine('utile_igs', 12.5),
          costi_professionista: checkMargine('costi_professionista', 20),
          bonus_professionista: checkMargine('bonus_professionista', 5),
          gestore_societa: checkMargine('gestore_societa', 3),
          commerciale: checkMargine('commerciale', 8),
          centrale_igs: checkMargine('centrale_igs', 4),
          network_igs: checkMargine('network_igs', 10)
        };

        costo_orario_finale = costo_orario_base * (1 + percentuale_totale / 100);
      } else {
        // Ricalcola con margini esistenti
        let percentuale_totale = 0;
        ['costo_azienda', 'utile_gestore_azienda', 'utile_igs', 'costi_professionista', 
         'bonus_professionista', 'gestore_societa', 'commerciale', 'centrale_igs', 'network_igs'].forEach(nome => {
          if (currentData[`${nome}_attivo`]) {
            percentuale_totale += parseFloat(currentData[`${nome}_perc`] || 0);
          }
        });
        costo_orario_finale = costo_orario_base * (1 + percentuale_totale / 100);
      }

      const budget_risorsa = costo_orario_finale * parseFloat(newOre);

      // Costruisci query UPDATE dinamica
      const updates = ['ore_assegnate = $1', 'costo_orario_finale = $2', 'budget_risorsa = $3'];
      const values = [newOre, costo_orario_finale, budget_risorsa];
      let paramIndex = 4;

      if (margini) {
        const marginiFields = [
          'costo_azienda', 'utile_gestore_azienda', 'utile_igs', 'costi_professionista',
          'bonus_professionista', 'gestore_societa', 'commerciale', 'centrale_igs', 'network_igs'
        ];

        marginiFields.forEach(field => {
          if (margini[`${field}_perc`] !== undefined) {
            updates.push(`${field}_perc = $${paramIndex}`);
            values.push(margini[`${field}_perc`]);
            paramIndex++;
          }
          if (margini[`${field}_attivo`] !== undefined) {
            updates.push(`${field}_attivo = $${paramIndex}`);
            values.push(margini[`${field}_attivo`]);
            paramIndex++;
          }
        });
      }

      values.push(cliente_id, risorsa_id);

      const result = await client.query(`
        UPDATE assegnazione_cliente_risorsa 
        SET ${updates.join(', ')}
        WHERE cliente_id = $${paramIndex} AND risorsa_id = $${paramIndex + 1}
        RETURNING *
      `, values);

      res.json({
        message: 'Assegnazione aggiornata con successo',
        assegnazione: result.rows[0]
      });
    });

  } catch (error) {
    console.error('Update client resource error:', error);
    res.status(500).json({ 
      error: 'Errore nell\'aggiornamento assegnazione',
      details: error.message 
    });
  }
});

// ========================================
// DELETE /api/client-resources/:cliente_id/:risorsa_id
// Rimuove assegnazione risorsa
// ========================================
router.delete('/:cliente_id/:risorsa_id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { cliente_id, risorsa_id } = req.params;

    const result = await query(`
      DELETE FROM assegnazione_cliente_risorsa
      WHERE cliente_id = $1 AND risorsa_id = $2
      RETURNING *
    `, [cliente_id, risorsa_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assegnazione non trovata' });
    }

    res.json({
      message: 'Risorsa rimossa dal cliente con successo',
      assegnazione: result.rows[0]
    });

  } catch (error) {
    console.error('Delete client resource error:', error);
    res.status(500).json({ 
      error: 'Errore nella rimozione risorsa',
      details: error.message 
    });
  }
});

module.exports = router;