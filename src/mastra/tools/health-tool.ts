import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDbFromContext, generateId, formatDate, periodeToSqlDate } from './tool-helpers';

const healthRecordSchema = z.object({
  id: z.string(),
  animalId: z.string(),
  date: z.string(),
  type: z.string(),
  description: z.string(),
  medicament: z.string().optional(),
  veterinaire: z.string().optional(),
  notes: z.string().optional(),
  cout: z.number().optional(),
  estPaye: z.boolean(),
});

function rowToHealth(row: any) {
  return {
    id: row.id,
    animalId: row.animal_id,
    date: row.date,
    type: row.type,
    description: row.description,
    medicament: row.medicament ?? undefined,
    veterinaire: row.veterinaire ?? undefined,
    notes: row.notes ?? undefined,
    cout: row.cout ?? undefined,
    estPaye: row.est_paye === 1,
  };
}

export const listHealthRecordsTool = createTool({
  id: 'list-health-records',
  description: "Liste les enregistrements de santé d'un animal ou de tout le troupeau.",
  inputSchema: z.object({
    animalId: z.string().optional().describe("ID de l'animal (vide pour tout le troupeau)"),
    type: z.string().optional().describe('Filtrer par type (vaccination, traitement, maladie, visite)'),
    limite: z.number().optional().describe('Nombre max de résultats (défaut: 20)'),
  }),
  outputSchema: z.object({
    enregistrements: z.array(healthRecordSchema),
    total: z.number(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    let sql = 'SELECT * FROM santes WHERE deleted = FALSE';
    const params: any[] = [];
    let paramIndex = 1;

    if (inputData.animalId) {
      sql += ` AND animal_id = $${paramIndex}`;
      params.push(inputData.animalId);
      paramIndex++;
    }
    if (inputData.type) {
      sql += ` AND LOWER(type) = LOWER($${paramIndex})`;
      params.push(inputData.type);
      paramIndex++;
    }
    sql += ' ORDER BY date DESC';
    sql += ` LIMIT $${paramIndex}`;
    params.push(inputData.limite ?? 20);
    paramIndex++;

    const result = await db.query(sql, params);
    return {
      enregistrements: result.rows.map(rowToHealth),
      total: result.rows.length,
    };
  },
});

export const addHealthRecordTool = createTool({
  id: 'add-health-record',
  description: "Ajouter un enregistrement de santé (vaccination, traitement, maladie, visite vétérinaire).",
  inputSchema: z.object({
    animalId: z.string().describe("ID de l'animal concerné"),
    type: z.string().describe('Type: vaccination, traitement, maladie, visite'),
    description: z.string().describe("Description de l'événement"),
    date: z.string().optional().describe("Date (YYYY-MM-DD, défaut: aujourd'hui)"),
    medicament: z.string().optional().describe('Médicament utilisé'),
    veterinaire: z.string().optional().describe('Nom du vétérinaire'),
    notes: z.string().optional().describe('Notes supplémentaires'),
    cout: z.number().optional().describe('Coût en FC'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    enregistrement: healthRecordSchema.optional(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const id = generateId('sante');
    const date = formatDate(inputData.date);

    await db.query(
      `INSERT INTO santes (id, animal_id, date, type, description, medicament, veterinaire, notes, cout, est_paye)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)`,
      [
        id,
        inputData.animalId,
        date,
        inputData.type,
        inputData.description,
        inputData.medicament ?? null,
        inputData.veterinaire ?? null,
        inputData.notes ?? null,
        inputData.cout ?? null,
      ],
    );

    const result = await db.query('SELECT * FROM santes WHERE deleted = FALSE AND id = $1', [id]);

    return {
      success: true,
      message: `Enregistrement de santé ajouté pour l'animal ${inputData.animalId}.`,
      enregistrement: rowToHealth(result.rows[0]),
    };
  },
});

export const getHealthSummaryTool = createTool({
  id: 'get-health-summary',
  description: "Obtenir un résumé de la santé de tout le troupeau (dernières vaccinations, maladies récentes, alertes).",
  inputSchema: z.object({
    periode: z.string().optional().describe('Période: "semaine", "mois", "trimestre" (défaut: mois)'),
  }),
  outputSchema: z.object({
    vaccinationsRecentes: z.number(),
    maladiesRecientes: z.number(),
    traitementsEnCours: z.number(),
    alertes: z.array(z.string()),
    prochainesVaccinations: z.array(z.string()),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const since = periodeToSqlDate(inputData.periode);

    const vaccResult = await db.query(
      `SELECT COUNT(*) as cnt FROM santes WHERE LOWER(type) = 'vaccination' AND date >= $1`,
      [since],
    );

    const maladieResult = await db.query(
      `SELECT COUNT(*) as cnt FROM santes WHERE LOWER(type) = 'maladie' AND date >= $1`,
      [since],
    );

    const traitResult = await db.query(
      `SELECT COUNT(*) as cnt FROM santes WHERE LOWER(type) = 'traitement' AND date >= $1`,
      [since],
    );

    const recentSantes = await db.query(
      `SELECT s.*, a.nom as animal_nom FROM santes s 
            JOIN animals a ON s.animal_id = a.id 
            WHERE s.deleted = FALSE AND s.date >= $1 ORDER BY s.date DESC LIMIT 5`,
      [since],
    );

    const alertes: string[] = [];
    for (const row of recentSantes.rows) {
      if (String(row.type).toLowerCase() === 'maladie') {
        alertes.push(`${row.animal_nom}: ${row.description}`);
      }
    }

    return {
      vaccinationsRecentes: Number(vaccResult.rows[0]?.cnt ?? 0),
      maladiesRecientes: Number(maladieResult.rows[0]?.cnt ?? 0),
      traitementsEnCours: Number(traitResult.rows[0]?.cnt ?? 0),
      alertes,
      prochainesVaccinations: [],
    };
  },
});
