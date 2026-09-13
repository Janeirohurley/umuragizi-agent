# DESIGN.md

# Conception fonctionnelle et technique du système de gestion des modèles IA

## Vision

Le système de gestion des modèles IA constitue une couche centrale de la plateforme. Son objectif est d'abstraire complètement les fournisseurs de modèles (Gemini, Groq, OpenRouter, Ollama, OpenAI, etc.) afin que les agents IA, les workflows et les applications clientes ne dépendent jamais d'un fournisseur particulier.

Le système doit être piloté exclusivement par des données de configuration et non par du code. Toute modification (ajout d'un fournisseur, d'un modèle, d'une clé API ou d'une stratégie de routage) doit être réalisable depuis une interface d'administration.

---

# Objectifs de conception

Le système doit répondre aux objectifs suivants :

* supprimer toute dépendance directe entre les agents et les fournisseurs IA ;
* centraliser la gestion des modèles ;
* permettre une administration complète sans modification du code ;
* supporter plusieurs fournisseurs simultanément ;
* gérer plusieurs comptes par fournisseur ;
* assurer une haute disponibilité grâce au basculement automatique ;
* optimiser l'utilisation des quotas et des ressources ;
* être compatible avec une architecture multi-tenant ;
* pouvoir évoluer sans remettre en cause l'architecture existante.

---

# Principes de conception

## Séparation des responsabilités

Chaque composant possède une responsabilité unique.

Les agents :

* génèrent des requêtes.

Le Model Service :

* reçoit les demandes des agents.

Le Routing Engine :

* choisit le meilleur modèle disponible.

Les Provider Adapters :

* communiquent avec les API externes.

Le Dashboard :

* permet l'administration du système.

Cette séparation facilite la maintenance et les évolutions.

---

## Configuration orientée données

Aucune information ne doit être codée en dur.

Toutes les informations doivent être configurables :

* fournisseurs ;
* modèles ;
* comptes ;
* groupes de modèles ;
* quotas ;
* stratégies ;
* paramètres de routage.

Le comportement du système est donc entièrement piloté par les données stockées dans la base.

---

# Interface d'administration

L'administration constitue le point d'entrée principal du système.

L'administrateur doit pouvoir gérer l'ensemble des ressources sans modifier la configuration du serveur.

Le tableau de bord doit comporter les modules suivants.

---

## Tableau de bord

Vue synthétique :

* nombre de Providers actifs ;
* nombre de modèles disponibles ;
* nombre de comptes configurés ;
* nombre de requêtes traitées ;
* taux de réussite ;
* temps moyen de réponse ;
* fournisseurs indisponibles ;
* alertes.

---

## Gestion des Providers

Fonctionnalités :

* ajouter un Provider ;
* modifier sa configuration ;
* activer ou désactiver le Provider ;
* tester la connexion ;
* consulter son état ;
* consulter ses statistiques.

Chaque Provider doit être représenté comme un module indépendant.

---

## Gestion des comptes

Chaque Provider peut posséder plusieurs comptes.

Pour chaque compte :

* nom ;
* description ;
* clé API (chiffrée) ;
* statut ;
* quota ;
* date d'expiration ;
* cooldown ;
* nombre de requêtes ;
* dernière utilisation ;
* dernière erreur.

Le système doit permettre d'activer ou de désactiver un compte individuellement.

---

## Catalogue des modèles

Le catalogue représente l'ensemble des modèles disponibles.

Pour chaque modèle :

* nom technique ;
* nom d'affichage ;
* fournisseur ;
* version ;
* capacités (chat, vision, audio, outils, raisonnement) ;
* taille maximale du contexte ;
* coût estimé ;
* latence moyenne ;
* disponibilité.

Le catalogue doit pouvoir être synchronisé automatiquement lorsque le fournisseur expose une API de découverte.

---

## Pools de modèles

Les Pools constituent l'interface utilisée par les agents.

Exemples :

* Chat
* Coding
* Vision
* Reasoning
* Fast
* Cheap
* Free
* Local
* Premium

Chaque Pool contient plusieurs modèles classés selon une priorité configurable.

L'administrateur peut modifier l'ordre sans redémarrer le serveur.

---

# Cycle d'une requête

Lorsqu'un agent souhaite générer une réponse :

1. l'agent appelle le Model Service ;
2. le Model Service demande un Pool ;
3. le Routing Engine recherche les modèles disponibles ;
4. les comptes sont filtrés selon leur état ;
5. une stratégie de sélection est appliquée ;
6. la requête est envoyée ;
7. la réponse est normalisée ;
8. les statistiques sont mises à jour ;
9. la réponse est renvoyée à l'agent.

Les agents ne savent jamais quel fournisseur a effectivement été utilisé.

---

# Gestion des erreurs

Les erreurs doivent être classées afin d'adapter automatiquement le comportement du système.

## Erreurs temporaires

Exemples :

* HTTP 429 ;
* timeout ;
* erreur réseau ;
* surcharge du fournisseur.

Le compte est placé en cooldown puis retiré temporairement de la rotation.

---

## Erreurs permanentes

Exemples :

* clé API invalide ;
* compte supprimé ;
* authentification refusée.

Le compte est automatiquement désactivé jusqu'à intervention d'un administrateur.

---

## Erreurs du fournisseur

Exemples :

* service indisponible ;
* maintenance.

Le Routing Engine tente automatiquement un autre fournisseur.

---

# Stratégies de routage

L'architecture doit permettre plusieurs stratégies interchangeables.

## Round Robin

Les comptes sont utilisés successivement.

Objectif :

répartir équitablement les requêtes.

---

## Priority

Les modèles sont utilisés selon une priorité définie.

Le système n'utilise le suivant qu'en cas d'échec.

---

## Weighted Round Robin

Les modèles reçoivent un poids.

Exemple :

Gemini Flash

70 %

Groq

20 %

Ollama

10 %

Le système répartit automatiquement les requêtes selon ces proportions.

---

## Lowest Latency

Le moteur privilégie le modèle présentant la plus faible latence observée.

---

## Lowest Cost

Le moteur privilégie les modèles les moins coûteux.

---

## Local First

Le moteur privilégie toujours les modèles locaux (Ollama, vLLM, LM Studio).

Les fournisseurs cloud ne sont utilisés qu'en secours.

---

# Surveillance

Le système doit surveiller en permanence :

* disponibilité des fournisseurs ;
* quotas ;
* erreurs ;
* temps de réponse ;
* consommation des tokens ;
* consommation par tenant.

Ces informations alimentent le tableau de bord.

---

# Journalisation

Chaque requête doit être enregistrée.

Informations minimales :

* identifiant du tenant ;
* identifiant du Pool ;
* modèle sélectionné ;
* fournisseur utilisé ;
* compte utilisé ;
* temps de réponse ;
* nombre de tokens ;
* résultat ;
* erreur éventuelle.

Les journaux doivent être consultables depuis le Dashboard.

---

# Sécurité

Les clés API sont des informations sensibles.

Le système doit :

* chiffrer les clés au repos ;
* masquer les clés dans l'interface ;
* empêcher leur affichage complet ;
* limiter les droits d'accès ;
* enregistrer toutes les modifications.

---

# Multi-tenant

Chaque tenant possède une configuration indépendante.

Il peut disposer :

* de ses propres fournisseurs ;
* de ses propres comptes ;
* de ses propres Pools ;
* de ses propres règles ;
* de ses propres statistiques.

Le Routing Engine doit toujours exécuter les requêtes dans le contexte du tenant courant.

Aucune ressource ne doit être partagée involontairement entre plusieurs tenants.

---

# Extensibilité

L'architecture doit être conçue pour permettre l'ajout futur :

* de nouveaux fournisseurs ;
* de nouveaux modèles ;
* de nouvelles stratégies de routage ;
* de nouveaux types de capacités (vision, audio, vidéo, agents spécialisés) ;
* de nouvelles interfaces d'administration.

Ces évolutions ne doivent nécessiter aucune modification des agents existants.

---

# Expérience administrateur

L'administration doit être orientée simplicité opérationnelle.

L'administrateur ne manipule jamais de fichiers de configuration.

Toutes les opérations sont réalisées depuis une interface graphique :

* ajouter un fournisseur ;
* enregistrer une clé API ;
* tester la connexion ;
* découvrir les modèles disponibles ;
* créer des Pools ;
* définir les priorités ;
* consulter les statistiques ;
* analyser les erreurs ;
* désactiver ou réactiver un compte.

Le système doit être capable de fonctionner de manière autonome une fois configuré. L'objectif est que les agents continuent à fonctionner malgré les changements de fournisseurs, les dépassements de quotas ou les indisponibilités temporaires, sans intervention manuelle et sans modification du code métier.
