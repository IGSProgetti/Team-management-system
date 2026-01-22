const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

const router = express.Router();

// Middleware validazione margini
const validateMargini = [
  body('progetto_id').isUUID().withMessage('Progetto ID deve essere UUID valido'),
  body('risorsa_id').isUUID().withMessage('Risorsa ID deve essere UUID valido'),
  body('ore_assegnate').isInt({ min: 0 }).withMessage('Ore assegnate devono essere >= 0'),
];

// GET /api/margini/progetto/:progetto_id - Lista margini per progetto
router.get('/progetto/:progetto_id', authenticateToken, param('progetto_id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { progetto_id } = req.params;

    const result = await query(`
      SELECT 
        m.*,
        u.nome as risorsa_nome,
        u.email as risorsa_email,
        u.costo_orario as costo_orario_utente,
        -- Calcolo dettaglio voci (in euro)
        ROUND(m.costo_orario_base * 100.0 / m.costi_professionista_perc * m.costo_azienda_perc / 100.0, 2) as costo_azienda_euro,
        ROUND(m.costo_orario_base * 100.0 / m.costi_professionista_perc * m.utile_gestore_azienda_perc / 100.0, 2) as utile_gestore_azienda_euro,
        ROUND(m.costo_orario_base * 100.0 / m.costi_professionista_perc * m.utile_igs_perc / 100.0, 2) as utile_igs_euro,
        ROUND(m.costo_orario_base * 100.0 / m.costi_professionista_perc * m.costi_professionista_perc / 100.0, 2) as costi_professionista_euro,
        ROUND(m.costo_orario_base * 100.0 / m.costi_professionista_perc * m.bonus_professionista_perc / 100.0, 2) as bonus_professionista_euro,
        ROUND(m.costo_orario_base * 100.0 / m.costi_professionista_perc * m.gestore_societa_perc / 100.0, 2) as gestore_societa_euro,
        ROUND(m.costo_orario_base * 100.0 / m.costi_professionista_perc * m.commerciale_perc / 100.0, 2) as commerciale_euro,
        ROUND(m.costo_orario_base * 100.0 / m.costi_professionista_perc * m.centrale_igs_perc / 100.0, 2) as centrale_igs_euro,
        ROUND(m.costo_orario_base * 100.0 / m.costi_professionista_perc * m.network_igs_perc / 100.0, 2) as network_igs_euro,
        -- Costo totale per questa risorsa
        ROUND(m.costo_orario_finale * (m.ore_assegnate::decimal / 60.0), 2) as costo_totale_risorsa
      FROM margini_progetto m
      JOIN utenti u ON m.risorsa_id = u.id
      WHERE m.progetto_id = $1
      ORDER BY u.nome
    `, [progetto_id]);

    // Calcola totale costi progetto
    const totale = result.rows.reduce((sum, row) => sum + parseFloat(row.costo_totale_risorsa), 0);

    res.json({ 
      margini: result.rows,
      totale_costo_progetto: totale.toFixed(2)
    });

  } catch (error) {
    console.error('Get margini progetto error:', error);
    res.status(500).json({ error: 'Errore nel recupero dei margini', details: error.message });
  }
});

// POST /api/margini - Assegna risorsa a progetto con margini
router.post('/', authenticateToken, requireManager, validateMargini, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      progetto_id, 
      risorsa_id, 
      ore_assegnate,
      // Flags voci attive (default true se non specificato)
      costo_azienda_attivo = true,
      utile_gestore_azienda_attivo = true,
      utile_igs_attivo = true,
      costi_professionista_attivo = true,
      bonus_professionista_attivo = true,
      gestore_societa_attivo = true,
      commerciale_attivo = true,
      centrale_igs_attivo = true,
      network_igs_attivo = true
    } = req.body;

    // Verifica progetto esista
    const progettoCheck = await query('SELECT id, budget_assegnato FROM progetti WHERE id = $1', [progetto_id]);
    if (progettoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Progetto non trovato' });
    }

    // Verifica risorsa esista
    const risorsaCheck = await query('SELECT id, costo_orario FROM utenti WHERE id = $1 AND attivo = true', [risorsa_id]);
    if (risorsaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Risorsa non trovata' });
    }

    const costoOrarioBase = parseFloat(risorsaCheck.rows[0].costo_orario);

    // Verifica se risorsa già assegnata
    const assegnazioneCheck = await query(
      'SELECT id FROM margini_progetto WHERE progetto_id = $1 AND risorsa_id = $2',
      [progetto_id, risorsa_id]
    );

    if (assegnazioneCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Risorsa già assegnata a questo progetto' });
    }

    // Calcola costo orario finale (il trigger lo farà, ma lo calcoliamo per il controllo budget)
    const costoOrarioPieno = costoOrarioBase * 100.0 / 20.0; // Base 100%
    let costoOrarioFinale = costoOrarioPieno;

    // Sottrai voci non attive
    if (!costo_azienda_attivo) costoOrarioFinale -= (costoOrarioPieno * 25.0 / 100.0);
    if (!utile_gestore_azienda_attivo) costoOrarioFinale -= (costoOrarioPieno * 12.5 / 100.0);
    if (!utile_igs_attivo) costoOrarioFinale -= (costoOrarioPieno * 12.5 / 100.0);
    if (!bonus_professionista_attivo) costoOrarioFinale -= (costoOrarioPieno * 5.0 / 100.0);
    if (!gestore_societa_attivo) costoOrarioFinale -= (costoOrarioPieno * 3.0 / 100.0);
    if (!commerciale_attivo) costoOrarioFinale -= (costoOrarioPieno * 8.0 / 100.0);
    if (!centrale_igs_attivo) costoOrarioFinale -= (costoOrarioPieno * 4.0 / 100.0);
    if (!network_igs_attivo) costoOrarioFinale -= (costoOrarioPieno * 10.0 / 100.0);

    // Calcola costo totale questa risorsa
    const costoTotaleNuovaRisorsa = costoOrarioFinale * (ore_assegnate / 60.0);

    // Verifica budget progetto
    const budgetProgetto = parseFloat(progettoCheck.rows[0].budget_assegnato);
    
    // Calcola budget già utilizzato
    const budgetUtilizzato = await query(`
      SELECT COALESCE(SUM(costo_orario_finale * (ore_assegnate::decimal / 60.0)), 0) as totale
      FROM margini_progetto
      WHERE progetto_id = $1
    `, [progetto_id]);

    const budgetTotale = parseFloat(budgetUtilizzato.rows[0].totale) + costoTotaleNuovaRisorsa;

    // Solo Manager/Super Admin possono sforare budget
    if (req.user.ruolo !== 'super_admin' && budgetTotale > budgetProgetto) {
      return res.status(400).json({ 
        error: 'Budget insufficiente',
        details: `Budget disponibile: €${(budgetProgetto - budgetUtilizzato.rows[0].totale).toFixed(2)}`,
        costo_risorsa: costoTotaleNuovaRisorsa.toFixed(2)
      });
    }

    // Inserisci margini (il trigger calcola costo_orario_finale automaticamente)
    const result = await query(`
      INSERT INTO margini_progetto (
        progetto_id, risorsa_id, costo_orario_base, ore_assegnate,
        costo_azienda_attivo, utile_gestore_azienda_attivo, utile_igs_attivo,
        costi_professionista_attivo, bonus_professionista_attivo,
        gestore_societa_attivo, commerciale_attivo, centrale_igs_attivo, network_igs_attivo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      progetto_id, risorsa_id, costoOrarioBase, ore_assegnate,
      costo_azienda_attivo, utile_gestore_azienda_attivo, utile_igs_attivo,
      costi_professionista_attivo, bonus_professionista_attivo,
      gestore_societa_attivo, commerciale_attivo, centrale_igs_attivo, network_igs_attivo
    ]);

    // Crea anche assegnazione_progetto per compatibilità
    await query(`
      INSERT INTO assegnazioni_progetto (progetto_id, utente_id, ore_assegnate)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `, [progetto_id, risorsa_id, ore_assegnate]);

    res.status(201).json({ 
      message: 'Risorsa assegnata al progetto con successo',
      margine: result.rows[0]
    });

  } catch (error) {
    console.error('Assign resource to project error:', error);
    res.status(500).json({ error: 'Errore nell\'assegnazione della risorsa', details: error.message });
  }
});

// PUT /api/margini/:id - Modifica margini risorsa
router.put('/:id', authenticateToken, requireManager, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { 
      ore_assegnate,
      costo_azienda_attivo,
      utile_gestore_azienda_attivo,
      utile_igs_attivo,
      costi_professionista_attivo,
      bonus_professionista_attivo,
      gestore_societa_attivo,
      commerciale_attivo,
      centrale_igs_attivo,
      network_igs_attivo
    } = req.body;

    // Verifica margine esista
    const margineCheck = await query('SELECT * FROM margini_progetto WHERE id = $1', [id]);
    if (margineCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Margine non trovato' });
    }

    // Aggiorna margini (trigger ricalcola costo_orario_finale automaticamente)
    const result = await query(`
      UPDATE margini_progetto 
      SET 
        ore_assegnate = COALESCE($1, ore_assegnate),
        costo_azienda_attivo = COALESCE($2, costo_azienda_attivo),
        utile_gestore_azienda_attivo = COALESCE($3, utile_gestore_azienda_attivo),
        utile_igs_attivo = COALESCE($4, utile_igs_attivo),
        costi_professionista_attivo = COALESCE($5, costi_professionista_attivo),
        bonus_professionista_attivo = COALESCE($6, bonus_professionista_attivo),
        gestore_societa_attivo = COALESCE($7, gestore_societa_attivo),
        commerciale_attivo = COALESCE($8, commerciale_attivo),
        centrale_igs_attivo = COALESCE($9, centrale_igs_attivo),
        network_igs_attivo = COALESCE($10, network_igs_attivo)
      WHERE id = $11
      RETURNING *
    `, [
      ore_assegnate,
      costo_azienda_attivo,
      utile_gestore_azienda_attivo,
      utile_igs_attivo,
      costi_professionista_attivo,
      bonus_professionista_attivo,
      gestore_societa_attivo,
      commerciale_attivo,
      centrale_igs_attivo,
      network_igs_attivo,
      id
    ]);

    res.json({ 
      message: 'Margini aggiornati con successo',
      margine: result.rows[0]
    });

  } catch (error) {
    console.error('Update margini error:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento dei margini', details: error.message });
  }
});

// DELETE /api/margini/:id - Rimuovi risorsa da progetto
router.delete('/:id', authenticateToken, requireManager, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Verifica margine esista
    const margineCheck = await query('SELECT progetto_id, risorsa_id FROM margini_progetto WHERE id = $1', [id]);
    if (margineCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Margine non trovato' });
    }

    // Elimina margine
    await query('DELETE FROM margini_progetto WHERE id = $1', [id]);

    // Elimina anche da assegnazioni_progetto
    await query(
      'DELETE FROM assegnazioni_progetto WHERE progetto_id = $1 AND utente_id = $2',
      [margineCheck.rows[0].progetto_id, margineCheck.rows[0].risorsa_id]
    );

    res.json({ message: 'Risorsa rimossa dal progetto con successo' });

  } catch (error) {
    console.error('Delete margini error:', error);
    res.status(500).json({ error: 'Errore nella rimozione della risorsa', details: error.message });
  }
});

// GET /api/margini/anteprima - Anteprima calcolo margini
router.post('/anteprima', authenticateToken, requireManager, async (req, res) => {
  try {
    const { 
      costo_orario_base,
      ore_assegnate,
      costo_azienda_attivo = true,
      utile_gestore_azienda_attivo = true,
      utile_igs_attivo = true,
      costi_professionista_attivo = true,
      bonus_professionista_attivo = true,
      gestore_societa_attivo = true,
      commerciale_attivo = true,
      centrale_igs_attivo = true,
      network_igs_attivo = true
    } = req.body;

    if (!costo_orario_base) {
      return res.status(400).json({ error: 'costo_orario_base obbligatorio' });
    }

    // Calcola costo al 100%
    const costoOrarioPieno = costo_orario_base * 100.0 / 20.0;

    // Calcola singole voci in euro
    const voci = {
      costo_azienda: {
        percentuale: 25.00,
        euro: (costoOrarioPieno * 25.0 / 100.0).toFixed(2),
        attivo: costo_azienda_attivo
      },
      utile_gestore_azienda: {
        percentuale: 12.50,
        euro: (costoOrarioPieno * 12.5 / 100.0).toFixed(2),
        attivo: utile_gestore_azienda_attivo
      },
      utile_igs: {
        percentuale: 12.50,
        euro: (costoOrarioPieno * 12.5 / 100.0).toFixed(2),
        attivo: utile_igs_attivo
      },
      costi_professionista: {
        percentuale: 20.00,
        euro: (costoOrarioPieno * 20.0 / 100.0).toFixed(2),
        attivo: costi_professionista_attivo
      },
      bonus_professionista: {
        percentuale: 5.00,
        euro: (costoOrarioPieno * 5.0 / 100.0).toFixed(2),
        attivo: bonus_professionista_attivo
      },
      gestore_societa: {
        percentuale: 3.00,
        euro: (costoOrarioPieno * 3.0 / 100.0).toFixed(2),
        attivo: gestore_societa_attivo
      },
      commerciale: {
        percentuale: 8.00,
        euro: (costoOrarioPieno * 8.0 / 100.0).toFixed(2),
        attivo: commerciale_attivo
      },
      centrale_igs: {
        percentuale: 4.00,
        euro: (costoOrarioPieno * 4.0 / 100.0).toFixed(2),
        attivo: centrale_igs_attivo
      },
      network_igs: {
        percentuale: 10.00,
        euro: (costoOrarioPieno * 10.0 / 100.0).toFixed(2),
        attivo: network_igs_attivo
      }
    };

    // Calcola costo finale (sottrai voci non attive)
    let costoOrarioFinale = costoOrarioPieno;
    Object.values(voci).forEach(voce => {
      if (!voce.attivo) {
        costoOrarioFinale -= parseFloat(voce.euro);
      }
    });

    // Calcola costo totale se ore specificate
    const costoTotale = ore_assegnate ? (costoOrarioFinale * (ore_assegnate / 60.0)).toFixed(2) : null;

    res.json({
      costo_orario_base: parseFloat(costo_orario_base).toFixed(2),
      costo_orario_pieno: costoOrarioPieno.toFixed(2),
      costo_orario_finale: costoOrarioFinale.toFixed(2),
      voci,
      ore_assegnate: ore_assegnate || null,
      costo_totale: costoTotale
    });

  } catch (error) {
    console.error('Anteprima margini error:', error);
    res.status(500).json({ error: 'Errore nel calcolo anteprima', details: error.message });
  }
});

module.exports = router;