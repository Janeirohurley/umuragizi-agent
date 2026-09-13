import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDbFromContext, generateId, formatDate, periodeToSqlDate } from './tool-helpers';

const feedingRecordSchema = z.object({
  id: z.string(),
  animalId: z.string(),
  date: z.string(),
  typeAliment: z.string(),
  quantite: z.number(),
  unite: z.string(),
  notes: z.string().optional(),
  prixUnitaire: z.number().optional(),
});

function rowToFeeding(row: any) {
  return {
    id: row.id,
    animalId: row.animal_id,
    date: row.date,
    typeAliment: row.type_aliment,
    quantite: row.quantite,
    unite: row.unite,
    notes: row.notes ?? undefined,
    prixUnitaire: row.prix_unitaire ?? undefined,
  };
}

export const listFeedingsTool = createTool({
  id: 'list-feedings',
  description: "Liste les enregistrements d'alimentation d'un animal.",
  inputSchema: z.object({
    animalId: z.string().describe("ID de l'animal"),
    limite: z.number().optional().describe('Nombre max de résultats (défaut: 20)'),
  }),
  outputSchema: z.object({
    enregistrements: z.array(feedingRecordSchema),
    total: z.number(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const result = await db.query(
      'SELECT * FROM alimentations WHERE deleted = FALSE AND animal_id = $1 ORDER BY date DESC LIMIT $2',
      [inputData.animalId, inputData.limite ?? 20],
    );

    return {
      enregistrements: result.rows.map(rowToFeeding),
      total: result.rows.length,
    };
  },
});

export const addFeedingTool = createTool({
  id: 'add-feeding',
  description: 'Enregistrer un repas pour un animal.',
  inputSchema: z.object({
    animalId: z.string().describe("ID de l'animal"),
    typeAliment: z.string().describe("Type d'aliment (herbe, foin, concentré, maïs, etc.)"),
    quantite: z.number().describe('Quantité'),
    unite: z.string().describe('Unité (kg, litres, bottes)'),
    date: z.string().optional().describe("Date (YYYY-MM-DD, défaut: aujourd'hui)"),
    notes: z.string().optional().describe('Notes'),
    prixUnitaire: z.number().optional().describe('Prix unitaire en FC'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    enregistrement: feedingRecordSchema.optional(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const id = generateId('feed');
    const date = formatDate(inputData.date);

    await db.query(
      `INSERT INTO alimentations (id, animal_id, date, type_aliment, quantite, unite, notes, prix_unitaire)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        inputData.animalId,
        date,
        inputData.typeAliment,
        inputData.quantite,
        inputData.unite,
        inputData.notes ?? null,
        inputData.prixUnitaire ?? null,
      ],
    );

    const result = await db.query('SELECT * FROM alimentations WHERE deleted = FALSE AND id = $1', [id]);

    return {
      success: true,
      message: `${inputData.quantite} ${inputData.unite} de ${inputData.typeAliment} enregistré pour l'animal ${inputData.animalId}.`,
      enregistrement: rowToFeeding(result.rows[0]),
    };
  },
});

export const getFeedingSummaryTool = createTool({
  id: 'get-feeding-summary',
  description: "Résumé de l'alimentation du troupeau (consommation totale, coûts, par espèce).",
  inputSchema: z.object({
    periode: z.string().optional().describe('Période: "semaine", "mois" (défaut: mois)'),
  }),
  outputSchema: z.object({
    consommationTotale: z.record(z.string(), z.number()),
    coutTotal: z.number(),
    parEspece: z.record(z.string(), z.object({
      nombreAnimaux: z.number(),
      consommationMoyenne: z.number(),
    })),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const since = periodeToSqlDate(inputData.periode);

    const totalResult = await db.query(
      `SELECT type_aliment, SUM(quantite) as total, unite 
            FROM alimentations WHERE deleted = FALSE AND date >= $1 
            GROUP BY type_aliment, unite`,
      [since],
    );

    const consommationTotale: Record<string, number> = {};
    let coutTotal = 0;
    for (const row of totalResult.rows) {
      const key = `${row.type_aliment} (${row.unite})`;
      consommationTotale[key] = Number(row.total);
    }

    const costResult = await db.query(
      `SELECT SUM(quantite * prix_unitaire) as total_cost 
            FROM alimentations WHERE deleted = FALSE AND date >= $1 AND prix_unitaire IS NOT NULL`,
      [since],
    );
    coutTotal = Number(costResult.rows[0]?.total_cost ?? 0);

    const bySpeciesResult = await db.query(
      `SELECT a.espece, COUNT(DISTINCT a.id) as nb, SUM(al.quantite) as total_qte
            FROM alimentations al
            JOIN animals a ON al.animal_id = a.id
            WHERE al.deleted = FALSE AND al.date >= $1
            GROUP BY a.espece`,
      [since],
    );

    const parEspece: Record<string, { nombreAnimaux: number; consommationMoyenne: number }> = {};
    for (const row of bySpeciesResult.rows) {
      const nb = Number(row.nb);
      const total = Number(row.total_qte);
      parEspece[String(row.espece)] = {
        nombreAnimaux: nb,
        consommationMoyenne: nb > 0 ? Math.round((total / nb) * 100) / 100 : 0,
      };
    }

    return { consommationTotale, coutTotal, parEspece };
  },
});
