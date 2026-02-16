# Architecture technique — AlignerTracker

## 1. Stack technologique

| Couche | Technologie |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite |
| **UI** | Tailwind CSS + shadcn/ui + Radix UI |
| **State / Data** | TanStack React Query |
| **Routing** | React Router v6 |
| **3D** | Three.js + React Three Fiber + Drei |
| **Charts** | Recharts |
| **Backend** | Lovable Cloud (Supabase) — PostgreSQL, Auth, Storage, Edge Functions |
| **IA** | Google Gemini 2.5 Flash via Lovable AI Gateway |
| **Animations** | CSS Tailwind Animate |

---

## 2. Architecture globale

```
┌─────────────────────────────────────────────────────┐
│                   Client (SPA React)                │
│  ┌───────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │  Pages    │ │Components│ │   Hooks / Context   │  │
│  │  (views)  │ │  (UI)    │ │   (data layer)      │  │
│  └─────┬─────┘ └────┬─────┘ └─────────┬───────────┘  │
│        └─────────────┴────────────────┘               │
│                       │                               │
│              Supabase JS Client                       │
└───────────────────────┬───────────────────────────────┘
                        │ HTTPS
┌───────────────────────┴───────────────────────────────┐
│                  Lovable Cloud (Supabase)              │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────┐ │
│  │   Auth   │ │ Database │ │  Storage   │ │  Edge  │ │
│  │          │ │ (Postgres)│ │ (Buckets)  │ │Functions│ │
│  └──────────┘ └──────────┘ └────────────┘ └───┬────┘ │
└───────────────────────────────────────────────┼──────┘
                                                │
                                    ┌───────────┴──────────┐
                                    │  Lovable AI Gateway   │
                                    │  (Gemini 2.5 Flash)   │
                                    └──────────────────────┘
```

---

## 3. Structure des fichiers

```
src/
├── assets/                    # Images, vidéos statiques
│   ├── hero-aligner.jpg
│   ├── test-photos/           # Photos de test pour le dev
│   └── videos/                # Vidéos tutoriels locales
├── components/
│   ├── admin/                 # Composants admin
│   │   ├── AssignPatientDialog.tsx
│   │   ├── CreatePatientDialog.tsx
│   │   ├── CreatePractitionerDialog.tsx
│   │   ├── DeleteConfirmDialog.tsx
│   │   ├── EditPatientDialog.tsx
│   │   ├── EditPractitionerDialog.tsx
│   │   ├── TeethSelector3D.tsx
│   │   └── VideoManagement.tsx
│   ├── auth/
│   │   └── ProtectedRoute.tsx   # Garde de route RBAC
│   ├── layout/
│   │   └── Header.tsx
│   ├── patient/               # Composants vue patient
│   │   ├── AlignerCard.tsx
│   │   ├── AnalysisHistory.tsx
│   │   ├── AnalysisProgressChart.tsx
│   │   ├── AnalysisResult.tsx
│   │   ├── MultiAngleCapture.tsx
│   │   ├── PatientSchedule.tsx
│   │   ├── PhotoCapture.tsx
│   │   ├── PhotoGuideOverlay.tsx
│   │   ├── PhotoQualityCheck.tsx
│   │   ├── PhotoTutorial.tsx
│   │   ├── ProgressRing.tsx
│   │   ├── RemindersPanel.tsx
│   │   ├── StatsOverview.tsx
│   │   ├── Timeline.tsx
│   │   └── VideoTutorials.tsx
│   ├── practitioner/          # Composants vue praticien
│   │   ├── AlertDetailDialog.tsx
│   │   ├── AlertsPanel.tsx
│   │   ├── AlertsPanelNew.tsx
│   │   ├── PatientAlertsHistory.tsx
│   │   ├── PatientList.tsx
│   │   ├── PatientPhotosView.tsx
│   │   ├── PatientTreatmentInfo.tsx
│   │   ├── StatsCards.tsx
│   │   └── TeethViewer3D.tsx
│   └── ui/                    # shadcn/ui (40+ composants)
├── contexts/
│   └── AuthContext.tsx          # Authentification + RBAC
├── data/
│   └── mockData.ts
├── docs/                      # Documentation
│   ├── SPECIFICATIONS.md
│   └── ARCHITECTURE.md
├── hooks/                     # Custom hooks (data layer)
│   ├── useAdminData.ts
│   ├── useAlignerAnalysis.ts
│   ├── useAlignerChange.ts
│   ├── usePatientAlerts.ts
│   ├── usePatientPhotos.ts
│   ├── usePhotoAnalysis.ts
│   ├── usePractitionerAlerts.ts
│   ├── usePractitionerData.ts
│   └── useSpeechGuidance.ts
├── integrations/
│   └── supabase/
│       ├── client.ts            # Client auto-généré
│       └── types.ts             # Types auto-générés
├── pages/                     # Pages / Routes
│   ├── AdminDashboard.tsx
│   ├── Auth.tsx
│   ├── Index.tsx
│   ├── NewPractitionerDashboard.tsx
│   ├── NotFound.tsx
│   ├── PatientDashboard.tsx
│   └── PractitionerDashboard.tsx
├── types/
│   └── patient.ts               # Types métier
├── App.tsx                      # Router principal
└── main.tsx                     # Point d'entrée

supabase/
├── config.toml                  # Config Edge Functions
└── functions/
    ├── analyze-aligner-photo/   # Analyse IA des photos
    │   └── index.ts
    ├── create-admin/            # Création compte admin
    │   └── index.ts
    ├── create-analysis-alerts/  # Génération alertes auto
    │   └── index.ts
    ├── create-user/             # Création utilisateurs (admin)
    │   └── index.ts
    └── delete-user/             # Suppression utilisateurs
        └── index.ts
```

---

## 4. Flux de données principaux

### 4.1 Capture et analyse de photo

```
Patient                 Frontend                Edge Function           Lovable AI
  │                        │                        │                      │
  │─── Prend photo ───────>│                        │                      │
  │                        │─── Contrôle qualité ──>│                      │
  │                        │    (client-side)       │                      │
  │                        │                        │                      │
  │                        │─── Upload Storage ────>│                      │
  │                        │    (aligner-photos)    │                      │
  │                        │                        │                      │
  │                        │─── INSERT photo DB ───>│                      │
  │                        │                        │                      │
  │                        │─── analyze-aligner ───>│                      │
  │                        │    -photo              │─── Gemini 2.5 ─────>│
  │                        │                        │<── JSON résultat ───│
  │                        │                        │                      │
  │                        │<── Résultat analyse ───│                      │
  │                        │                        │                      │
  │                        │─── UPDATE photo DB ───>│                      │
  │                        │    (scores + statuts)  │                      │
  │                        │                        │                      │
  │                        │─── create-analysis ───>│                      │
  │                        │    -alerts             │                      │
  │                        │                        │─── INSERT alertes    │
  │                        │                        │    praticien         │
  │<── Affiche résultat ───│                        │                      │
```

### 4.2 Authentification et routage

```
Utilisateur ──> /auth ──> signIn() ──> fetchRoles()
                                          │
                              ┌───────────┼───────────┐
                              ▼           ▼           ▼
                          isPatient   isPractitioner  isAdmin
                              │           │           │
                              ▼           ▼           ▼
                          /patient  /practitioner   /admin
                                      -new
```

### 4.3 Gestion des alertes praticien

```
Analyse IA détecte problème
       │
       ▼
create-analysis-alerts (Edge Function)
       │
       ├── severity: high → type: attachment_lost / poor_insertion
       ├── severity: medium → type: gingival_issue
       └── INSERT INTO practitioner_alerts
              │
              ▼
    Praticien voit badge rouge/jaune
              │
              ▼
    Ouvre détail alerte → voit photo + analyse
              │
              ▼
    Résout avec notes → UPDATE resolved = true
              │
              ▼
    Compteur patient mis à jour (temps réel via React Query)
```

---

## 5. Edge Functions

| Fonction | JWT | Description |
|---|---|---|
| `analyze-aligner-photo` | Non | Envoie la photo à Gemini, retourne l'analyse JSON |
| `create-analysis-alerts` | Non | Crée des alertes praticien basées sur les résultats d'analyse |
| `create-user` | Non | Crée un utilisateur (appelé par l'admin pour éviter conflit de session) |
| `delete-user` | Non | Supprime un utilisateur et ses données associées |
| `create-admin` | Non | Crée le premier compte administrateur |

> **Note** : `verify_jwt = false` car ces fonctions utilisent le `SUPABASE_SERVICE_ROLE_KEY` en interne pour les opérations privilégiées.

---

## 6. Sécurité

### Authentification
- Email + mot de passe via Supabase Auth
- Pas d'inscription autonome pour patients/praticiens (créés par l'admin)
- Confirmation email requise

### Autorisation (RBAC)
- 3 rôles : `admin`, `practitioner`, `patient`
- Table `user_roles` avec enum `app_role`
- Fonctions SQL : `has_role(user_id, role)` et `get_profile_id(user_id)`
- Composant `ProtectedRoute` côté client
- RLS côté base de données (double sécurité)

### Stockage
- Bucket `aligner-photos` : privé, accès via URLs signées (2h)
- Bucket `tutorial-videos` : public

---

## 7. Patterns et conventions

### Data fetching
- **TanStack React Query** pour le cache, la revalidation et les mutations
- Hooks custom par domaine (`usePatientPhotos`, `usePractitionerAlerts`, etc.)
- Query keys structurées : `['entity', userId]`

### Normalisation PostgREST
- Les jointures PostgREST peuvent retourner des arrays au lieu d'objets
- Pattern de normalisation systématique : `if (Array.isArray(x)) x = x[0]`

### Composants UI
- shadcn/ui comme base (40+ composants)
- Design tokens sémantiques via CSS variables HSL
- Responsive mobile-first

### Gestion d'erreurs
- Try/catch dans les hooks avec `console.error`
- Toast notifications (Sonner) pour le feedback utilisateur
- Skeleton loaders pendant le chargement
- Fallbacks gracieux si données manquantes
