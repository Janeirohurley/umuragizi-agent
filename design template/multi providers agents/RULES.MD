# RULES.md

# Règles de développement du projet

## Objectif

Ce document définit les règles que tous les agents IA, développeurs et contributeurs doivent respecter pendant le développement de la plateforme.

L'objectif est de garantir une architecture cohérente, évolutive et maintenable tout au long du projet.

---

# 1. Philosophie générale

Le projet est une application réelle en cours de développement.

Il ne s'agit ni d'un tutoriel, ni d'un prototype, ni d'un exercice d'apprentissage.

Toutes les décisions techniques doivent être prises comme si le système était destiné à fonctionner en production.

L'objectif n'est pas d'écrire le moins de code possible, mais de construire une architecture robuste, modulaire et évolutive.

---

# 2. Le projet n'est jamais considéré comme "simple"

L'agent ne doit jamais supposer que :

* le projet est petit ;
* une fonctionnalité est triviale ;
* une solution temporaire est suffisante ;
* une simplification est acceptable sans justification.

Chaque fonctionnalité doit être pensée dans le contexte global de l'architecture.

---

# 3. Priorité à l'architecture

Avant toute implémentation, il faut toujours comprendre :

* l'objectif fonctionnel ;
* les impacts sur les autres modules ;
* les dépendances ;
* les contraintes de sécurité ;
* les contraintes de performance ;
* les besoins futurs.

Une implémentation ne doit jamais compromettre l'architecture globale.

---

# 4. Aucune logique métier dupliquée

Chaque responsabilité doit exister à un seul endroit.

Une règle métier ne doit jamais être copiée dans plusieurs services.

Toute logique commune doit être extraite dans un composant partagé.

---

# 5. Séparation stricte des responsabilités

Chaque module possède une responsabilité unique.

Exemple :

* Authentication Service
* Tenant Service
* Device Service
* Model Service
* Routing Engine
* Provider Adapter
* Conversation Service
* Audit Service

Un module ne doit jamais effectuer le travail d'un autre.

---

# 6. Les agents IA restent indépendants

Les agents IA ne doivent jamais :

* connaître un fournisseur IA ;
* connaître une clé API ;
* choisir un modèle précis ;
* implémenter du routage ;
* gérer les quotas.

Ils communiquent uniquement avec les services internes.

---

# 7. Aucune valeur codée en dur

Sont interdits dans le code :

* modèles IA codés en dur ;
* fournisseurs codés en dur ;
* clés API ;
* identifiants techniques ;
* URLs spécifiques ;
* stratégies de routage.

Toutes ces informations doivent provenir de la configuration ou de la base de données.

---

# 8. Toute configuration est dynamique

L'ajout de :

* Providers ;
* modèles ;
* comptes ;
* Pools ;
* stratégies ;

ne doit nécessiter aucune modification du code métier.

---

# 9. Les Providers sont remplaçables

Le système doit permettre de remplacer complètement un fournisseur sans modifier :

* les agents ;
* les workflows ;
* les applications clientes.

Le changement de fournisseur ne doit avoir aucun impact sur le reste du système.

---

# 10. Multi-tenant obligatoire

Chaque fonctionnalité doit être conçue pour fonctionner dans un contexte multi-tenant.

Aucune donnée ne doit être partagée involontairement entre deux tenants.

Toutes les requêtes doivent toujours être exécutées dans le contexte du tenant courant.

---

# 11. Sécurité par défaut

Toute nouvelle fonctionnalité doit être pensée selon le principe du "Secure by Design".

Les clés API doivent être :

* chiffrées ;
* masquées ;
* jamais journalisées.

Les communications doivent être sécurisées.

Les accès administratifs doivent être contrôlés.

---

# 12. Documentation obligatoire

Toute nouvelle fonctionnalité importante doit être accompagnée de :

* documentation ;
* description de son objectif ;
* description de son fonctionnement ;
* description de ses dépendances.

Le code ne remplace pas la documentation.

---

# 13. Pas de dette technique volontaire

Les solutions suivantes sont interdites sauf justification explicite :

* TODO permanents ;
* hacks temporaires ;
* duplication de code ;
* contournements rapides ;
* dépendances inutiles.

Chaque décision doit être pérenne.

---

# 14. Les erreurs sont des événements normaux

Le système ne doit jamais supposer qu'un fournisseur est toujours disponible.

Chaque composant doit être capable de gérer :

* erreurs réseau ;
* dépassement de quotas ;
* indisponibilité ;
* timeout ;
* panne d'un service.

Le système doit toujours tenter une stratégie de récupération.

---

# 15. Observabilité obligatoire

Chaque opération importante doit être observable.

Le système doit produire :

* logs ;
* métriques ;
* traces ;
* statistiques.

Les erreurs doivent être exploitables sans reproduire le problème.

---

# 16. Tests avant optimisation

Les fonctionnalités doivent d'abord être correctes.

L'optimisation ne doit intervenir qu'après validation du comportement.

Éviter les optimisations prématurées qui compliquent inutilement le code.

---

# 17. Évolutivité

Chaque composant doit être conçu pour accepter :

* de nouveaux fournisseurs ;
* de nouveaux modèles ;
* de nouvelles stratégies ;
* de nouveaux tenants ;
* de nouveaux services.

L'architecture doit permettre ces évolutions sans refonte majeure.

---

# 18. Cohérence avant rapidité

Une implémentation cohérente est toujours préférable à une implémentation rapide.

Lorsqu'un choix doit être fait entre :

* rapidité de développement ;
* qualité de l'architecture ;

la qualité de l'architecture est prioritaire.

---

# 19. Décisions explicites

L'agent ne doit jamais faire d'hypothèses silencieuses.

Si une information est manquante :

* il doit expliquer ses hypothèses ;
* proposer plusieurs options lorsque cela est pertinent ;
* demander une clarification si la décision a un impact architectural.

---

# 20. Communication de l'agent IA

L'agent doit répondre comme un ingénieur logiciel participant au développement du projet.

Il ne doit pas :

* transformer chaque réponse en tutoriel ;
* simplifier artificiellement un problème complexe ;
* ignorer les contraintes existantes ;
* proposer des exemples irréalistes.

Ses réponses doivent être adaptées à un projet réel.

---

# 21. Qualité du code

Tout code produit doit être :

* lisible ;
* modulaire ;
* documenté ;
* fortement typé lorsque le langage le permet ;
* facilement testable ;
* conforme aux conventions du projet.

---

# 22. Principe fondamental

Avant chaque proposition ou implémentation, l'agent doit se poser les questions suivantes :

1. Cette solution respecte-t-elle l'architecture globale ?
2. Est-elle compatible avec le multi-tenant ?
3. Évite-t-elle les dépendances inutiles ?
4. Peut-elle évoluer sans être réécrite ?
5. Est-elle suffisamment sécurisée ?
6. La responsabilité est-elle au bon endroit ?
7. Les futurs développeurs pourront-ils la comprendre et la maintenir ?

Si la réponse à l'une de ces questions est négative, la solution doit être revue avant toute implémentation.

---

# Règle d'or

> **Le projet est une plateforme logicielle professionnelle en évolution continue. Chaque décision doit privilégier la modularité, la maintenabilité, la sécurité et l'évolutivité. Une solution simple est bienvenue lorsqu'elle répond correctement au problème, mais la simplicité ne doit jamais être obtenue en réduisant les exigences fonctionnelles ou architecturales du projet.**
