import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDbFromContext, generateId, formatDate, periodeToSqlDate } from './tool-helpers';

const productionRecordSchema = z.object({
  id: z.string(),
  animalId: z.string(),
  date: z.string(),
  type: z.string(),
  quantite: z.number(),
  unite: z.string(),
  prixUnitaire: z.number().optional(),
  notes: z.string().optional(),
});

function rowToProduction(row: any) {
  return {
    id: row.id,
    animalId: row.animal_id,
    date: row.date,
    type: row.type,
    quantite: row.quantite,
    unite: row.unite,
    prixUnitaire: row.prix_unitaire ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export const listProductionsTool = createTool({
  id: 'list-productions',
  description: "Liste les enregistrements de production (lait, œufs, laine) d'un animal ou du troupeau.",
  inputSchema: z.object({
    animalId: z.string().optional().describe("ID de l'animal (vide pour tout le troupeau)"),
    type: z.string().optional().describe('Filtrer par type (Lait, Oeufs, Laine, Autre)'),
  }),
  outputSchema: z.object({
    enregistrements: z.array(productionRecordSchema),
    total: z.number(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    let sql = 'SELECT * FROM productions WHERE deleted = FALSE';
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

    const result = await db.query(sql, params);
    return {
      enregistrements: result.rows.map(rowToProduction),
      total: result.rows.length,
    };
  },
});

export const addProductionTool = createTool({
  id: 'add-production',
  description: 'Enregistrer une production (lait, œufs, laine).',
  inputSchema: z.object({
    animalId: z.string().describe("ID de l'animal"),
    type: z.string().describe('Type: Lait, Oeufs, Laine, Autre'),
    quantite: z.number().describe('Quantité produite'),
    unite: z.string().describe('Unité (L, unités, kg)'),
    date: z.string().optional().describe("Date (YYYY-MM-DD, défaut: aujourd'hui)"),
    notes: z.string().optional().describe('Notes'),
    prixUnitaire: z.number().optional().describe('Prix unitaire de vente en FC'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    enregistrement: productionRecordSchema.optional(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const id = generateId('prod');
    const date = formatDate(inputData.date);

    await db.query(
      `INSERT INTO productions (id, animal_id, date, type, quantite, unite, prix_unitaire, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        inputData.animalId,
        date,
        inputData.type,
        inputData.quantite,
        inputData.unite,
        inputData.prixUnitaire ?? null,
        inputData.notes ?? null,
      ],
    );

    const result = await db.query('SELECT * FROM productions WHERE deleted = FALSE AND id = $1', [id]);

    return {
      success: true,
      message: `${inputData.quantite} ${inputData.unite} de ${inputData.type} enregistré pour l'animal ${inputData.animalId}.`,
      enregistrement: rowToProduction(result.rows[0]),
    };
  },
});

export const getProductionSummaryTool = createTool({
  id: 'get-production-summary',
  description: "Résumé de la production du troupeau (quantités totales, revenus, par espèce).",
  inputSchema: z.object({
    periode: z.string().optional().describe('Période: "semaine", "mois", "trimestre" (défaut: mois)'),
  }),
  outputSchema: z.object({
    productionsTotales: z.record(z.string(), z.number()),
    revenuTotal: z.number(),
    parType: z.record(z.string(), z.object({
      quantite: z.number(),
      revenu: z.number(),
    })),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const since = periodeToSqlDate(inputData.periode);

    const totalResult = await db.query(
      `SELECT type, SUM(quantite) as total, unite 
            FROM productions WHERE deleted = FALSE AND date >= $1 
            GROUP BY type, unite`,
      [since],
    );

    const productionsTotales: Record<string, number> = {};
    for (const row of totalResult.rows) {
      const key = `${row.type} (${row.unite})`;
      productionsTotales[key] = Number(row.total);
    }

    const revenueResult = await db.query(
      `SELECT SUM(quantite * prix_unitaire) as total_revenue 
            FROM productions WHERE deleted = FALSE AND date >= $1 AND prix_unitaire IS NOT NULL`,
      [since],
    );
    const revenuTotal = Number(revenueResult.rows[0]?.total_revenue ?? 0);

    const byTypeResult = await db.query(
      `SELECT type, SUM(quantite) as qte, SUM(quantite * prix_unitaire) as rev
            FROM productions WHERE deleted = FALSE AND date >= $1
            GROUP BY type`,
      [since],
    );

    const parType: Record<string, { quantite: number; revenu: number }> = {};
    for (const row of byTypeResult.rows) {
      parType[String(row.type)] = {
        quantite: Number(row.qte),
        revenu: Number(row.rev ?? 0),
      };
    }

    return { productionsTotales, revenuTotal, parType };
  },
});
