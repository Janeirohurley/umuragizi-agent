import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const reproductionPlanInputSchema = z.object({
  animalId: z.string().optional().describe('ID de l\'animal spécifique (vide pour tout le troupeau)'),
  objectif: z.string().describe('Objectif : optimiser reproduction, planifier saillie, suivi gestation'),
});

const planResultSchema = z.object({
  animauxCibles: z.array(z.object({
    id: z.string(),
    nom: z.string(),
    espece: z.string(),
    statut: z.string(),
  })),
  recommandations: z.array(z.object({
    animalId: z.string(),
    action: z.string(),
    dateRecommandee: z.string(),
    priorite: z.string(),
    details: z.string(),
  })),
  calendrier: z.array(z.object({
    periode: z.string(),
    actions: z.array(z.string()),
  })),
  alertes: z.array(z.string()),
});

const fetchReproductionDataStep = createStep({
  id: 'fetch-reproduction-data',
  description: 'Récupérer les données de reproduction du troupeau',
  inputSchema: reproductionPlanInputSchema,
  outputSchema: z.object({
    animalId: z.string().optional(),
    objectif: z.string(),
    animaux: z.array(z.object({
      id: z.string(),
      nom: z.string(),
      espece: z.string(),
      sexe: z.string(),
      statut: z.string(),
    })),
    reproductions: z.array(z.object({
      animalId: z.string(),
      dateEvenement: z.string(),
      typeEvenement: z.string(),
      succes: z.boolean(),
    })),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) throw new Error('Input data not found');

    return {
      animalId: inputData.animalId,
      objectif: inputData.objectif,
      animaux: [],
      reproductions: [],
    };
  },
});

const generatePlanStep = createStep({
  id: 'generate-reproduction-plan',
  description: 'Générer un plan de reproduction basé sur les données',
  inputSchema: z.object({
    animalId: z.string().optional(),
    objectif: z.string(),
    animaux: z.array(z.any()),
    reproductions: z.array(z.any()),
  }),
  outputSchema: planResultSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) throw new Error('Input data not found');

    const agent = mastra?.getAgent('umuragiziAgent');
    if (!agent) throw new Error('Agent umuragizi non trouvé');

    const prompt = `Génère un plan de reproduction pour le troupeau.
Objectif : ${inputData.objectif}
Animaux disponibles : ${JSON.stringify(inputData.animaux)}
Historique reproduction : ${JSON.stringify(inputData.reproductions)}

Fournis un plan structuré avec :
1. Animaux cibles
2. Recommandations par animal (action, date, priorité, détails)
3. Calendrier par période
4. Alertes importantes

Réponds en JSON.`;

    const response = await agent.generate([{ role: 'user', content: prompt }]);

    try {
      const result = JSON.parse(response.text);
      return {
        animauxCibles: result.animauxCibles || [],
        recommandations: result.recommandations || [],
        calendrier: result.calendrier || [],
        alertes: result.alertes || [],
      };
    } catch {
      return {
        animauxCibles: [],
        recommandations: [{
          animalId: inputData.animalId || 'ensemble',
          action: 'Consulter l\'historique de reproduction',
          dateRecommandee: new Date().toISOString().split('T')[0],
          priorite: 'moyenne',
          details: 'Données insuffisantes pour un plan automatisé',
        }],
        calendrier: [],
        alertes: ['Données de reproduction insuffisantes pour un plan détaillé'],
      };
    }
  },
});

export const reproductionPlanningWorkflow = createWorkflow({
  id: 'reproduction-planning-workflow',
  inputSchema: reproductionPlanInputSchema,
  outputSchema: planResultSchema,
})
  .then(fetchReproductionDataStep)
  .then(generatePlanStep);

reproductionPlanningWorkflow.commit();
