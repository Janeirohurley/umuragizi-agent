import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDbFromContext, generateId, formatDate, periodeToSqlDate } from './tool-helpers';

const transactionSchema = z.object({
  id: z.string(),
  type: z.string(),
  montant: z.number(),
  date: z.string(),
  categorie: z.string(),
  animalId: z.string().optional(),
  description: z.string().optional(),
});

function rowToTransaction(row: any) {
  return {
    id: row.id,
    type: row.type,
    montant: row.montant,
    date: row.date,
    categorie: row.categorie,
    animalId: row.animal_id ?? undefined,
    description: row.description ?? undefined,
  };
}

export const listTransactionsTool = createTool({
  id: 'list-transactions',
  description: 'Liste les transactions (dépenses et revenus) de la ferme.',
  inputSchema: z.object({
    type: z.string().optional().describe('Filtrer par type (Dépense, Revenu)'),
    categorie: z.string().optional().describe('Filtrer par catégorie (Alimentation, Frais Vétérinaires, Vente, Autre)'),
    limite: z.number().optional().describe('Nombre max de résultats (défaut: 20)'),
  }),
  outputSchema: z.object({
    transactions: z.array(transactionSchema),
    total: z.number(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    let sql = 'SELECT * FROM transactions WHERE deleted = FALSE';
    const params: any[] = [];
    let paramIndex = 1;

    if (inputData.type) {
      sql += ` AND LOWER(type) = LOWER($${paramIndex})`;
      params.push(inputData.type);
      paramIndex++;
    }
    if (inputData.categorie) {
      sql += ` AND LOWER(categorie) = LOWER($${paramIndex})`;
      params.push(inputData.categorie);
      paramIndex++;
    }
    sql += ' ORDER BY date DESC';
    sql += ` LIMIT $${paramIndex}`;
    params.push(inputData.limite ?? 20);
    paramIndex++;

    const result = await db.query(sql, params);
    return {
      transactions: result.rows.map(rowToTransaction),
      total: result.rows.length,
    };
  },
});

export const addTransactionTool = createTool({
  id: 'add-transaction',
  description: 'Enregistrer une transaction (dépense ou revenu).',
  inputSchema: z.object({
    type: z.string().describe('Type: Dépense ou Revenu'),
    montant: z.number().describe('Montant en FC'),
    categorie: z.string().describe('Catégorie (Alimentation, Frais Vétérinaires, Vente, Autre)'),
    date: z.string().optional().describe("Date (YYYY-MM-DD, défaut: aujourd'hui)"),
    animalId: z.string().optional().describe("ID de l'animal si lié"),
    description: z.string().optional().describe('Description'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    transaction: transactionSchema.optional(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const id = generateId('txn');
    const date = formatDate(inputData.date);

    await db.query(
      `INSERT INTO transactions (id, type, montant, date, categorie, animal_id, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        inputData.type,
        inputData.montant,
        date,
        inputData.categorie,
        inputData.animalId ?? null,
        inputData.description ?? null,
      ],
    );

    const result = await db.query('SELECT * FROM transactions WHERE deleted = FALSE AND id = $1', [id]);

    return {
      success: true,
      message: `${inputData.type} de ${inputData.montant} FC (${inputData.categorie}) enregistrée.`,
      transaction: rowToTransaction(result.rows[0]),
    };
  },
});

export const getFinanceSummaryTool = createTool({
  id: 'get-finance-summary',
  description: "Bilan financier de la ferme (total dépenses, revenus, bénéfice, par catégorie).",
  inputSchema: z.object({
    periode: z.string().optional().describe('Période: "semaine", "mois", "trimestre", "annee" (défaut: mois)'),
  }),
  outputSchema: z.object({
    totalDepenses: z.number(),
    totalRevenus: z.number(),
    benefice: z.number(),
    depensesParCategorie: z.record(z.string(), z.number()),
    revenusParCategorie: z.record(z.string(), z.number()),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const since = periodeToSqlDate(inputData.periode);

    const depResult = await db.query(
      `SELECT categorie, SUM(montant) as total FROM transactions 
            WHERE deleted = FALSE AND LOWER(type) = 'dépense' AND date >= $1 GROUP BY categorie`,
      [since],
    );

    const revResult = await db.query(
      `SELECT categorie, SUM(montant) as total FROM transactions 
            WHERE deleted = FALSE AND LOWER(type) = 'revenu' AND date >= $1 GROUP BY categorie`,
      [since],
    );

    const depensesParCategorie: Record<string, number> = {};
    let totalDepenses = 0;
    for (const row of depResult.rows) {
      const montant = Number(row.total);
      depensesParCategorie[String(row.categorie)] = montant;
      totalDepenses += montant;
    }

    const revenusParCategorie: Record<string, number> = {};
    let totalRevenus = 0;
    for (const row of revResult.rows) {
      const montant = Number(row.total);
      revenusParCategorie[String(row.categorie)] = montant;
      totalRevenus += montant;
    }

    return {
      totalDepenses,
      totalRevenus,
      benefice: totalRevenus - totalDepenses,
      depensesParCategorie,
      revenusParCategorie,
    };
  },
});
