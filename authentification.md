# Prompt de conception – Système d'authentification sans inscription, multi-tenant et sécurisé par cryptographie

## Objectif

Concevoir et implémenter un système d'authentification moderne pour un agent IA ne nécessitant **aucune inscription** et **aucune donnée personnelle**. Le système doit être entièrement basé sur des jetons d'activation (tokens), un identifiant de terminal et une authentification cryptographique.

Le serveur ne doit jamais connaître le nom, l'adresse e-mail ou le numéro de téléphone de l'utilisateur. Son identité est représentée uniquement par un identifiant technique associé à un appareil.

Le système doit être conçu selon une architecture **multi-tenant**, où chaque client possède son propre espace de données complètement isolé.

---

# Architecture générale

Le système est composé de quatre éléments :

* Serveur principal
* Interface d'administration
* Application mobile
* Agent IA

L'application mobile communique uniquement avec le serveur.

Le serveur valide les appareils puis autorise les communications avec l'agent IA.

Toutes les données sont stockées dans le tenant auquel appartient l'appareil.

---

# Aucun système d'inscription

Le système ne doit jamais demander :

* nom
* prénom
* email
* mot de passe
* numéro de téléphone

L'utilisateur ne possède aucun compte.

Son identité est uniquement :

* Tenant ID
* Device ID
* Clé publique

---

# Création d'un token d'activation

L'administrateur possède une interface sécurisée.

Depuis cette interface il peut :

* créer un tenant
* créer plusieurs tokens
* révoquer un token
* supprimer un appareil
* transférer un appareil
* consulter les appareils actifs

Un token est une clé d'activation unique.

Exemple :

```
tk_8YxA7LmF2hQ91R...
```

Le token est associé à un tenant mais n'est pas encore lié à un appareil.

Etat possible :

* Non utilisé
* Utilisé
* Révoqué
* Expiré

Un token ne peut être utilisé qu'une seule fois.

---

# Première connexion de l'application

Lors du premier lancement :

L'utilisateur ouvre :

```
Paramètres

Token

[ Se connecter ]
```

Il colle le token reçu.

L'application envoie :

```
POST /activate
```

avec

```
token
```

Le serveur vérifie :

* le token existe
* il n'est pas expiré
* il n'est pas révoqué
* il n'a jamais été utilisé

Si tout est valide, le processus d'activation démarre.

---

# Génération d'une identité cryptographique

Le serveur ne doit jamais générer la clé privée.

La clé privée doit toujours être créée localement sur le téléphone.

Le téléphone génère :

```
Private Key
```

et

```
Public Key
```

La clé privée est stockée dans :

Android Keystore

ou

iOS Keychain

Elle ne peut jamais être exportée.

L'application envoie uniquement :

```
Public Key
```

au serveur.

---

# Création du Device ID

Le serveur génère ensuite :

```
Device_ID
```

sous forme d'UUID.

Exemple :

```
dev_f83bc98e...

```

Ce Device ID devient l'identité officielle du terminal.

Le serveur associe :

```
Tenant

↓

Device_ID

↓

Public Key

↓

Token utilisé
```

Le token passe automatiquement à l'état :

```
Utilisé
```

et ne pourra plus être réutilisé.

---

# Création automatique du Tenant

Lorsqu'un nouveau client utilise le système pour la première fois, le serveur doit créer automatiquement un tenant unique.

Chaque tenant possède :

* Tenant_ID
* nom technique
* configuration
* paramètres
* clés
* quotas
* journaux
* base de données logique

Toutes les données de ce client devront être stockées exclusivement dans ce tenant.

Aucune donnée ne doit être partagée entre deux tenants.

---

# Initialisation automatique

Après la création du tenant, le serveur initialise automatiquement toutes les ressources nécessaires.

Exemple :

Création des collections ou tables :

```
devices

agents

sessions

messages

knowledge

documents

embeddings

history

audit_logs

api_keys

settings

permissions
```

Toutes ces données appartiennent uniquement au tenant.

---

# Authentification des requêtes

Après l'activation, chaque requête envoyée par l'application doit contenir :

```
Access Token

Device ID

Timestamp

Nonce

Signature
```

La signature est générée avec :

```
Private Key
```

Le serveur vérifie la signature avec :

```
Public Key
```

Si la signature est invalide :

La requête est rejetée.

---

# Protection contre le rejeu (Replay Attack)

Chaque requête doit contenir :

* timestamp
* nonce aléatoire

Le serveur conserve temporairement les nonces déjà utilisés.

Si un nonce est réutilisé :

```
Requête rejetée
```

---

# Rotation des Access Tokens

Le token d'activation ne sert qu'une seule fois.

Ensuite le serveur délivre :

Access Token

et

Refresh Token

L'application renouvelle automatiquement son Access Token.

Le token initial n'est plus jamais utilisé.

---

# Communication avec l'agent IA

Toutes les communications passent par le serveur.

Le serveur identifie :

```
Tenant

↓

Device_ID

↓

Public Key

↓

Session
```

Puis transmet la requête à l'agent IA.

L'agent IA ne connaît jamais :

* le token
* l'utilisateur
* le téléphone

Il reçoit uniquement :

```
Tenant_ID

Session_ID

Conversation_ID
```

---

# Changement de téléphone

Si un nouvel appareil tente d'utiliser un ancien token :

Le serveur refuse immédiatement.

Si l'utilisateur souhaite migrer son accès :

Le nouvel appareil génère une nouvelle paire de clés.

L'administrateur valide le transfert.

Le serveur :

* remplace la clé publique
* remplace le Device ID
* désactive l'ancien appareil
* conserve tout l'historique

L'ancien appareil ne peut plus communiquer.

---

# Gestion des appareils

Chaque tenant peut posséder plusieurs appareils.

Chaque appareil possède :

* Device ID
* Public Key
* Date d'activation
* Dernière activité
* Version de l'application
* État (Actif, Suspendu, Révoqué)

Chaque appareil est administrable individuellement.

---

# Journalisation

Toutes les opérations doivent être enregistrées.

Activation

Connexion

Renouvellement

Révocation

Erreur

Migration

Suppression

Les journaux sont propres à chaque tenant.

---

# Sécurité

Le système doit respecter les principes suivants :

* aucune donnée personnelle
* aucune authentification par mot de passe
* aucune clé privée sur le serveur
* chiffrement TLS obligatoire
* stockage sécurisé des clés
* signatures numériques obligatoires
* isolation complète des tenants
* tokens à usage unique
* protection contre les attaques par rejeu
* rotation automatique des jetons d'accès
* révocation immédiate des appareils compromis

---

# Objectif final

Le résultat attendu est une plateforme SaaS multi-tenant où :

* chaque client dispose automatiquement de son propre tenant isolé ;
* chaque appareil possède une identité cryptographique unique ;
* chaque requête est authentifiée par une signature numérique ;
* les données sont strictement séparées entre les tenants ;
* aucun compte utilisateur n'est nécessaire ;
* aucune information personnelle n'est stockée ;
* l'administration des appareils se fait uniquement via des tokens d'activation, des Device ID et des clés publiques.

L'implémentation doit être modulaire, extensible, documentée et prête à évoluer vers une architecture distribuée (microservices) sans remettre en cause le modèle de sécurité ni le cloisonnement des tenants.
