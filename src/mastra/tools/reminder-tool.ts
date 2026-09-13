import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDbFromContext, generateId } from './tool-helpers';

const reminderSchema = z.object({
  id: z.string(),
  animalId: z.string(),
  titre: z.string(),
  description: z.string(),
  dateRappel: z.string(),
  type: z.string(),
  estComplete: z.boolean(),
  recurrent: z.boolean(),
  intervalleJours: z.number().optional(),
});

function rowToReminder(row: any) {
  return {
    id: row.id,
    animalId: row.animal_id,
    titre: row.titre,
    description: row.description,
    dateRappel: row.date_rappel,
    type: row.type,
    estComplete: row.est_complete === 1,
    recurrent: row.recurrent === 1,
    intervalleJours: row.intervalle_jours ?? undefined,
  };
}

export const listRemindersTool = createTool({
  id: 'list-reminders',
  description: 'Liste les rappels (vaccinations, vermifuges, visites vétérinaires).',
  inputSchema: z.object({
    animalId: z.string().optional().describe("ID de l'animal (vide pour tous)"),
    statut: z.string().optional().describe('Filtrer: "en_retard", "aujourdhui", "cette_semaine", "a_venir", "tous"'),
  }),
  outputSchema: z.object({
    rappels: z.array(reminderSchema),
    total: z.number(),
    enRetard: z.number(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const now = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekStr = weekFromNow.toISOString().split('T')[0];

    let sql = 'SELECT * FROM rappels WHERE deleted = FALSE AND est_complete = 0';
    const params: any[] = [];
    let paramIndex = 1;

    if (inputData.animalId) {
      sql += ` AND animal_id = $${paramIndex}`;
      params.push(inputData.animalId);
      paramIndex++;
    }

    switch (inputData.statut) {
      case 'en_retard':
        sql += ` AND date_rappel < $${paramIndex}`;
        params.push(now);
        paramIndex++;
        break;
      case 'aujourdhui':
        sql += ` AND date_rappel = $${paramIndex}`;
        params.push(now);
        paramIndex++;
        break;
      case 'cette_semaine':
        sql += ` AND date_rappel >= $${paramIndex} AND date_rappel <= $${paramIndex + 1}`;
        params.push(now);
        params.push(weekStr);
        paramIndex += 2;
        break;
      case 'a_venir':
        sql += ` AND date_rappel > $${paramIndex}`;
        params.push(now);
        paramIndex++;
        break;
    }

    sql += ' ORDER BY date_rappel ASC';

    const result = await db.query(sql, params);
    const rappels = result.rows.map(rowToReminder);
    const enRetard = rappels.filter((r: any) => r.dateRappel < now).length;

    return {
      rappels,
      total: rappels.length,
      enRetard,
    };
  },
});

export const addReminderTool = createTool({
  id: 'add-reminder',
  description: "Créer un rappel pour un animal (vaccination, vermifuge, visite vétérinaire, etc.).",
  inputSchema: z.object({
    animalId: z.string().describe("ID de l'animal"),
    titre: z.string().describe('Titre du rappel'),
    description: z.string().describe('Description'),
    type: z.string().describe('Type: vaccination, vermifuge, visite_veterinaire, soin, autre'),
    dateRappel: z.string().describe('Date du rappel (YYYY-MM-DD)'),
    recurrent: z.boolean().optional().describe("Rappel récurrent (défaut: false)"),
    intervalleJours: z.number().optional().describe('Intervalle en jours si récurrent'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    rappel: reminderSchema.optional(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const id = generateId('remind');

    await db.query(
      `INSERT INTO rappels (id, animal_id, titre, description, date_rappel, type, recurrent, intervalle_jours)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        inputData.animalId,
        inputData.titre,
        inputData.description,
        inputData.dateRappel,
        inputData.type,
        inputData.recurrent ?? false ? 1 : 0,
        inputData.intervalleJours ?? null,
      ],
    );

    const result = await db.query('SELECT * FROM rappels WHERE deleted = FALSE AND id = $1', [id]);

    return {
      success: true,
      message: `Rappel "${inputData.titre}" créé pour le ${inputData.dateRappel}.`,
      rappel: rowToReminder(result.rows[0]),
    };
  },
});

export const completeReminderTool = createTool({
  id: 'complete-reminder',
  description: 'Marquer un rappel comme terminé.',
  inputSchema: z.object({
    reminderId: z.string().describe('ID du rappel à compléter'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);

    const existing = await db.query(
      'SELECT * FROM rappels WHERE deleted = FALSE AND id = $1',
      [inputData.reminderId],
    );
    if (existing.rows.length === 0) {
      throw new Error(`Rappel ${inputData.reminderId} non trouvé.`);
    }

    await db.query(
      `UPDATE rappels SET est_complete = 1, date_completion = NOW() WHERE id = $1`,
      [inputData.reminderId],
    );

    return {
      success: true,
      message: `Rappel ${inputData.reminderId} marqué comme terminé.`,
    };
  },
});
