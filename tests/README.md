# Stratégie de tests (dossier dédié)

Ce dossier contient les tests transverses du projet.

## Arborescence

```
tests/
├── helpers/           # Utilitaires partagés
│   ├── fixtures.ts        # Données de test réutilisables
│   ├── supabaseMock.ts    # Mock complet du client Supabase
│   └── testWrapper.tsx    # QueryClientProvider pour hooks
├── unit/              # Tests unitaires purs
│   ├── auth/
│   │   ├── AuthContext.unit.test.tsx
│   │   └── ProtectedRoute.unit.test.tsx
│   └── hooks/
│       ├── useAdminData.unit.test.tsx
│       ├── useAlignerAnalysis.unit.test.tsx
│       ├── useAlignerChange.unit.test.tsx
│       ├── useAlerts.unit.test.tsx
│       ├── usePatientPhotos.unit.test.tsx
│       ├── usePractitionerData.unit.test.tsx
│       └── useToast.unit.test.ts
└── nonreg/            # Tests de non-régression
    ├── auth-login-logout.nonreg.test.tsx
    └── rbac-routing.nonreg.test.tsx
```

## Convention de nommage

- Unitaires : `*.unit.test.ts` ou `*.unit.test.tsx`
- Non-régression : `*.nonreg.test.ts` ou `*.nonreg.test.tsx`

## Commandes

| Commande | Description |
|---|---|
| `npm run test` | Tous les tests |
| `npm run test:watch` | Mode watch |
| `npm run test:unit` | Unitaires uniquement |
| `npm run test:nonreg` | Non-régression uniquement |

## Hooks et modules couverts

| Module | Tests | Cas |
|---|---|---|
| `usePatientPhotos` | `usePatientPhotos.unit.test.tsx` | fetch, signed URLs, useMyPhotos, no patient |
| `usePatientAlerts` | `useAlerts.unit.test.tsx` | fetch, unresolvedCount, disabled state |
| `usePractitionerAlerts` | `useAlerts.unit.test.tsx` | fetch + joins, PostgREST normalization, resolve, create |
| `useAdminData` | `useAdminData.unit.test.tsx` | patients, practitioners, assignments, CRUD, toasts |
| `useAlignerChange` | `useAlignerChange.unit.test.tsx` | confirm change, history, error handling |
| `useAlignerAnalysis` | `useAlignerAnalysis.unit.test.tsx` | base64/URL dispatch, success/error mapping |
| `usePractitionerData` | `usePractitionerData.unit.test.tsx` | assigned patients, profile, disabled state |
| `use-toast` (reducer) | `useToast.unit.test.ts` | ADD, UPDATE, DISMISS, REMOVE, LIMIT |
| `AuthContext` | `AuthContext.unit.test.tsx` | provider, roles, signIn, signOut, context throw |
| `ProtectedRoute` | `ProtectedRoute.unit.test.tsx` | loading, redirect, role-based rendering |
| Auth flow | `auth-login-logout.nonreg.test.tsx` | login, error, logout redirect |
| RBAC routing | `rbac-routing.nonreg.test.tsx` | patient/admin allowed/denied |

## Prochaines cibles

- Tests de composants UI (PhotoCapture, AlertDetailDialog)
- Tests e2e : flux photo → analyse → alerte → résolution praticien
- Couverture de `useSpeechGuidance` et `usePhotoAnalysis`

## Remarque

Le projet conserve aussi des tests techniques dans src/test.
Ce dossier tests/ est le référentiel métier pour la campagne non-régression et unit.