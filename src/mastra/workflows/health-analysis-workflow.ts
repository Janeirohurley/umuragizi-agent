import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const healthAnalysisInputSchema = z.object({
  animalId: z.string().describe('ID de l\'animal à analyser'),
  symptomes: z.string().describe('Description des symptômes observés'),
});

const analysisResultSchema = z.object({
  animalId: z.string(),
  observations: z.array(z.string()),
  diagnosticsProbables: z.array(z.object({
    maladie: z.string(),
    probabilite: z.string(),
    description: z.string(),
  })),
  actionsRecommandees: z.array(z.string()),
  urgence: z.string(),
  alerteCritique: z.boolean(),
});

const analyzeSymptomsStep = createStep({
  id: 'analyze-symptoms',
  description: 'Analyser les symptômes décrits et identifier les diagnostics probables',
  inputSchema: healthAnalysisInputSchema,
  outputSchema: z.object({
    animalId: z.string(),
    symptomes: z.string(),
    diagnosticsInitiaux: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) throw new Error('Input data not found');

    const symptomesLower = inputData.symptomes.toLowerCase();
    const diagnostics: string[] = [];

    if (symptomesLower.includes('toux') || symptomesLower.includes('respiration')) {
      diagnostics.push('Infection respiratoire', 'Pasteurellose', 'Charbon symptomatique');
    }
    if (symptomesLower.includes('diarrhée') || symptomesLower.includes('diarrhee')) {
      diagnostics.push('Coccidiose', 'Entérite', 'Ruminations inversées');
    }
    if (symptomesLower.includes('boite') || symptomesLower.includes('boiterie')) {
      diagnostics.push('Clavelée', 'Lésion digitale', 'Fourchet');
    }
    if (symptomesLower.includes('fièvre') || symptomesLower.includes('fievre')) {
      diagnostics.push('Fièvre aphteuse', 'Brucellose', 'Charbon');
    }
    if (symptomesLower.includes('peau') || symptomesLower.includes('lésion')) {
      diagnostics.push('Dermatophilose', 'Gale', 'Myiase');
    }
    if (symptomesLower.includes('mamelle') || symptomesLower.includes('lait')) {
      diagnostics.push('Mammite', 'Agalactie');
    }

    if (diagnostics.length === 0) {
      diagnostics.push('Diagnostic incertain - consulter un vétérinaire');
    }

    return {
      animalId: inputData.animalId,
      symptomes: inputData.symptomes,
      diagnosticsInitiaux: diagnostics,
    };
  },
});

const fetchAnimalDataStep = createStep({
  id: 'fetch-animal-data',
  description: 'Récupérer les données de l\'animal pour enrichir l\'analyse',
  inputSchema: z.object({
    animalId: z.string(),
    symptomes: z.string(),
    diagnosticsInitiaux: z.array(z.string()),
  }),
  outputSchema: analysisResultSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) throw new Error('Input data not found');

    const agent = mastra?.getAgent('umuragiziAgent');
    if (!agent) throw new Error('Agent umuragizi non trouvé');

    const prompt = `Analyse les symptômes suivants pour l'animal ${inputData.animalId} :
Symptômes : ${inputData.symptomes}
Diagnostics initiaux : ${inputData.diagnosticsInitiaux.join(', ')}

Fournis une analyse structurée avec :
1. Observations détaillées
2. Diagnostics probables avec probabilité
3. Actions recommandées immédiates
4. Niveau d'urgence (faible, moyen, élevé, critique)
5. Si c'est une alerte critique (true/false)

Réponds en JSON.`;

    const response = await agent.generate([{ role: 'user', content: prompt }]);

    try {
      const result = JSON.parse(response.text);
      return {
        animalId: inputData.animalId,
        observations: result.observations || [],
        diagnosticsProbables: result.diagnosticsProbables || [],
        actionsRecommandees: result.actionsRecommandees || [],
        urgence: result.urgence || 'moyen',
        alerteCritique: result.alerteCritique || false,
      };
    } catch {
      return {
        animalId: inputData.animalId,
        observations: [`Analyse des symptômes : ${inputData.symptomes}`],
        diagnosticsProbables: inputData.diagnosticsInitiaux.map(d => ({
          maladie: d,
          probabilite: 'moyenne',
          description: `Diagnostic possible basé sur les symptômes`,
        })),
        actionsRecommandees: ['Consulter un vétérinaire pour un diagnostic précis'],
        urgence: 'moyen',
        alerteCritique: false,
      };
    }
  },
});

export const healthAnalysisWorkflow = createWorkflow({
  id: 'health-analysis-workflow',
  inputSchema: healthAnalysisInputSchema,
  outputSchema: analysisResultSchema,
})
  .then(analyzeSymptomsStep)
  .then(fetchAnimalDataStep);

healthAnalysisWorkflow.commit();
