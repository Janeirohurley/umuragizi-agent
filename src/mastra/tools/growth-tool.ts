import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDbFromContext, generateId, formatDate } from './tool-helpers';

const growthRecordSchema = z.object({
  id: z.string(),
  animalId: z.string(),
  date: z.string(),
  poids: z.number(),
  taille: z.number().optional(),
  etatPhysique: z.string().optional(),
  notes: z.string().optional(),
});

function rowToGrowth(row: any) {
  return {
    id: row.id,
    animalId: row.animal_id,
    date: row.date,
    poids: row.poids,
    taille: row.taille ?? undefined,
    etatPhysique: row.etat_physique ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export const listGrowthRecordsTool = createTool({
  id: 'list-growth-records',
  description: "Liste les enregistrements de croissance d'un animal.",
  inputSchema: z.object({
    animalId: z.string().describe("ID de l'animal"),
    limite: z.number().optional().describe('Nombre max de résultats (défaut: 20)'),
  }),
  outputSchema: z.object({
    enregistrements: z.array(growthRecordSchema),
    total: z.number(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const result = await db.query(
      'SELECT * FROM croissances WHERE deleted = FALSE AND animal_id = $1 ORDER BY date DESC LIMIT $2',
      [inputData.animalId, inputData.limite ?? 20],
    );

    return {
      enregistrements: result.rows.map(rowToGrowth),
      total: result.rows.length,
    };
  },
});

export const addGrowthRecordTool = createTool({
  id: 'add-growth-record',
  description: "Enregistrer une mesure de croissance (poids, taille) pour un animal.",
  inputSchema: z.object({
    animalId: z.string().describe("ID de l'animal"),
    poids: z.number().describe('Poids en kg'),
    taille: z.number().optional().describe('Taille en cm'),
    etatPhysique: z.string().optional().describe('État: excellent, bon, moyen, faible'),
    date: z.string().optional().describe("Date (YYYY-MM-DD, défaut: aujourd'hui)"),
    notes: z.string().optional().describe('Notes'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    enregistrement: growthRecordSchema.optional(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const id = generateId('grow');
    const date = formatDate(inputData.date);

    await db.query(
      `INSERT INTO croissances (id, animal_id, date, poids, taille, etat_physique, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        inputData.animalId,
        date,
        inputData.poids,
        inputData.taille ?? null,
        inputData.etatPhysique ?? null,
        inputData.notes ?? null,
      ],
    );

    const result = await db.query('SELECT * FROM croissances WHERE deleted = FALSE AND id = $1', [id]);

    return {
      success: true,
      message: `Pesée de ${inputData.poids} kg enregistrée pour l'animal ${inputData.animalId}.`,
      enregistrement: rowToGrowth(result.rows[0]),
    };
  },
});

export const getGrowthTrendTool = createTool({
  id: 'get-growth-trend',
  description: "Analyser la tendance de croissance d'un animal (gain de poids, croissance normale ou retard).",
  inputSchema: z.object({
    animalId: z.string().describe("ID de l'animal à analyser"),
  }),
  outputSchema: z.object({
    poidsActuel: z.number(),
    poidsPrecedent: z.number().optional(),
    variation: z.number().optional(),
    tendance: z.string(),
    alerte: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const result = await db.query(
      'SELECT * FROM croissances WHERE deleted = FALSE AND animal_id = $1 ORDER BY date DESC LIMIT 2',
      [inputData.animalId],
    );

    if (result.rows.length === 0) {
      return {
        poidsActuel: 0,
        tendance: "Données insuffisantes pour analyser la tendance.",
      };
    }

    const current = result.rows[0];
    const poidsActuel = Number(current.poids);

    if (result.rows.length < 2) {
      return {
        poidsActuel,
        tendance: `Poids actuel: ${poidsActuel} kg. Pas de données précédentes pour comparer.`,
      };
    }

    const prev = result.rows[1];
    const poidsPrecedent = Number(prev.poids);
    const variation = poidsActuel - poidsPrecedent;
    const pctChange = poidsPrecedent > 0 ? (variation / poidsPrecedent) * 100 : 0;

    let tendance: string;
    let alerte: string | undefined;

    if (pctChange > 5) {
      tendance = `Croissance positive (+${pctChange.toFixed(1)}%). L'animal prend bien du poids.`;
    } else if (pctChange < -5) {
      tendance = `Perte de poids (${pctChange.toFixed(1)}%). Attention!`;
      alerte = `L'animal a perdu ${Math.abs(variation).toFixed(1)} kg. Vérifiez l'alimentation et l'état de santé.`;
    } else {
      tendance = `Poids stable (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%).`;
    }

    return {
      poidsActuel,
      poidsPrecedent,
      variation,
      tendance,
      alerte,
    };
  },
});
