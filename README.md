# AlignerTracker (Smile Tracker)

Plateforme web de suivi orthodontique par aligneurs, destinée à trois rôles:
- Patient
- Praticien
- Administrateur

## 1) Objectif du projet

AlignerTracker permet:
- Le suivi de progression du traitement (numéro de gouttière, prochaines étapes)
- La capture photo multi-angles des aligneurs
- L’analyse IA des photos (taquets, insertion, gencives, score)
- La génération d’alertes pour les praticiens
- L’administration des comptes, assignations et contenus tutoriels

## 2) Stack technique

- Frontend: React 18, TypeScript, Vite
- UI: Tailwind CSS, shadcn/ui, Radix UI
- Data/state: TanStack React Query
- Auth/DB/Storage: Supabase
- Fonctions serveur: Supabase Edge Functions
- IA: Google Gemini (API directe)

## 3) Rôles et accès

- Patient:
	- Dashboard personnel
	- Capture photo et historique d’analyse
	- Confirmation de changement de gouttière
	- Consultation de tutoriels
- Praticien:
	- Liste de patients assignés
	- Consultation photos/analyses
	- Gestion des alertes (résolution + notes)
- Admin:
	- CRUD patients/praticiens
	- Assignation patient/praticien
	- Paramètres de traitement
	- Gestion des vidéos tutoriels

## 4) Routes principales

- / : landing page
- /auth : authentification
- /patient : dashboard patient
- /practitioner : dashboard praticien (legacy)
- /practitioner-new : dashboard praticien principal
- /admin : dashboard administrateur

## 5) Fonctionnalités clés

1. Capture photo multi-angles (front, gauche, droite, occlusal)
2. Contrôle qualité (luminosité, netteté, cadrage)
3. Analyse IA:
	 - attachmentStatus: ok | partial | missing
	 - insertionQuality: good | acceptable | poor
	 - gingivalHealth: healthy | mild_inflammation | inflammation
	 - overallScore: 0-100
4. Alertes automatiques:
	 - attachment_lost
	 - poor_insertion
	 - gingival_issue
	 - missed_change
	 - photo_needed
5. Historique de traitement et progression
6. Bibliothèque de vidéos tutoriels
7. Chrono de port quotidien:
	 - Démarrer/arrêter le chrono de port de gouttière
	 - Objectif 16h/jour avec anneau de progression
	 - Pause avec rappel programmable (15min, 30min, 45min, 1h, personnalisé)
	 - Notification navigateur + toast au déclenchement du rappel
	 - Historique des sessions du jour

## 6) Architecture du code (résumé)

- src/pages: vues par rôle
- src/components: composants UI et métier
- src/hooks: logique de données (queries/mutations)
- src/contexts: état global (auth)
- src/integrations/supabase: client + types
- supabase/functions: logique serveur sensible
- supabase/migrations: modèle et sécurité SQL/RLS

## 7) Démarrage local

Prérequis:
- Node.js 20+
- npm

Installation:
- npm install

Développement:
- npm run dev

Vérifications:
- npm run lint
- npm run test
- npm run build

## 7.0.1) Tests

Le projet utilise **Vitest** + **@testing-library/react** + **jsdom**.

### Structure des tests

```
tests/
├── helpers/           # Utilitaires partagés (mocks, fixtures, wrapper)
│   ├── fixtures.ts        # Données de test (user, patient, photo, alert…)
│   ├── supabaseMock.ts    # Mock Supabase (DB, auth, storage, realtime)
│   └── testWrapper.tsx    # QueryClientProvider pour hooks
├── unit/
│   ├── auth/
│   │   ├── AuthContext.unit.test.tsx     # AuthProvider, rôles, signIn/signOut
│   │   └── ProtectedRoute.unit.test.tsx  # Routage protégé par rôle
│   └── hooks/
│       ├── useAdminData.unit.test.tsx        # CRUD patients/praticiens/assignations (11 tests)
│       ├── useAlignerAnalysis.unit.test.tsx  # Analyse IA (4 tests)
│       ├── useAlignerChange.unit.test.tsx    # Changement gouttière + historique (5 tests)
│       ├── useAlerts.unit.test.tsx           # Alertes patient + praticien + resolve + create (10 tests)
│       ├── usePatientPhotos.unit.test.tsx    # Photos patient + useMyPhotos (5 tests)
│       ├── usePractitionerData.unit.test.tsx # Patients assignés + profil praticien (5 tests)
│       ├── useToast.unit.test.ts            # Reducer du toast system (7 tests)
│       └── useWearTimer.unit.test.tsx        # Chrono de port (19 tests)
└── nonreg/
    ├── auth-login-logout.nonreg.test.tsx  # Flux connexion/déconnexion (3 tests)
    └── rbac-routing.nonreg.test.tsx       # Protection des routes par rôle (4 tests)
```

### Commandes

| Commande | Description |
|---|---|
| `npm run test` | Lance tous les tests en une passe |
| `npm run test:watch` | Mode watch (relance au changement) |
| `npm run test:unit` | Tests unitaires uniquement |
| `npm run test:nonreg` | Tests de non-régression uniquement |

### Couverture

- **85 tests** sur **13 fichiers** — couvre tous les hooks métier, l'auth, le routage protégé et les flux critiques.
- Hooks testés : `usePatientPhotos`, `usePatientAlerts`, `usePractitionerAlerts`, `useAdminData` (11 mutations/queries), `useAlignerChange`, `usePractitionerData`, `useAlignerAnalysis`, `useToast`, `useWearTimer`.
- Flux testés : connexion, déconnexion, RBAC, résolution d'alertes, création utilisateurs, assignations.

## 7.1) Utiliser Supabase en local

Le projet est configuré pour utiliser Supabase local via `.env.local`.

Commandes:
- npm run supabase:start
- npm run supabase:status
- npm run dev

Arrêt/reset:
- npm run supabase:stop
- npm run supabase:reset

Notes:
- Les ports locaux de ce projet sont isolés (55321/55322/55323/55324).
- En cas de besoin, tu peux tenter le démarrage complet avec `npm run supabase:start:full`.

### Configuration IA locale (obligatoire pour l'analyse photo)

La fonction `analyze-aligner-photo` nécessite le secret `GEMINI_API_KEY` côté Supabase Edge Runtime local.

Configurer le secret local:
- `npx supabase secrets set GEMINI_API_KEY=VOTRE_CLE`

Alternative locale (sans login Supabase CLI):
- créer `supabase/functions/.env` (recommandé avec `npm run supabase:start`)
- y mettre: `GEMINI_API_KEY=VOTRE_CLE`

Puis redémarrer la stack locale:
- `npm run supabase:stop`
- `npm run supabase:start`

Si la clé est absente, l'app affichera maintenant explicitement: `AI service not configured`.

### Comptes de test (local)

Ces comptes sont injectés par `supabase/seed.sql` après `npm run supabase:reset`.

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin.test@smile-tracker.local | AdminTest#2026 |
| Praticien | practitioner.test@smile-tracker.local | PraticienTest#2026 |
| Patient 1 | patient1.test@smile-tracker.local | PatientTest#2026 |
| Patient 2 | patient2.test@smile-tracker.local | PatientTest#2026 |

⚠️ Usage local/dev uniquement.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## TODO IA (actions)

- [x] Mettre un garde-fou côté fonction `analyze-aligner-photo` (limite locale + cooldown)

## TODO Audit (améliorations)

### Phase 1 — Sécurité (URGENT)

- [x] **S1** Ajouter `.env` et `supabase/functions/.env` au `.gitignore` (credentials de prod exposées)
- [~] **S2** Rotation des clés Supabase + Gemini après suppression du repo/historique — `.env` retiré du tracking git + `.env.example` créés. **⚠️ Rotation manuelle des clés requise** (voir ci-dessous)

#### Procédure de rotation S2 (manuelle)

Les clés suivantes ont été commitées dans l'historique git et doivent être considérées comme compromises :

1. **Clé anon Supabase (PROD)** — `VITE_SUPABASE_PUBLISHABLE_KEY` dans `.env`
   - Aller sur [Supabase Dashboard](https://supabase.com/dashboard) > Projet > Settings > API
   - Cliquer « Regenerate » sur l'anon key
   - Mettre à jour `.env` avec la nouvelle valeur

2. **Clé Gemini** — `GEMINI_API_KEY` dans `supabase/functions/.env`
   - Aller sur [Google AI Studio](https://aistudio.google.com/apikey)
   - Supprimer la clé existante et en créer une nouvelle
   - Mettre à jour `supabase/functions/.env`

3. **Nettoyer l'historique git** (optionnel mais recommandé) :
   ```bash
   # Supprimer .env de tout l'historique
   git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env" --prune-empty --tag-name-filter cat -- --all
   git push --force --all
   ```

4. Fichiers `.env.example` créés comme référence (sans valeurs sensibles).
- [x] **S3** Remettre `verify_jwt = true` sur `create-analysis-alerts` et sécuriser l'appel (interne only)
  - `verify_jwt = true` dans `config.toml` + vérification auth en defense-in-depth dans la fonction
- [x] **S4** Restreindre CORS (`Access-Control-Allow-Origin`) aux domaines de l'app (pas `*`)
  - Module partagé `supabase/functions/_shared/cors.ts` — origine autorisée via `ALLOWED_ORIGINS` env var (défaut: localhost:5173/8080)
  - 5/5 fonctions migrées vers le module partagé
- [x] **S5** Valider côté serveur que `create-analysis-alerts` ne peut être appelée qu'avec des données légitimes
  - Validation UUID (patientId, photoId), enums (attachmentStatus, insertionQuality, gingivalHealth), score 0-100
  - Vérification que le photoId appartient bien au patientId

### Phase 2 — Performance & Qualité (COURT TERME)

- [ ] **P1** Lazy loading des routes (`React.lazy`) + import dynamique de Three.js (~1MB en moins pour la plupart des users)
- [ ] **P2** Remplacer les N+1 `createSignedUrl()` par `createSignedUrls()` (batch) dans `usePatientPhotos` et `usePractitionerAlerts`
- [ ] **P3** Configurer `staleTime: 30_000` global sur React Query (évite refetch inutiles)
- [ ] **P4** Extraire `useCurrentPatientId()` partagé (chaîne user→profile→patient dupliquée dans 5+ hooks)
- [ ] **P5** Extraire `getSignedUrl()` dans `src/lib/storage.ts` (dupliquée 3 fois avec durées différentes)
- [ ] **P6** Filtrer les channels Realtime par `patient_id`/`practitioner_id` (éviter invalidation globale)
- [ ] **Q1** Activer TypeScript `strict: true` progressivement (critical pour une app médicale)
- [x] **Q5** Extraire les headers CORS dans un module partagé `supabase/functions/_shared/cors.ts` (fait avec S4)

### Phase 3 — Tests & Cleanup (MOYEN TERME)

- [x] **Q2** Augmenter la couverture de tests (~5% actuel → 66 tests / 12 fichiers) : hooks critiques, mutations, auth, alertes, admin CRUD
- [ ] **A2** Supprimer `PractitionerDashboard.tsx` (legacy) — ne garder que `NewPractitionerDashboard`
- [ ] **A1** Extraire `useMyPatientData()` de `PatientDashboard.tsx` vers `src/hooks/`
- [ ] **A3** Supprimer `mockData.ts` (données vides encore importées en prod)
- [ ] **Q7** Supprimer `PhotoCapture.tsx` (composant mort remplacé par `MultiAngleCapture`)
- [ ] **Q6** Utiliser `Tables<'patient_photos'>` au lieu de `PatientPhotoRecord` redéclaré manuellement
- [ ] **S8** Stocker le path relatif dans `photo_url` au lieu d'une URL publique (bucket est private)
- [ ] **U3** Traduire `NotFound.tsx` en français (actuellement en anglais)
- [ ] **U7** Corriger l'icône `ArrowLeft` utilisée pour "Déconnexion" (trompeuse)
- [ ] **A4** Unifier les props `userType`/`userRole` dans `Header.tsx`
