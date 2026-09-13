import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDbFromContext, generateId } from './tool-helpers';

const animalSchema = z.object({
  id: z.string(),
  nom: z.string(),
  espece: z.string(),
  race: z.string(),
  sexe: z.string(),
  dateNaissance: z.string(),
  identifiant: z.string(),
  statut: z.string(),
  notes: z.string().optional(),
  prixAchat: z.number().optional(),
});

function rowToAnimal(row: any) {
  return {
    id: row.id,
    nom: row.nom,
    espece: row.espece,
    race: row.race,
    sexe: row.sexe,
    dateNaissance: row.date_naissance,
    identifiant: row.identifiant,
    statut: row.statut,
    notes: row.notes ?? undefined,
    prixAchat: row.prix_achat ?? undefined,
  };
}

export const listAnimalsTool = createTool({
  id: 'list-animals',
  description: 'Liste tous les animaux de la ferme. Retourne la liste complète avec les détails de chaque animal.',
  inputSchema: z.object({
    espece: z.string().optional().describe('Filtrer par espèce (ex: bovin, caprin, ovin, porcin, volaille)'),
    statut: z.string().optional().describe('Filtrer par statut (Actif, Vendu, Mort, Réformé)'),
  }),
  outputSchema: z.object({
    animaux: z.array(animalSchema),
    total: z.number(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    let sql = 'SELECT * FROM animals WHERE deleted = FALSE';
    const params: any[] = [];
    let paramIndex = 1;

    if (inputData.espece) {
      sql += ` AND LOWER(espece) = LOWER($${paramIndex})`;
      params.push(inputData.espece);
      paramIndex++;
    }
    if (inputData.statut) {
      sql += ` AND LOWER(statut) = LOWER($${paramIndex})`;
      params.push(inputData.statut);
      paramIndex++;
    }
    sql += ' ORDER BY date_ajout DESC';

    const result = await db.query(sql, params);
    return {
      animaux: result.rows.map(rowToAnimal),
      total: result.rows.length,
    };
  },
});

export const getAnimalTool = createTool({
  id: 'get-animal',
  description: "Obtenir les détails complets d'un animal spécifique par son ID.",
  inputSchema: z.object({
    animalId: z.string().describe("L'ID de l'animal à rechercher"),
  }),
  outputSchema: animalSchema,
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const result = await db.query(
      'SELECT * FROM animals WHERE deleted = FALSE AND id = $1',
      [inputData.animalId],
    );

    if (result.rows.length === 0) {
      throw new Error(`Animal ${inputData.animalId} non trouvé.`);
    }

    return rowToAnimal(result.rows[0]);
  },
});

export const addAnimalTool = createTool({
  id: 'add-animal',
  description: 'Ajouter un nouvel animal à la ferme.',
  inputSchema: z.object({
    nom: z.string().describe("Nom de l'animal"),
    espece: z.string().describe('Espèce (bovin, caprin, ovin, porcin, volaille, etc.)'),
    race: z.string().describe('Race ou souche'),
    sexe: z.string().describe('Sexe (Mâle, Femelle)'),
    dateNaissance: z.string().describe('Date de naissance (YYYY-MM-DD)'),
    identifiant: z.string().describe('Identifiant unique (ex: BOV-001)'),
    notes: z.string().optional().describe('Notes supplémentaires'),
    prixAchat: z.number().optional().describe("Prix d'achat en FC"),
    mereId: z.string().optional().describe('ID de la mère si connu'),
    pereId: z.string().optional().describe('ID du père si connu'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    animal: animalSchema.optional(),
    message: z.string(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);
    const id = generateId('animal');

    await db.query(
      `INSERT INTO animals (id, nom, espece, race, sexe, date_naissance, identifiant, notes, prix_achat, mere_id, pere_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        inputData.nom,
        inputData.espece,
        inputData.race,
        inputData.sexe,
        inputData.dateNaissance,
        inputData.identifiant,
        inputData.notes ?? null,
        inputData.prixAchat ?? null,
        inputData.mereId ?? null,
        inputData.pereId ?? null,
      ],
    );

    const result = await db.query(
      'SELECT * FROM animals WHERE deleted = FALSE AND id = $1',
      [id],
    );

    return {
      success: true,
      animal: rowToAnimal(result.rows[0]),
      message: `Animal "${inputData.nom}" ajouté avec succès.`,
    };
  },
});

export const updateAnimalTool = createTool({
  id: 'update-animal',
  description: "Modifier les informations d'un animal existant.",
  inputSchema: z.object({
    animalId: z.string().describe("ID de l'animal à modifier"),
    nom: z.string().optional().describe('Nouveau nom'),
    race: z.string().optional().describe('Nouvelle race'),
    statut: z.string().optional().describe('Nouveau statut (Actif, Vendu, Mort, Réformé)'),
    notes: z.string().optional().describe('Nouvelles notes'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async (inputData, context) => {
    const { db } = await getDbFromContext(context);

    const existing = await db.query(
      'SELECT * FROM animals WHERE deleted = FALSE AND id = $1',
      [inputData.animalId],
    );
    if (existing.rows.length === 0) {
      throw new Error(`Animal ${inputData.animalId} non trouvé.`);
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (inputData.nom !== undefined) { updates.push(`nom = $${paramIndex}`); params.push(inputData.nom); paramIndex++; }
    if (inputData.race !== undefined) { updates.push(`race = $${paramIndex}`); params.push(inputData.race); paramIndex++; }
    if (inputData.statut !== undefined) { updates.push(`statut = $${paramIndex}`); params.push(inputData.statut); paramIndex++; }
    if (inputData.notes !== undefined) { updates.push(`notes = $${paramIndex}`); params.push(inputData.notes); paramIndex++; }

    if (updates.length === 0) {
      return { success: false, message: 'Aucun champ à modifier.' };
    }

    params.push(inputData.animalId);
    await db.query(
      `UPDATE animals SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params,
    );

    return {
      success: true,
      message: `Animal ${inputData.animalId} modifié avec succès.`,
    };
  },
});

export const deleteAnimalTool = createTool({
  id: 'delete-animal',
  description: "Supprimer un animal et toutes ses données associées (santé, croissance, alimentation, etc.).",
  inputSchema: z.object({
    animalId: z.string().describe("ID de l'animal à supprimer"),
    confirmation: z.boolean().describe('Confirmation de suppression (true pour confirmer)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async (inputData, context) => {
    if (!inputData.confirmation) {
      return {
        success: false,
        message: 'Suppression non confirmée. Envoyez confirmation: true pour supprimer.',
      };
    }

    const { db } = await getDbFromContext(context);

    const existing = await db.query(
      'SELECT * FROM animals WHERE deleted = FALSE AND id = $1',
      [inputData.animalId],
    );
    if (existing.rows.length === 0) {
      throw new Error(`Animal ${inputData.animalId} non trouvé.`);
    }

    const tables = ['santes', 'croissances', 'alimentations', 'reproductions', 'productions', 'rappels', 'genetic_infos'];
    for (const table of tables) {
      await db.query(
        `UPDATE ${table} SET deleted = TRUE, last_modified = NOW(), version = version + 1 WHERE animal_id = $1`,
        [inputData.animalId],
      );
    }

    await db.query(
      'UPDATE transactions SET deleted = TRUE, last_modified = NOW(), version = version + 1 WHERE animal_id = $1',
      [inputData.animalId],
    );

    await db.query(
      'UPDATE animals SET deleted = TRUE, last_modified = NOW(), version = version + 1 WHERE id = $1',
      [inputData.animalId],
    );

    return {
      success: true,
      message: `Animal ${inputData.animalId} et ses données associées supprimés.`,
    };
  },
});
