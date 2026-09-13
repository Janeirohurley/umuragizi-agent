# Plan : Agent Mastra Multi-Tenant — Umuragizi

## Architecture Globale

```
┌─────────────────────┐         HTTP API          ┌──────────────────────────┐
│  App Mobile Flutter │ ────────────────────────── │  Agent Mastra (SaaS)     │
│  (chaque éleveur)   │                           │  localhost:4111          │
└─────────────────────┘                           │                          │
                                                  │  ┌────────────────────┐  │
                                                  │  │ Auth: Token+Device │  │
                                                  │  └────────────────────┘  │
                                                  │                          │
                                                  │  ┌────────────────────┐  │
                                                  │  │ LLM: OpenRouter    │  │
                                                  │  │ llama-4-scout      │  │
                                                  │  └────────────────────┘  │
                                                  │                          │
                                                  │  ┌────────────────────┐  │
                                                  │  │ Par utilisateur:   │  │
                                                  │  │ ./data/{userId}/   │  │
                                                  │  │   mastra.db        │  │
                                                  │  └────────────────────┘  │
                                                  │                          │
                                                  │  ┌────────────────────┐  │
                                                  │  │ Agents:            │  │
                                                  │  │ - weatherAgent     │  │
                                                  │  │ - umuragiziAgent   │  │
                                                  │  └────────────────────┘  │
                                                  └──────────────────────────┘
```

## Structure des Fichiers

```
src/mastra/
├── agents/
│   ├── weather-agent.ts              ← gardé (example)
│   └── umuragizi-agent.ts            ← AGENT PRINCIPAL
├── tools/
│   ├── weather-tool.ts               ← gardé (example)
│   ├── animal-tool.ts                ← CRUD animaux
│   ├── health-tool.ts                ← Santé (vaccinations, maladies)
│   ├── growth-tool.ts                ← Croissance (poids, taille)
│   ├── feeding-tool.ts               ← Alimentation
│   ├── reproduction-tool.ts          ← Reproduction (cycles, gestations)
│   ├── production-tool.ts            ← Production (lait, œufs, laine)
│   ├── finance-tool.ts               ← Transactions (dépenses/revenus)
│   ├── reminder-tool.ts              ← Rappels (vaccinations, vermifuges)
│   └── weather-tool-umuragizi.ts     ← Météo pour conseils agricoles
├── workflows/
│   ├── weather-workflow.ts           ← gardé (example)
│   ├── health-analysis-workflow.ts   ← Analyse santé animale
│   └── reproduction-planning-workflow.ts ← Planification reproduction
├── auth/
│   ├── device-auth.ts                ← Authentification par token+device
│   └── token-utils.ts                ← Génération et hashage de tokens
├── middleware/
│   └── auth-middleware.ts            ← Middleware de vérification
├── services/
│   └── user-db.ts                    ← Gestion bases/utilisateur
├── scorers/
│   └── weather-scorer.ts             ← gardé (example)
└── index.ts                          ← Enregistrement des agents/tools/workflows
```

## Authentification par Token + Device Binding

### Base de données Auth

```sql
-- Table des utilisateurs
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table des liaisons device
CREATE TABLE device_bindings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  permanent_token_hash TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_platform TEXT,
  user_agent TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(device_id)
);

-- Table des tokens d'inscription (one-time)
CREATE TABLE registration_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  is_used INTEGER DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Flows

#### 1. Inscription
```
POST /api/auth/register
Body: { nom, email, password }
Response: { userId, registrationToken }
```

#### 2. Liaison Device
```
POST /api/auth/bind-device
Body: { registrationToken, deviceId, deviceName, devicePlatform }
Response: { permanentToken, userId }
```

#### 3. Vérification (chaque requête API)
```
Headers: {
  Authorization: Bearer <permanentToken>,
  X-Device-ID: <deviceId>
}
→ Vérifier token hash + device_id correspondent
```

## Outils CRUD

### animal-tool.ts
- `list-animals` : Lister tous les animaux
- `get-animal` : Détails d'un animal
- `add-animal` : Ajouter un animal
- `update-animal` : Modifier un animal
- `delete-animal` : Supprimer un animal

### health-tool.ts
- `list-health-records` : Historique santé d'un animal
- `add-health-record` : Ajouter un enregistrement santé
- `get-health-summary` : Résumé santé du troupeau

### growth-tool.ts
- `list-growth-records` : Historique croissance
- `add-growth-record` : Ajouter un pesée
- `get-growth-trend` : Tendance de croissance

### feeding-tool.ts
- `list-feedings` : Historique alimentation
- `add-feeding` : Enregistrer un repas
- `get-feeding-summary` : Résumé alimentation

### reproduction-tool.ts
- `list-reproductions` : Historique reproduction
- `add-reproduction` : Enregistrer un événement
- `get-reproduction-calendar` : Calendrier des gestations

### production-tool.ts
- `list-productions` : Historique production
- `add-production` : Enregistrer une production
- `get-production-summary` : Résumé production

### finance-tool.ts
- `list-transactions` : Historique transactions
- `add-transaction` : Enregistrer une transaction
- `get-finance-summary` : Bilan financier

### reminder-tool.ts
- `list-reminders` : Rappels
- `add-reminder` : Créer un rappel
- `complete-reminder` : Marquer comme fait

## Agent Principal

### Instructions (umuragizi-agent.ts)

Tu es **Umuragizi AI**, un assistant vétérinaire et agropastoral intelligent.

**Ton rôle :**
- Surveiller et prédire l'état de santé des animaux
- Analyser les données de croissance et donner des recommandations
- Gérer le calendrier des tâches (vaccinations, vermifugations, saillie)
- Comprendre les lignées génétiques et optimiser la reproduction
- Recevoir des alertes intelligentes et y répondre
- Prendre de meilleures décisions grâce à l'analyse des données

**Langue :** Détecte automatiquement la langue de l'utilisateur (FR, Kin, SW, EN)

**Style :** Clair, structuré, empathique, adapté à l'Afrique de l'Est

**Modèle :** `openrouter/meta-llama/llama-4-scout`

## Workflows

### health-analysis-workflow
1. Étape `analyze-symptoms` : Analyser les symptômes décrits
2. Étape `fetch-animal-data` : Récupérer les données de l'animal
3. Étape `generate-recommendation` : Générer des recommandations

### reproduction-planning-workflow
1. Étape `fetch-reproduction-data` : Récupérer les cycles
2. Étape `predict-next-heat` : Prédire les prochaines chaleurs
3. Étape `generate-plan` : Générer un plan de reproduction

## Implémentation

### Étape 1 : Services
- `services/user-db.ts` : Gestion des bases par utilisateur
- `auth/device-auth.ts` : Logique d'authentification
- `auth/token-utils.ts` : Utilitaires tokens

### Étape 2 : Outils
- Créer chaque tool CRUD

### Étape 3 : Agent
- `agents/umuragizi-agent.ts`

### Étape 4 : Workflows
- `workflows/health-analysis-workflow.ts`
- `workflows/reproduction-planning-workflow.ts`

### Étape 5 : Enregistrement
- `index.ts` : Tout enregistrer

### Étape 6 : Tests
- `npm run dev` pour tester
