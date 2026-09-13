# PRD.md

# Product Requirements Document

## Projet

**AI Model Management Platform (AMMP)**

---

# 1. Contexte

La plateforme est une infrastructure de gestion centralisée des modèles d'intelligence artificielle destinée à alimenter les agents IA de l'application.

Aujourd'hui, de nombreuses applications sont fortement couplées à un fournisseur précis (OpenAI, Gemini, Groq, Anthropic, OpenRouter, etc.). Cette dépendance entraîne plusieurs problèmes :

* dépassement des quotas ;
* indisponibilité d'un fournisseur ;
* changement fréquent des modèles ;
* difficultés de maintenance ;
* impossibilité de basculer rapidement vers un autre fournisseur.

L'objectif du projet est de créer une couche d'abstraction complète entre les agents IA et les fournisseurs de modèles.

Les agents ne doivent jamais connaître le fournisseur réellement utilisé.

---

# 2. Vision Produit

Construire une plateforme capable de gérer dynamiquement plusieurs fournisseurs IA, plusieurs comptes, plusieurs modèles et plusieurs stratégies de routage à partir d'un tableau de bord d'administration.

La plateforme doit être :

* indépendante des fournisseurs ;
* entièrement configurable ;
* extensible ;
* multi-tenant ;
* hautement disponible ;
* orientée production.

---

# 3. Objectifs

Les objectifs principaux sont :

* supprimer toute dépendance directe aux fournisseurs IA ;
* garantir la disponibilité des modèles ;
* répartir intelligemment les requêtes ;
* exploiter plusieurs comptes simultanément ;
* gérer automatiquement les quotas ;
* permettre une administration sans modification du code ;
* centraliser les statistiques ;
* préparer une architecture évolutive.

---

# 4. Hors périmètre

Le système ne doit pas :

* gérer l'authentification des utilisateurs finaux ;
* remplacer les agents IA ;
* remplacer Mastra ;
* entraîner des modèles ;
* fournir une interface de chat utilisateur.

Son rôle est exclusivement la gestion des modèles IA.

---

# 5. Utilisateurs

## Administrateur

Responsable de :

* configurer les fournisseurs ;
* enregistrer les comptes ;
* gérer les modèles ;
* créer les Pools ;
* consulter les statistiques ;
* résoudre les incidents.

---

## Développeur

Utilise uniquement les capacités offertes par la plateforme.

Il ne configure jamais directement les fournisseurs.

---

## Agent IA

L'agent n'interagit qu'avec le **Model Service**.

Il ignore complètement :

* les fournisseurs ;
* les clés API ;
* les quotas ;
* les règles de routage.

---

# 6. Architecture fonctionnelle

```text
Agent IA
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

Cette architecture garantit une indépendance complète entre les agents et les fournisseurs.

---

# 7. Modules fonctionnels

## Dashboard

Fonction :

administrer entièrement la plateforme.

Le Dashboard doit permettre :

* gestion des Providers ;
* gestion des comptes ;
* gestion des modèles ;
* gestion des Pools ;
* gestion des stratégies ;
* visualisation des statistiques ;
* consultation des journaux.

---

## Provider Manager

Responsable de :

* enregistrer les fournisseurs ;
* charger les adaptateurs ;
* maintenir leur état.

---

## Account Manager

Responsable de :

* enregistrer les API Keys ;
* suivre les quotas ;
* suivre les erreurs ;
* gérer les cooldowns.

---

## Model Catalog

Responsable de :

* enregistrer les modèles ;
* synchroniser les modèles disponibles ;
* stocker leurs caractéristiques.

---

## Pool Manager

Responsable de :

* créer des groupes logiques de modèles ;
* définir les priorités ;
* organiser les modèles selon leur usage.

---

## Routing Engine

Responsable de :

* choisir un modèle ;
* choisir un compte ;
* appliquer la stratégie de routage ;
* gérer le failover ;
* enregistrer les statistiques.

---

## Statistics Service

Responsable de :

* mesurer les performances ;
* calculer les temps moyens ;
* suivre les quotas ;
* produire les tableaux de bord.

---

# 8. Fonctionnalités principales

## Gestion des fournisseurs

L'administrateur peut :

* ajouter un Provider ;
* modifier un Provider ;
* désactiver un Provider ;
* supprimer un Provider.

---

## Gestion des comptes

Chaque Provider peut posséder plusieurs comptes.

Chaque compte doit pouvoir être :

* testé ;
* activé ;
* désactivé ;
* supprimé.

Les clés API doivent être chiffrées.

---

## Gestion des modèles

Le système doit permettre :

* l'ajout manuel ;
* la découverte automatique lorsque le fournisseur le permet ;
* la mise à jour des caractéristiques.

---

## Gestion des Pools

Les agents utilisent uniquement les Pools.

Exemple :

* Chat
* Coding
* Vision
* Fast
* Cheap
* Free
* Local
* Premium

Chaque Pool contient une liste ordonnée de modèles.

---

## Routage

Le système doit prendre en charge plusieurs stratégies :

* Priority ;
* Round Robin ;
* Weighted Round Robin ;
* Lowest Latency ;
* Lowest Cost ;
* Local First.

Le choix de la stratégie est configurable.

---

## Failover

Si une requête échoue :

* un autre compte est tenté ;
* puis un autre modèle ;
* puis un autre Provider.

L'utilisateur final ne doit pas percevoir cette transition.

---

## Gestion des quotas

Le système doit détecter automatiquement :

* les quotas dépassés ;
* les limites journalières ;
* les crédits insuffisants.

Les comptes concernés sont temporairement retirés de la rotation.

---

## Surveillance

Le système surveille :

* disponibilité ;
* latence ;
* quotas ;
* erreurs ;
* consommation.

---

## Journalisation

Toutes les opérations sont enregistrées.

Exemples :

* création d'un Provider ;
* ajout d'une API Key ;
* changement de Pool ;
* requête exécutée ;
* erreur détectée ;
* failover.

---

# 9. Exigences non fonctionnelles

Le système doit être :

* modulaire ;
* extensible ;
* hautement disponible ;
* sécurisé ;
* testable ;
* observable ;
* documenté.

---

# 10. Sécurité

Les exigences minimales sont :

* chiffrement des clés API ;
* journalisation des modifications ;
* contrôle des accès administrateurs ;
* protection contre les fuites de secrets ;
* communications chiffrées (HTTPS/TLS).

---

# 11. Multi-tenant

Chaque tenant possède :

* ses propres Providers ;
* ses propres comptes ;
* ses propres modèles ;
* ses propres Pools ;
* ses propres statistiques ;
* ses propres règles de routage.

Les données doivent être totalement isolées entre les tenants.

---

# 12. Critères d'acceptation

Le produit sera considéré conforme lorsque les scénarios suivants fonctionneront :

### Gestion des Providers

* Ajouter un nouveau fournisseur sans modifier le code.
* Désactiver un fournisseur sans interrompre les agents.

### Gestion des comptes

* Ajouter plusieurs comptes pour un même fournisseur.
* Répartir les requêtes entre ces comptes.

### Routage

* Sélectionner automatiquement un modèle appartenant au Pool demandé.
* Appliquer la stratégie configurée.

### Failover

* Basculer automatiquement vers un autre compte en cas de quota dépassé.
* Basculer vers un autre fournisseur si nécessaire.
* Retourner une erreur uniquement lorsqu'aucune ressource n'est disponible.

### Administration

* Toutes les opérations sont réalisables depuis le Dashboard.
* Aucun redémarrage du serveur n'est nécessaire après une modification de configuration.

### Multi-tenant

* Chaque tenant dispose d'une configuration indépendante.
* Aucune fuite de données ou de configuration entre tenants n'est possible.

---

# 13. Évolutions prévues

L'architecture doit permettre d'ajouter ultérieurement :

* de nouveaux fournisseurs IA ;
* de nouveaux types de modèles (texte, image, audio, vidéo) ;
* des modèles locaux (Ollama, vLLM, LM Studio) ;
* des règles de routage basées sur le coût, la latence ou la qualité ;
* des quotas par tenant ;
* des politiques de gouvernance ;
* des tableaux de bord analytiques avancés ;
* des mécanismes de cache et de préchauffage des modèles.

L'objectif final est de faire de cette plateforme une couche centrale de gestion des modèles IA, entièrement indépendante des fournisseurs, capable d'alimenter tous les agents et services de l'écosystème avec une administration unifiée, un routage intelligent et une haute disponibilité.
