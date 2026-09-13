import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDbFromContext, generateId, formatDate } from './tool-helpers';

const reproductionRecordSchema = z.object({
  id: z.string(),
  animalId: z.string(),
  dateEvenement: z.string(),
  typeEvenement: z.string(),
  notes: z.string().optional(),
  datePrevueMiseBas: z.string().optional(),
  partenaireId: z.string().optional(),
  succes: z.boolean(),
});

function rowToReproduction(row: any) {
  return {
    id: row.id,
    animalId: row.animal_id,
    dateEvenement: row.date_evenement,
    typeEvenement: row.type_evenement,
    notes: row.notes ?? undefined,
    datePrevueMiseBas: row.date_prevue_mise_bas ?? undefined,
    partenaireId: row.partenaire_id ?? undefined,
    succes: row.succes === 1,
  };
}

export const listReproductionsTool = createTool({
  id: 'list-reproductions',
  description: "Liste les enregistrements de reproduction d'un animal ou de tout le troupeau.",
  inputSchema: z.object({
    animalId: z.string().optional().describe("ID de l'animal (vide pour tout le troupeau)"),
    typeEvenement: z.string().optional().describe('Filtrer par type (Saillie, Insémination, Diagnostic, Mise bas, Avortement)'),
  }),
  outputSchema: z.object({
    enregistrements: z.array(reproductionRecordSchema),
    total: z.number(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    let sql = 'SELECT * FROM reproductions WHERE deleted = FALSE';
    const params: any[] = [];
    let paramIndex = 1;

    if (inputData.animalId) {
      sql += ` AND animal_id = $${paramIndex}`;
      params.push(inputData.animalId);
      paramIndex++;
    }
    if (inputData.typeEvenement) {
      sql += ` AND LOWER(type_evenement) = LOWER($${paramIndex})`;
      params.push(inputData.typeEvenement);
      paramIndex++;
    }
    sql += ' ORDER BY date_evenement DESC';

    const result = await db.query(sql, params);
    return {
      enregistrements: result.rows.map(rowToReproduction),
      total: result.rows.length,
    };
  },
});

export const addReproductionTool = createTool({
  id: 'add-reproduction',
  description: "Enregistrer un événement de reproduction (saillie, insémination, diagnostic, mise bas).",
  inputSchema: z.object({
    animalId: z.string().describe("ID de l'animal femelle"),
    typeEvenement: z.string().describe('Type: Saillie, Insémination, Diagnostic gestation, Mise bas, Avortement'),
    dateEvenement: z.string().optional().describe("Date (YYYY-MM-DD, défaut: aujourd'hui)"),
    partenaireId: z.string().optional().describe('ID du mâle si saillie naturelle'),
    notes: z.string().optional().describe('Notes'),
    succes: z.boolean().optional().describe("Succès de l'événement (défaut: true)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    enregistrement: reproductionRecordSchema.optional(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const id = generateId('repro');
    const date = formatDate(inputData.dateEvenement);

    await db.query(
      `INSERT INTO reproductions (id, animal_id, date_evenement, type_evenement, notes, partenaire_id, succes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        inputData.animalId,
        date,
        inputData.typeEvenement,
        inputData.notes ?? null,
        inputData.partenaireId ?? null,
        inputData.succes ?? true ? 1 : 0,
      ],
    );

    const result = await db.query('SELECT * FROM reproductions WHERE deleted = FALSE AND id = $1', [id]);

    return {
      success: true,
      message: `Événement "${inputData.typeEvenement}" enregistré pour l'animal ${inputData.animalId}.`,
      enregistrement: rowToReproduction(result.rows[0]),
    };
  },
});

export const getReproductionCalendarTool = createTool({
  id: 'get-reproduction-calendar',
  description: "Obtenir le calendrier des prochains événements de reproduction (mises bas prévues, prochaines chaleurs).",
  inputSchema: z.object({
    joursAvant: z.number().optional().describe("Nombre de jours à anticiper (défaut: 90)"),
  }),
  outputSchema: z.object({
    misesBasPrevuees: z.array(z.object({
      animalId: z.string(),
      animalNom: z.string(),
      datePrevue: z.string(),
      joursRestants: z.number(),
    })),
    prochainesChaleurs: z.array(z.object({
      animalId: z.string(),
      animalNom: z.string(),
      dateEstimee: z.string(),
    })),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + (inputData.joursAvant ?? 90));
    const futureStr = futureDate.toISOString().split('T')[0];
    const nowStr = now.toISOString().split('T')[0];

    const misesBasResult = await db.query(
      `SELECT r.*, a.nom as animal_nom FROM reproductions r
            JOIN animals a ON r.animal_id = a.id
            WHERE r.deleted = FALSE AND r.date_prevue_mise_bas IS NOT NULL
            AND r.date_prevue_mise_bas >= $1 AND r.date_prevue_mise_bas <= $2
            ORDER BY r.date_prevue_mise_bas ASC`,
      [nowStr, futureStr],
    );

    const misesBasPrevuees = misesBasResult.rows.map((row: any) => {
      const datePrevue = row.date_prevue_mise_bas;
      const daysLeft = Math.ceil((new Date(datePrevue).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        animalId: row.animal_id,
        animalNom: row.animal_nom,
        datePrevue,
        joursRestants: daysLeft,
      };
    });

    return {
      misesBasPrevuees,
      prochainesChaleurs: [],
    };
  },
});
