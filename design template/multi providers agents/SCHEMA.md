# SCHEMA.md

# Schéma conceptuel des données (Domain Model)

## Objectif

Ce document décrit le modèle conceptuel des données de la plateforme de gestion des modèles IA. Il définit les principales entités, leurs responsabilités et leurs relations. Il s'agit d'un schéma métier indépendant du moteur de base de données (PostgreSQL, MySQL, MongoDB, etc.).

L'objectif est de garantir une structure cohérente, extensible et compatible avec une architecture multi-tenant.

---

# Vue d'ensemble

```text
Tenant
│
├── Users (Administrateurs)
│
├── Providers
│     ├── Accounts
│     ├── Models
│     └── Health Checks
│
├── Model Pools
│     ├── Pool Models
│     └── Routing Policies
│
├── Agents
│
├── Conversations
│     ├── Messages
│     └── Sessions
│
├── Devices
│
├── API Tokens
│
├── Audit Logs
│
├── Statistics
│
└── Settings
```

Chaque entité est rattachée à un **Tenant** afin d'assurer l'isolation complète des données.

---

# Tenant

Représente une organisation ou un espace logique indépendant.

## Attributs

* id
* uuid
* name
* slug
* status
* timezone
* locale
* createdAt
* updatedAt

## Relations

* possède plusieurs Providers
* possède plusieurs Devices
* possède plusieurs Agents
* possède plusieurs Pools
* possède plusieurs Conversations
* possède plusieurs Administrateurs
* possède plusieurs Journaux

---

# User (Administrateur)

Représente un administrateur de la plateforme.

## Attributs

* id
* tenantId
* firstName
* lastName
* email
* passwordHash
* role
* status
* lastLogin
* createdAt

## Relations

* appartient à un Tenant

> **Remarque :** cette entité concerne uniquement les administrateurs. Les utilisateurs finaux de l'application peuvent suivre un modèle d'authentification sans compte (Device ID + Token), indépendant de cette table.

---

# Provider

Représente un fournisseur de modèles IA.

## Exemples

* Gemini
* OpenAI
* Groq
* OpenRouter
* Ollama
* Anthropic
* Azure OpenAI

## Attributs

* id
* tenantId
* name
* type
* description
* baseUrl
* adapter
* enabled
* priority
* createdAt
* updatedAt

## Relations

* possède plusieurs Accounts
* possède plusieurs Models

---

# Provider Account

Représente une connexion à un fournisseur.

## Attributs

* id
* providerId
* tenantId
* name
* encryptedApiKey
* status
* priority
* cooldownUntil
* quotaRemaining
* quotaLimit
* dailyLimit
* requestsCount
* errorCount
* lastError
* lastUsedAt
* createdAt

## Relations

* appartient à un Provider

---

# Model

Représente un modèle IA disponible.

## Attributs

* id
* providerId
* tenantId
* name
* displayName
* version
* family
* contextWindow
* supportsStreaming
* supportsVision
* supportsAudio
* supportsTools
* supportsReasoning
* maxOutputTokens
* enabled
* createdAt

## Relations

* appartient à un Provider
* peut appartenir à plusieurs Model Pools

---

# Model Pool

Un Pool représente une capacité logique utilisée par les agents.

## Exemples

* Chat
* Coding
* Vision
* Fast
* Cheap
* Premium
* Free
* Local

## Attributs

* id
* tenantId
* name
* description
* routingPolicy
* enabled
* createdAt

## Relations

* contient plusieurs Models

---

# Pool Model

Table d'association entre Pool et Model.

## Attributs

* id
* poolId
* modelId
* priority
* weight
* enabled

Cette table permet :

* l'ordre de priorité ;
* le Weighted Round Robin ;
* l'activation individuelle.

---

# Routing Policy

Décrit la stratégie utilisée pour sélectionner un modèle.

## Exemples

* Round Robin
* Priority
* Weighted Round Robin
* Lowest Latency
* Lowest Cost
* Local First

## Attributs

* id
* tenantId
* name
* strategy
* configuration
* enabled

---

# Agent

Représente un agent IA.

## Attributs

* id
* tenantId
* name
* description
* defaultPoolId
* prompt
* enabled
* createdAt

## Relations

* utilise un Model Pool par défaut

Les agents ne référencent jamais directement un Provider ni un Model.

---

# Conversation

Représente une conversation utilisateur.

## Attributs

* id
* tenantId
* agentId
* deviceId
* sessionId
* title
* status
* createdAt
* updatedAt

---

# Message

Représente un message d'une conversation.

## Attributs

* id
* conversationId
* role
* content
* inputTokens
* outputTokens
* modelUsed
* providerUsed
* accountUsed
* latency
* createdAt

Ces informations permettent d'effectuer des analyses et des audits.

---

# Session

Représente une session de communication.

## Attributs

* id
* tenantId
* deviceId
* accessToken
* refreshToken
* expiresAt
* createdAt

---

# Device

Représente un terminal autorisé.

## Attributs

* id
* tenantId
* deviceId
* publicKey
* platform
* appVersion
* status
* activatedAt
* lastSeenAt

Le serveur ne conserve jamais la clé privée.

---

# Activation Token

Token utilisé lors de la première activation d'un appareil.

## Attributs

* id
* tenantId
* token
* expiresAt
* usedAt
* revokedAt
* status
* createdAt

Chaque token ne peut être utilisé qu'une seule fois.

---

# Audit Log

Journal des événements.

## Attributs

* id
* tenantId
* category
* action
* actor
* target
* metadata
* ipAddress
* createdAt

Exemples :

* création d'un Provider ;
* ajout d'une API Key ;
* suppression d'un Pool ;
* activation d'un Device ;
* révocation d'un Token.

---

# Provider Health

Historique de disponibilité des fournisseurs.

## Attributs

* id
* providerId
* accountId
* status
* latency
* checkedAt
* message

Utilisé par le Routing Engine.

---

# Statistics

Agrégation des métriques.

## Attributs

* id
* tenantId
* providerId
* accountId
* modelId
* requests
* successes
* failures
* averageLatency
* totalInputTokens
* totalOutputTokens
* totalCost
* updatedAt

---

# Settings

Configuration globale du tenant.

## Attributs

* id
* tenantId
* category
* key
* value
* updatedAt

Exemples :

* stratégie par défaut ;
* Pool par défaut ;
* quotas ;
* limites de sessions.

---

# Relations principales

```text
Tenant
│
├── Users
├── Providers
│      ├── Accounts
│      └── Models
│
├── Pools
│      └── PoolModels
│             └── Models
│
├── Agents
│      └── DefaultPool
│
├── Devices
│
├── ActivationTokens
│
├── Sessions
│
├── Conversations
│      └── Messages
│
├── AuditLogs
│
├── Statistics
│
└── Settings
```

---

# Principes de conception

Le schéma doit respecter les principes suivants :

* toutes les ressources appartiennent à un **Tenant** ;
* les Agents ne connaissent jamais directement les Providers ni les Models ;
* les Models sont regroupés dans des **Pools** ;
* le Routing Engine sélectionne dynamiquement le meilleur Provider, Account et Model ;
* les API Keys sont toujours chiffrées ;
* les Devices sont identifiés par un **Device ID** et une **clé publique** ;
* toutes les opérations critiques sont journalisées ;
* le modèle est extensible afin d'intégrer de nouveaux fournisseurs, de nouvelles stratégies de routage et de nouveaux types de modèles (texte, image, audio, vidéo) sans modification du schéma conceptuel principal.
