# ARCHITECTURE.md

# Architecture du système de gestion des modèles IA

## Objectif

L'objectif de cette architecture est de construire une plateforme capable de gérer dynamiquement plusieurs fournisseurs de modèles d'intelligence artificielle sans que le reste de l'application ne dépende directement d'un fournisseur spécifique.

Le système doit permettre à l'administrateur d'ajouter, configurer, activer ou désactiver des fournisseurs, des comptes, des modèles et des groupes de modèles à partir d'une interface d'administration, sans modifier le code de l'application.

Les agents IA ne doivent jamais connaître le fournisseur utilisé. Ils doivent uniquement demander un modèle répondant à un besoin donné. Le système de routage est responsable de sélectionner automatiquement la meilleure ressource disponible.

---

# Principes d'architecture

Cette architecture repose sur les principes suivants :

* séparation complète entre les agents et les fournisseurs IA ;
* configuration entièrement dynamique depuis la base de données ;
* aucune clé API codée en dur dans l'application ;
* possibilité d'ajouter un nouveau fournisseur sans modifier les agents ;
* routage intelligent des requêtes ;
* haute disponibilité grâce au failover automatique ;
* compatibilité avec une architecture multi-tenant ;
* extensibilité vers de nouveaux modèles et fournisseurs.

---

# Vue d'ensemble

```text
                           Dashboard Administration
                                      │
                                      ▼
                           Model Management Service
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
    Providers                    Accounts                    Model Catalog
         │                            │                            │
         └────────────────────────────┼────────────────────────────┘
                                      │
                                      ▼
                              Routing Engine
                    ┌──────────────┼───────────────┐
                    │              │               │
                    ▼              ▼               ▼
              Round Robin      Failover      Load Balancer
                                      │
                                      ▼
                              Provider Adapter
                    ┌──────────┬──────────┬──────────┬──────────┐
                    ▼          ▼          ▼          ▼
                 Gemini      Groq     OpenRouter   Ollama
                                      │
                                      ▼
                                 Mastra Agent
```

---

# Philosophie

Les agents IA ne doivent jamais utiliser directement :

* Gemini
* OpenAI
* Groq
* Claude
* OpenRouter
* Ollama

Ils doivent uniquement demander :

> « Donne-moi le meilleur modèle disponible pour cette tâche. »

Le système décide automatiquement du fournisseur.

Ainsi, le changement de fournisseur n'entraîne jamais une modification des agents.

---

# Les Providers

Un Provider représente une plateforme proposant des modèles IA.

Exemples :

* OpenAI
* Google Gemini
* Groq
* Anthropic
* OpenRouter
* Ollama
* Mistral
* Azure OpenAI
* DeepSeek

Chaque Provider possède :

* un identifiant unique ;
* un nom ;
* une description ;
* un état (Actif, Désactivé) ;
* un adaptateur logiciel (Provider Adapter) ;
* ses paramètres de connexion.

Le Provider ne contient jamais directement les clés API.

---

# Les Accounts (Connexions)

Chaque Provider peut posséder plusieurs comptes.

Exemple :

Gemini

* Compte Personnel
* Compte Développement
* Compte Production
* Compte Backup

Chaque compte possède :

* API Key (chiffrée)
* nom
* description
* état
* quota
* date de création
* date d'expiration
* cooldown
* dernière erreur
* statistiques

Toutes les clés API doivent être stockées chiffrées.

Le système ne doit jamais enregistrer une clé en clair dans les journaux.

---

# Les Models

Les modèles sont enregistrés indépendamment du fournisseur.

Exemple :

Gemini

* gemini-2.5-pro
* gemini-2.5-flash

Groq

* llama-4
* qwen3
* deepseek-r1

OpenRouter

* claude
* gemini
* mistral

Chaque modèle possède :

* nom
* provider
* version
* contexte maximal
* support image
* support audio
* support outils (Tools)
* support raisonnement
* coût estimé
* vitesse estimée
* disponibilité

Le catalogue doit pouvoir évoluer sans modifier le code.

---

# Les Model Pools

Les agents ne demandent jamais un modèle précis.

Ils demandent un Pool.

Exemple :

```text
coding-fast
```

Le Pool contient plusieurs modèles classés par priorité.

```text
coding-fast

1. Gemini Flash

2. Groq Llama

3. OpenRouter DeepSeek

4. Ollama Local
```

Si le premier modèle est indisponible :

le système passe automatiquement au suivant.

Les Pools permettent de modifier les fournisseurs utilisés sans modifier les agents.

---

# Les Provider Adapters

Chaque Provider possède son propre adaptateur.

L'adaptateur est responsable de :

* construire la requête HTTP ;
* traduire les paramètres ;
* gérer le streaming ;
* convertir la réponse dans un format commun ;
* détecter les erreurs spécifiques au fournisseur.

Ainsi, le reste du système travaille toujours avec un format unifié.

---

# Le Routing Engine

Le Routing Engine est le cœur de cette architecture.

Il reçoit une demande provenant d'un agent.

Exemple :

```text
Pool = coding-fast
```

Le moteur :

* récupère tous les modèles appartenant au Pool ;
* trie les modèles selon les règles définies ;
* sélectionne un compte disponible ;
* vérifie les quotas ;
* vérifie le cooldown ;
* applique le Round Robin ;
* exécute la requête.

Le moteur est totalement indépendant des agents.

---

# Round Robin

Lorsqu'un Provider possède plusieurs comptes :

```text
Gemini

Compte A

Compte B

Compte C
```

Le système distribue automatiquement les requêtes.

Exemple :

Requête 1

→ Compte A

Requête 2

→ Compte B

Requête 3

→ Compte C

Requête 4

→ Compte A

Cette stratégie permet de répartir la charge.

---

# Gestion des quotas

Chaque réponse est analysée.

Si le fournisseur indique :

* quota dépassé ;
* limite quotidienne atteinte ;
* crédits insuffisants ;
* HTTP 429 ;

le compte est immédiatement marqué comme indisponible.

Le système passe automatiquement au compte suivant.

Le compte indisponible entre en période de cooldown.

Après expiration du cooldown, il pourra être testé automatiquement.

---

# Failover

Le système ne doit jamais s'arrêter lorsqu'un fournisseur devient indisponible.

Ordre de recherche :

Compte suivant

↓

Autre compte

↓

Autre modèle

↓

Autre Provider

↓

Autre Pool si autorisé

↓

Erreur uniquement si aucune ressource n'est disponible.

---

# Health Check

Le système vérifie périodiquement les Providers.

Les objectifs :

* détecter les comptes redevenus disponibles ;
* vérifier les quotas ;
* tester les connexions ;
* mesurer la latence.

Les comptes rétablis sont automatiquement réintégrés dans la rotation.

---

# Dashboard d'administration

L'administrateur doit disposer d'une interface permettant de gérer entièrement le système.

Le Dashboard doit permettre :

## Providers

* Ajouter
* Modifier
* Désactiver
* Supprimer

---

## Accounts

* Ajouter une API Key
* Tester la connexion
* Voir le quota
* Activer
* Désactiver
* Chiffrer automatiquement les clés

---

## Models

* Synchroniser automatiquement les modèles disponibles
* Ajouter manuellement un modèle
* Modifier ses propriétés

---

## Pools

Créer des groupes logiques.

Exemple :

* Default
* Coding
* Vision
* Chat
* Fast
* Cheap
* Free
* Premium
* Local

Chaque Pool est configurable par glisser-déposer ou par ordre de priorité.

---

# Statistiques

Le système doit enregistrer :

* nombre de requêtes ;
* temps moyen de réponse ;
* nombre de tokens consommés ;
* nombre d'échecs ;
* changements de Provider ;
* changements de compte ;
* quotas consommés ;
* taux de réussite.

Ces statistiques permettront d'optimiser automatiquement le routage à terme.

---

# Compatibilité Multi-Tenant

Chaque tenant possède sa propre configuration.

Un tenant peut avoir :

* ses propres Providers ;
* ses propres comptes ;
* ses propres Pools ;
* ses propres quotas ;
* ses propres statistiques.

Aucune donnée ne doit être partagée entre deux tenants.

Le moteur de routage doit toujours travailler dans le contexte du tenant courant.

---

# Intégration avec Mastra

Les agents Mastra ne doivent jamais appeler directement un SDK ou une API de fournisseur.

Ils communiquent uniquement avec un service interne :

```text
Mastra Agent
      │
      ▼
Model Service
      │
      ▼
Routing Engine
      │
      ▼
Provider Adapter
      │
      ▼
Provider IA
```

Cette séparation garantit que les agents restent indépendants de toute technologie externe.

---

# Évolutivité

L'architecture doit permettre, sans modification des agents :

* l'ajout de nouveaux fournisseurs ;
* l'ajout de nouveaux modèles ;
* l'ajout de nouvelles clés API ;
* l'ajout de nouveaux Pools ;
* l'ajout de nouvelles stratégies de routage (Round Robin, priorité, pondération, coût, latence, affinité, etc.).

Le système doit être conçu comme une couche de gestion des modèles IA entièrement indépendante, modulaire et extensible. Les agents ne doivent connaître que des capacités fonctionnelles ("chat", "vision", "coding", "reasoning", etc.), tandis que toute la logique de sélection, d'équilibrage, de basculement et d'administration est centralisée dans le Routing Engine.
