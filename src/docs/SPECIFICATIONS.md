# Spécifications détaillées — AlignerTracker

## 1. Vue d'ensemble

**AlignerTracker** est une application web de suivi de traitement orthodontique par aligneurs dentaires (gouttières). Elle connecte trois types d'utilisateurs : **patients**, **praticiens** (orthodontistes) et **administrateurs**.

### Objectifs principaux
- Permettre aux patients de suivre leur progression de traitement
- Capturer et analyser des photos via IA pour détecter les problèmes
- Alerter les praticiens en cas d'anomalie détectée
- Centraliser la gestion des utilisateurs et traitements

---

## 2. Rôles utilisateurs

### 2.1 Patient
- Consulter son tableau de bord de traitement (gouttière actuelle, progression, prochaine date de changement)
- Prendre des photos multi-angles de ses aligneurs (front, gauche, droite, occlusale)
- Recevoir un contrôle qualité automatique des photos (luminosité, netteté, cadrage)
- Visualiser les résultats d'analyse IA (taquets, insertion, santé gingivale, score global)
- Consulter l'historique des analyses et la progression dans le temps
- Confirmer le changement de gouttière
- Consulter les alertes générées par le praticien
- Accéder aux vidéos tutoriels

### 2.2 Praticien
- Voir la liste de ses patients assignés avec leur état de traitement
- Recevoir et gérer les alertes automatiques (taquets perdus, mauvaise insertion, problèmes gingivaux)
- Consulter les photos et analyses de chaque patient
- Résoudre les alertes avec des notes de résolution
- Visualiser les statistiques globales (nombre de patients, alertes actives, etc.)
- Accéder aux informations de traitement détaillées par patient

### 2.3 Administrateur
- Créer/modifier/supprimer des comptes utilisateurs (patients et praticiens)
- Assigner des patients à des praticiens
- Configurer les paramètres de traitement (nombre de gouttières, dents avec taquets)
- Gérer les vidéos tutoriels
- Accès complet à toutes les données

---

## 3. Fonctionnalités détaillées

### 3.1 Capture de photos multi-angles
- **4 angles** : frontale (obligatoire), côté droit (obligatoire), côté gauche (obligatoire), occlusale (optionnelle)
- **Contrôle qualité automatique** avant envoi :
  - Luminosité (0-100)
  - Netteté (0-100)
  - Cadrage (0-100)
  - Score global (0-100)
  - Détection d'issues : trop sombre, trop clair, flou, mauvais cadrage, trop proche, trop loin
- **Guide visuel overlay** pour aider le patient à cadrer correctement
- **Guidance vocale** optionnelle via Web Speech API
- **Tutoriel photo** intégré

### 3.2 Analyse IA des photos
- **Modèle** : Google Gemini (API directe)
- **Critères analysés** :
  - **État des taquets** : ok / partial / missing — vérifie chaque dent spécifiée dans le plan de traitement
  - **Qualité d'insertion** : good / acceptable / poor — détecte les espaces entre gouttière et dents
  - **Santé gingivale** : healthy / mild_inflammation / inflammation
  - **Score global** : 0-100 (conservateur, pénalise fortement les problèmes)
  - **Recommandations** : liste de conseils personnalisés
  - **Détails des taquets** : description par dent analysée
- **Prompt système strict** : privilégie les faux positifs aux faux négatifs (sécurité patient)

### 3.3 Système d'alertes automatisé
- **Déclenchement** : Edge Function `create-analysis-alerts` appelée après chaque analyse
- **Types d'alertes** :
  - `attachment_lost` : taquet manquant ou partiellement décollé
  - `poor_insertion` : mauvaise insertion de la gouttière
  - `gingival_issue` : problème gingival détecté
  - `missed_change` : changement de gouttière manqué
  - `photo_needed` : photo nécessaire
- **Niveaux de sévérité** : low, medium, high
- **Gestion** : résolution par le praticien avec notes, archivage avec horodatage
- **Badges visuels** : Rouge (Urgent/high), Jaune (Alerte/medium)
- **Compteurs temps réel** : synchronisés entre vue patient et praticien

### 3.4 Suivi de traitement
- Numéro de gouttière actuelle / total
- Date de début de traitement
- Date du prochain changement
- Historique des changements de gouttières (table `aligner_changes`)
- Calendrier de traitement avec statuts : completed, current, upcoming
- Graphique de progression des analyses

### 3.5 Vidéos tutoriels
- Catégories : insertion, retrait, nettoyage, port quotidien, alimentation, douleur
- Gestion par l'administrateur (CRUD)
- Stockage dans le bucket public `tutorial-videos`
- Activation/désactivation et ordre de tri

---

## 4. Routes de l'application

| Route | Rôle requis | Description |
|---|---|---|
| `/` | Public | Page d'accueil / landing |
| `/auth` | Public | Connexion / Inscription |
| `/patient` | patient, admin | Tableau de bord patient |
| `/practitioner` | practitioner, admin | Tableau de bord praticien (legacy) |
| `/practitioner-new` | practitioner, admin | Nouveau tableau de bord praticien |
| `/admin` | admin | Tableau de bord administrateur |

---

## 5. Modèle de données

### Tables principales

#### `profiles`
| Colonne | Type | Description |
|---|---|---|
| id | uuid (PK) | Identifiant profil |
| user_id | uuid | Référence auth.users |
| email | text | Email |
| full_name | text | Nom complet |
| phone | text? | Téléphone |

#### `user_roles`
| Colonne | Type | Description |
|---|---|---|
| id | uuid (PK) | — |
| user_id | uuid | Référence auth.users |
| role | app_role | admin / practitioner / patient |

#### `patients`
| Colonne | Type | Description |
|---|---|---|
| id | uuid (PK) | — |
| profile_id | uuid (FK → profiles) | — |
| treatment_start | date? | Début du traitement |
| total_aligners | int | Nombre total de gouttières |
| current_aligner | int | Gouttière actuelle |
| next_change_date | date? | Prochain changement |
| attachment_teeth | int[] | Dents portant des taquets (notation FDI) |
| notes | text? | Notes libres |

#### `practitioners`
| Colonne | Type | Description |
|---|---|---|
| id | uuid (PK) | — |
| profile_id | uuid (FK → profiles) | — |
| license_number | text? | Numéro RPPS |
| specialty | text? | Spécialité |

#### `practitioner_patients`
| Colonne | Type | Description |
|---|---|---|
| id | uuid (PK) | — |
| practitioner_id | uuid (FK → practitioners) | — |
| patient_id | uuid (FK → patients) | — |
| assigned_at | timestamptz | Date d'assignation |

#### `patient_photos`
| Colonne | Type | Description |
|---|---|---|
| id | uuid (PK) | — |
| patient_id | uuid (FK → patients) | — |
| photo_url | text | Chemin dans le bucket storage |
| aligner_number | int | Numéro de gouttière |
| angle | text | front / left / right / occlusal |
| analysis_status | text | pending / analyzed / error |
| attachment_status | text? | ok / partial / missing |
| insertion_quality | text? | good / acceptable / poor |
| gingival_health | text? | healthy / mild_inflammation / inflammation |
| overall_score | int? | Score global IA (0-100) |
| recommendations | text[]? | Recommandations IA |
| quality_overall | int? | Score qualité photo |
| brightness_score | int? | Score luminosité |
| sharpness_score | int? | Score netteté |
| framing_score | int? | Score cadrage |

#### `practitioner_alerts`
| Colonne | Type | Description |
|---|---|---|
| id | uuid (PK) | — |
| patient_id | uuid (FK → patients) | — |
| practitioner_id | uuid (FK → practitioners) | — |
| photo_id | uuid? (FK → patient_photos) | — |
| type | text | Type d'alerte |
| severity | text | low / medium / high |
| message | text | Description de l'alerte |
| resolved | boolean | Résolue ou non |
| resolved_at | timestamptz? | Date de résolution |
| resolved_by | uuid? (FK → profiles) | Qui a résolu |
| resolution_notes | text? | Notes de résolution |

#### `aligner_changes`
| Colonne | Type | Description |
|---|---|---|
| id | uuid (PK) | — |
| patient_id | uuid (FK → patients) | — |
| from_aligner | int | Ancien numéro |
| to_aligner | int | Nouveau numéro |
| confirmed_at | timestamptz | Date de confirmation |

#### `tutorial_videos`
| Colonne | Type | Description |
|---|---|---|
| id | uuid (PK) | — |
| title | text | Titre |
| description | text? | Description |
| video_url | text | URL de la vidéo |
| thumbnail_url | text? | Miniature |
| category | text | Catégorie |
| duration | text? | Durée |
| is_active | boolean | Actif/inactif |
| sort_order | int | Ordre d'affichage |

---

## 6. Sécurité (RLS)

Toutes les tables ont **Row Level Security activé** avec les principes :
- **Patients** : accès uniquement à leurs propres données
- **Praticiens** : accès uniquement aux données de leurs patients assignés
- **Administrateurs** : accès complet (ALL)
- **Anonymes** : accès bloqué sur toutes les tables sensibles
- Les fonctions `has_role()` et `get_profile_id()` centralisent la logique d'autorisation

---

## 7. Stockage fichiers

| Bucket | Visibilité | Usage |
|---|---|---|
| `aligner-photos` | Privé | Photos cliniques des patients |
| `tutorial-videos` | Public | Vidéos tutoriels |

- Les photos cliniques utilisent des **URLs signées** (durée 2h) pour l'affichage
- Le chemin de stockage suit le format : `{patient_id}/{filename}`
