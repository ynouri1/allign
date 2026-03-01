# Stratégie de mise en production — alignbygn

**Projet** : AlignerTracker (alignbygn) — Suivi intelligent d'aligneurs dentaires  
**Date** : 28 février 2026  
**Statut actuel** : Dev local fonctionnel (Phase A+B+C complètes)

---

## Table des matières

1. [État des lieux](#1-état-des-lieux)
2. [Prérequis bloquants](#2-prérequis-bloquants-avant-production)
3. [Architecture cible production](#3-architecture-cible-production)
4. [Plan d'exécution en 5 sprints](#4-plan-dexécution-en-5-sprints)
5. [Variables d'environnement](#5-variables-denvironnement)
6. [Pipeline CI/CD](#6-pipeline-cicd)
7. [Sécurité](#7-sécurité)
8. [Monitoring & observabilité](#8-monitoring--observabilité)
9. [Conformité santé (données patient)](#9-conformité-santé-données-patient)
10. [Stratégie mobile stores](#10-stratégie-mobile-stores)
11. [Checklist Go/No-Go](#11-checklist-gono-go)
12. [Plan de rollback](#12-plan-de-rollback)
13. [Post-lancement](#13-post-lancement)

---

## 1) État des lieux

### Ce qui fonctionne

| Composant | Statut | Détail |
|---|---|---|
| Frontend React/Vite | ✅ | Build prod OK, 118 fichiers, 14 798 lignes |
| PWA | ✅ | Service worker, precache 51 assets, offline fallback |
| Capacitor Android/iOS | ✅ | 7 plugins sync, caméra native intégrée |
| Supabase local | ✅ | 13 migrations, 7 edge functions, seed data |
| Auth + RBAC | ✅ | 3 rôles (patient, practitioner, admin) |
| AI analyse (Gemini) | ✅ | Rate limiting, gestion erreurs |
| Tests | ✅ | 152 tests pass, 18 fichiers |

### Ce qui bloque la prod

| Problème | Sévérité | Sprint |
|---|---|---|
| Pas de projet Supabase cloud | **BLOQUANT** | Sprint 1 |
| Clé API Gemini commitée dans le repo | **CRITIQUE** | Sprint 1 |
| 6 Edge Functions sans vérification JWT | **CRITIQUE** | Sprint 1 |
| 11 vulnérabilités npm (6 high) | **CRITIQUE** | Sprint 1 |
| Pas de CI/CD | **HAUT** | Sprint 2 |
| Pas de domaine custom | **HAUT** | Sprint 2 |
| Pas de tests E2E | **HAUT** | Sprint 3 |
| `strictNullChecks: false` | **MOYEN** | Sprint 3 |
| Vendor chunk 485 KB non splitté | **MOYEN** | Sprint 2 |
| Pas de monitoring/crash reporting | **HAUT** | Sprint 3 |

---

## 2) Prérequis bloquants avant production

### 2.1 Créer le projet Supabase Cloud

```bash
# Installer la CLI Supabase si pas déjà fait
npm i -g supabase

# Se connecter
supabase login

# Créer le projet (ou le lier à un existant)
supabase projects create alignbygn --org-id <ORG_ID> --region eu-west-1 --db-password <STRONG_PASSWORD>

# Lier le projet local au projet cloud
supabase link --project-ref <PROJECT_REF>

# Pousser les migrations
supabase db push

# Déployer les edge functions
supabase functions deploy --no-verify-jwt  # déploie toutes les fonctions

# Configurer les secrets
supabase secrets set GEMINI_API_KEY=<NEW_KEY>
supabase secrets set RESEND_API_KEY=<KEY>
supabase secrets set EMAIL_FROM="alignbygn <noreply@alignbygn.com>"
supabase secrets set APP_URL=https://app.alignbygn.com
supabase secrets set ALLOWED_ORIGINS=https://app.alignbygn.com,https://alignbygn.com
supabase secrets set ADMIN_BOOTSTRAP_TOKEN=<STRONG_RANDOM_TOKEN>
```

### 2.2 Rotation de la clé API commitée

```bash
# 1. Révoquer l'ancienne clé Gemini dans Google AI Studio
# 2. Générer une nouvelle clé
# 3. L'injecter en secret (jamais dans le code)
supabase secrets set GEMINI_API_KEY=<NOUVELLE_CLE>

# 4. Ajouter supabase/functions/.env au .gitignore
echo "supabase/functions/.env" >> .gitignore

# 5. Supprimer l'historique git (optionnel mais recommandé)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch supabase/functions/.env" HEAD
```

### 2.3 Corriger les vulnérabilités npm

```bash
npm audit fix
# Si des breaking changes : npm audit fix --force (vérifier les tests après)
npm test
```

---

## 3) Architecture cible production

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTS                           │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ PWA Web  │  │ Android  │  │ iOS (Capacitor)  │  │
│  │ (Chrome) │  │(Capacitor)│  │  (App Store)     │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │              │                 │             │
└───────┼──────────────┼─────────────────┼─────────────┘
        │              │                 │
        ▼              ▼                 ▼
┌─────────────────────────────────────────────────────┐
│              CDN / Hébergement statique              │
│         (Vercel / Netlify / Cloudflare Pages)        │
│                                                     │
│  dist/  ← vite build (HTML + JS + CSS + SW)         │
│  Domaine: app.alignbygn.com                         │
│  HTTPS forcé, headers sécurité, gzip/brotli         │
└────────────────────┬────────────────────────────────┘
                     │ API calls
                     ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Cloud (eu-west-1)              │
│                                                     │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Auth    │  │ Realtime │  │ Edge Functions    │  │
│  │ (JWT)   │  │ (WS)     │  │ (Deno Deploy)    │  │
│  └─────────┘  └──────────┘  └───────────────────┘  │
│                                                     │
│  ┌─────────────────┐  ┌────────────────────────┐   │
│  │ PostgreSQL      │  │ Storage (S3)           │   │
│  │ (RLS activé)    │  │ aligner-photos bucket  │   │
│  └─────────────────┘  └────────────────────────┘   │
│                                                     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              Services tiers                          │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ Google AI    │  │ Resend.com   │                 │
│  │ (Gemini API) │  │ (Emails)     │                 │
│  └──────────────┘  └──────────────┘                 │
└─────────────────────────────────────────────────────┘
```

### Choix d'hébergement recommandé

| Option | Avantages | Prix estimé |
|---|---|---|
| **Vercel** (recommandé) | Deploy auto depuis Git, CDN global, preview branches, analytics | Gratuit (hobby) / 20$/mois (pro) |
| Netlify | Similaire, bon CDN | Gratuit / 19$/mois |
| Cloudflare Pages | CDN le plus rapide, 0 cold start | Gratuit / 5$/mois |

### Choix Supabase

| Plan | Inclus | Prix |
|---|---|---|
| **Pro** (recommandé) | 8 Go DB, 250 Go storage, 50 Go bandwidth, backups journaliers | 25$/mois |
| Free | 500 Mo DB, 1 Go storage, limite edge functions | 0$ (prototype) |

---

## 4) Plan d'exécution en 5 sprints

### Sprint 1 — Fondations (3 jours) 🔴 CRITIQUE

| Tâche | Détail | Livrable |
|---|---|---|
| Créer projet Supabase Cloud | Région EU, plan Pro | URL + clés prod |
| Pousser migrations | `supabase db push` | Schéma prod identique au dev |
| Déployer edge functions | `supabase functions deploy` | 7 fonctions actives |
| Configurer secrets | 6 secrets manuels | Secrets injectés |
| Rotation clé Gemini | Révoquer + régénérer | Ancienne clé invalidée |
| Fix npm audit | `npm audit fix` | 0 vulnérabilité high |
| Vérifier auth JWT | Auditer chaque edge function | Auth interne confirmée |
| Setup `.env.production` | Vars Vite pour prod | Build pointe vers Supabase Cloud |

### Sprint 2 — Hébergement & CI/CD (3 jours)

| Tâche | Détail | Livrable |
|---|---|---|
| Acheter domaine | `alignbygn.com` + sous-domaine `app.` | DNS configuré |
| Déployer sur Vercel/Netlify | Connect repo Git, build `npm run build` | App live sur HTTPS |
| Configurer headers sécurité | CSP, HSTS, X-Frame-Options | Headers actifs |
| Pipeline CI/CD | GitHub Actions (lint + test + build + deploy) | Deploy auto sur push main |
| Split vendor chunks | `manualChunks` dans vite.config.ts | Chunks < 300 KB |
| Configurer DNS email | Resend + domaine vérifié | Emails envoyés depuis `@alignbygn.com` |
| Auth redirect URLs | Configurer dans Supabase Dashboard | Login/callback OK en prod |

### Sprint 3 — Qualité & sécurité (4 jours)

| Tâche | Détail | Livrable |
|---|---|---|
| Tests E2E | Playwright : login, capture, analyse, alertes | 5+ scénarios E2E pass |
| Lighthouse audit | PWA + perf + accessibilité | Score > 90 |
| `strictNullChecks` | Activer progressivement | 0 crash null |
| Rate limiting prod | Vérifier limites Gemini API | Protection anti-abus |
| Monitoring | Sentry (crash reporting + performance) | Dashboard Sentry actif |
| Logging | Logs structurés edge functions | Logs consultables |
| SSL/HTTPS | Forcé partout, pas de mixed content | 100% HTTPS |

### Sprint 4 — Conformité & données de santé (3 jours)

| Tâche | Détail | Livrable |
|---|---|---|
| Politique de confidentialité | Document légal hébergé | URL publique |
| CGU | Conditions d'utilisation | Acceptation obligatoire au signup |
| Bannière consentement | Cookies/analytics | RGPD conforme |
| Chiffrement storage | Vérifier encryption at rest (Supabase Pro) | Données chiffrées |
| Rétention données | Politique de suppression automatique | Configurable |
| Droit de suppression | Endpoint suppression compte + données | Fonctionnel |
| Sauvegarde DB | Backup strategy (Supabase + export) | Backup quotidien vérifié |

### Sprint 5 — Go-live & stores (4 jours)

| Tâche | Détail | Livrable |
|---|---|---|
| Beta fermée | 5-10 utilisateurs réels | Feedback collecté |
| Fix bugs beta | Corrections prioritaires | 0 bloquant |
| Publication Play Store | Build Capacitor + signing | APK/AAB signé, fiche Play Store |
| Publication App Store | Build Capacitor + signing | IPA signé, review Apple soumise |
| Feature flags | Activer/désactiver fonctionnalités | Granularité par rôle |
| Documentation utilisateur | Guide patient + guide praticien | PDF / page web |
| Go-live public | DNS final, monitoring actif | **PRODUCTION LIVE** |

---

## 5) Variables d'environnement

### Frontend (.env.production)

```bash
# Supabase Cloud
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...  # anon key (public, pas secret)
```

### Edge Functions (supabase secrets)

```bash
# Services tiers (JAMAIS dans le code)
GEMINI_API_KEY=AIza...                          # Google AI Studio
RESEND_API_KEY=re_...                           # Resend.com
EMAIL_FROM=alignbygn <noreply@alignbygn.com>    # Expéditeur vérifié
APP_URL=https://app.alignbygn.com               # URL publique
ALLOWED_ORIGINS=https://app.alignbygn.com       # CORS
ADMIN_BOOTSTRAP_TOKEN=<token_fort_usage_unique>  # Création premier admin

# Auto-injectés par Supabase (ne pas définir)
# SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

### Matrice env par contexte

| Variable | Dev local | Staging | Production |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `http://localhost:55321` | `https://staging-xxx.supabase.co` | `https://prod-xxx.supabase.co` |
| `GEMINI_API_KEY` | Clé test | Clé test | Clé production (quotas élevés) |
| `RESEND_API_KEY` | Non requis (Inbucket) | Clé test | Clé production |
| `ALLOWED_ORIGINS` | `localhost:*` | `https://staging.alignbygn.com` | `https://app.alignbygn.com` |
| `APP_URL` | `http://localhost:8080` | `https://staging.alignbygn.com` | `https://app.alignbygn.com` |

---

## 6) Pipeline CI/CD

### GitHub Actions recommandé

```yaml
# .github/workflows/deploy.yml
name: CI/CD

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm test

  build:
    needs: lint-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/ }

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      # Déployer sur Vercel preview ou Netlify staging
      - run: echo "Deploy to staging"

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production  # Require manual approval
    steps:
      # Déployer sur Vercel production
      - run: echo "Deploy to production"

  deploy-supabase:
    needs: lint-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
      - run: supabase db push
      - run: supabase functions deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### Stratégie de branches

```
main         ← production (deploy auto après approval)
  └── staging  ← staging (deploy auto)
       └── feature/*  ← branches de développement (PR vers staging)
```

---

## 7) Sécurité

### 7.1 Headers HTTP (à configurer sur Vercel/Netlify)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(self), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com; font-src 'self'" }
      ]
    }
  ]
}
```

### 7.2 Audit Edge Functions — vérifications internes requises

| Fonction | `verify_jwt` | Protection interne attendue |
|---|---|---|
| `create-admin` | false | Doit vérifier `ADMIN_BOOTSTRAP_TOKEN` dans le body |
| `delete-user` | false | Doit vérifier rôle admin via service_role + user_roles |
| `reset-password` | false | Normal — l'utilisateur n'est pas encore authentifié |
| `create-user` | false | Doit vérifier rôle admin/practitioner en interne |
| `send-assignment-emails` | false | Doit vérifier rôle admin en interne |
| `analyze-aligner-photo` | false | Rate limiting actif + vérifie patient_id valide |

> **Action** : Auditer chaque fonction pour confirmer que ces vérifications existent. Documenter le résultat.

### 7.3 Supabase RLS

Toutes les tables doivent avoir Row Level Security (RLS) activé :
- `profiles` : lecture propre profil, écriture admin
- `patients` : lecture patient propre + praticien assigné + admin
- `patient_photos` : lecture patient propre + praticien + admin
- `user_roles` : lecture propre rôle, écriture admin
- `wear_time_sessions` : lecture/écriture patient propre
- `aligner_changes` : lecture patient + praticien, écriture patient
- `alerts` : lecture praticien assigné + admin, écriture edge function

### 7.4 Storage policies

Le bucket `aligner-photos` doit avoir des policies restrictives :
- **Upload** : uniquement le patient authentifié dans son propre dossier
- **Download** : patient propre + praticien assigné + admin
- **Delete** : admin uniquement

---

## 8) Monitoring & observabilité

### 8.1 Stack recommandée

| Outil | Usage | Prix |
|---|---|---|
| **Sentry** | Crash reporting + performance frontend | Gratuit (5K events/mois) |
| **Supabase Dashboard** | Métriques DB, auth, storage, functions | Inclus dans plan Pro |
| **Vercel Analytics** | Web Vitals, trafic | Inclus sur Pro |
| **UptimeRobot** | Monitoring uptime (ping) | Gratuit (50 monitors) |

### 8.2 Alertes à configurer

| Alerte | Seuil | Canal |
|---|---|---|
| API down | > 1 min indisponible | Email + Slack |
| Taux erreur 5xx | > 5% sur 5 min | Slack |
| Gemini quota | > 80% du quota | Email |
| DB connections | > 80% pool | Email |
| Storage | > 80% quota | Email |
| Edge function timeout | > 10 occurrences/heure | Slack |
| Crash rate mobile | > 1% | Sentry |

### 8.3 Intégration Sentry (frontend)

```bash
npm install @sentry/react
```

```typescript
// src/main.tsx — ajouter avant createRoot()
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: "production",
    tracesSampleRate: 0.1,  // 10% des transactions
    replaysSessionSampleRate: 0.01,
  });
}
```

---

## 9) Conformité santé (données patient)

### 9.1 RGPD — obligations minimales

| Obligation | Implémentation |
|---|---|
| **Consentement explicite** | Checkbox obligatoire au signup + bannière cookies |
| **Droit d'accès** | Export JSON/PDF des données patient (dashboard) |
| **Droit de suppression** | Bouton "Supprimer mon compte" → supprime profil + photos + sessions |
| **Droit de portabilité** | Export CSV/JSON des données |
| **Registre des traitements** | Document interne (qui accède quoi, pourquoi, combien de temps) |
| **DPO** | Désigner un responsable des données |
| **Notification de brèche** | Procédure 72h (CNIL) |

### 9.2 Hébergement données de santé (France)

Si le projet vise le marché français avec des données de santé :
- **HDS (Hébergeur de Données de Santé)** : l'hébergeur cloud doit être certifié HDS
- Supabase Cloud (AWS) : AWS est certifié HDS en région `eu-west-3` (Paris)
- Alternative : héberger Supabase self-hosted sur un infra HDS (OVH, Scaleway)
- **Recommandation** : pour un MVP, rester sur Supabase Cloud EU avec consentement explicite. Migrer vers HDS au scaling.

### 9.3 Rétention des données

| Donnée | Durée de rétention | Action à expiration |
|---|---|---|
| Photos aligneurs | Durée du traitement + 3 ans | Archivage puis suppression |
| Résultats analyse | Durée du traitement + 3 ans | Idem |
| Sessions wear-time | Durée du traitement + 1 an | Suppression |
| Profils utilisateurs | Tant que le compte est actif | Suppression sur demande |
| Logs techniques | 90 jours | Suppression automatique |

---

## 10) Stratégie mobile stores

### 10.1 Google Play Store

| Étape | Action |
|---|---|
| Compte développeur | Payer 25$ (une fois), créer compte Google Play Console |
| Signing | Générer keystore (`keytool`), configurer dans `android/app/build.gradle` |
| Build release | `npm run cap:build` puis Android Studio > Build > Generate Signed APK/AAB |
| Fiche store | Titre, description FR/EN, screenshots (5+), icône 512×512, feature graphic |
| Privacy Policy | URL obligatoire (page hébergée) |
| Catégorie | Médical > Santé |
| Review | ~1-3 jours |

### 10.2 Apple App Store

| Étape | Action |
|---|---|
| Compte développeur | Apple Developer Program 99$/an |
| Certificates & Profiles | Provisioning profile, distribution certificate |
| Build release | Xcode > Product > Archive > Upload to App Store Connect |
| App Store Connect | Metadata, screenshots iPhone 6.7" + iPad, description FR/EN |
| Privacy Manifest | `PrivacyInfo.xcprivacy` (obligatoire iOS 17+) |
| Review | ~1-7 jours, guidelines strictes sur santé |
| Info.plist | Vérifier toutes les `NS*UsageDescription` |

### 10.3 Splash screens & icônes natifs

```bash
# Générer les assets natifs depuis l'icône source
npm install @capacitor/assets --save-dev

# Placer un logo haute résolution dans resources/
# resources/icon.png (1024x1024)
# resources/splash.png (2732x2732)

npx capacitor-assets generate
```

---

## 11) Checklist Go/No-Go

### BLOQUANT — must-have pour prod

- [ ] Projet Supabase Cloud créé et linké
- [ ] Migrations poussées en prod (`supabase db push`)
- [ ] Edge functions déployées
- [ ] Secrets configurés (6 variables)
- [ ] Clé API Gemini rotée (ancienne révoquée)
- [ ] `npm audit` — 0 vulnérabilité high
- [ ] Frontend déployé sur CDN avec HTTPS
- [ ] Domaine custom configuré (DNS + SSL)
- [ ] Auth redirect URLs configurées dans Supabase Dashboard
- [ ] CORS `ALLOWED_ORIGINS` pointant vers le domaine prod
- [ ] RLS vérifié sur toutes les tables
- [ ] Storage policies vérifiées
- [ ] Edge functions — vérifier auth interne sur chaque endpoint
- [ ] Emails fonctionnels (Resend + domaine vérifié)
- [ ] Premier admin créé via `ADMIN_BOOTSTRAP_TOKEN`
- [ ] Test de bout en bout : signup → login → capture → analyse → résultat

### IMPORTANT — fortement recommandé

- [ ] CI/CD pipeline (lint + test + build + deploy auto)
- [ ] Headers sécurité configurés (CSP, HSTS, etc.)
- [ ] Sentry intégré (crash reporting)
- [ ] Monitoring uptime
- [ ] Lighthouse score > 90 (PWA + perf + accessibility)
- [ ] Vendor chunks splittés (< 300 KB par chunk)
- [ ] Politique de confidentialité publiée
- [ ] CGU acceptées au signup
- [ ] Backup DB vérifié (restore test)

### NICE-TO-HAVE — avant scaling

- [ ] Tests E2E (Playwright)
- [ ] `strictNullChecks: true`
- [ ] App publiée sur Play Store
- [ ] App publiée sur App Store
- [ ] Analytics (Vercel Analytics ou Plausible)
- [ ] Feature flags
- [ ] Documentation utilisateur

---

## 12) Plan de rollback

### Frontend

```bash
# Vercel : rollback instantané vers le deploy précédent
vercel rollback

# Netlify : même principe via l'UI ou CLI
netlify deploy --prod --dir=dist-backup
```

### Supabase

```bash
# Rollback une migration
supabase db reset  # ⚠️ destructif — uniquement en staging

# En production : créer une migration inverse
supabase migration new rollback_xxx
# Écrire le SQL inverse manuellement
supabase db push
```

### Procédure d'urgence

1. **Problème frontend** → Rollback deploy Vercel (< 30 secondes)
2. **Problème edge function** → `supabase functions deploy <function>` avec l'ancienne version
3. **Problème DB** → Restore depuis backup Supabase (plan Pro = snapshot quotidien)
4. **Problème Gemini API** → La fonction gère déjà le fallback avec message d'erreur user-friendly
5. **Brèche de sécurité** → Rotation immédiate de tous les secrets + notification CNIL 72h

---

## 13) Post-lancement

### Semaine 1 — Hypercare

| Action | Fréquence |
|---|---|
| Surveiller Sentry (0 crash objectif) | Continu |
| Vérifier logs edge functions | 2x/jour |
| Monitorer usage Gemini (quota) | 1x/jour |
| Collecter feedback beta testeurs | Continu |
| Hotfix si bloquant | Immédiat |

### Mois 1 — Stabilisation

| Action | Objectif |
|---|---|
| KPIs mobile (taux capture, temps upload) | Baseline établie |
| Taux d'erreur < 1% | Stabilité confirmée |
| Score Lighthouse > 90 | Performance validée |
| 0 vulnérabilité npm | Sécurité maintenue |

### Mois 2-3 — Croissance

| Action | Objectif |
|---|---|
| Publication stores (Android puis iOS) | Apps natives disponibles |
| Notifications push | Rappels patient |
| Feature flags | A/B testing fonctionnalités |
| Plan HDS si scaling santé | Conformité renforcée |

---

## Estimation effort total

| Sprint | Durée | Effort |
|---|---|---|
| Sprint 1 — Fondations | 3 jours | 1 développeur |
| Sprint 2 — Hébergement & CI/CD | 3 jours | 1 développeur |
| Sprint 3 — Qualité & sécurité | 4 jours | 1 développeur |
| Sprint 4 — Conformité | 3 jours | 1 dev + 1 juridique |
| Sprint 5 — Go-live & stores | 4 jours | 1 développeur |
| **Total** | **~17 jours ouvrés** | **~3,5 semaines** |

**Date de go-live estimée** : mi-mars 2026 (si démarrage immédiat).

---

> **Décision clé** : Commencer par le Sprint 1 dès aujourd'hui. Les 3 actions les plus impactantes sont : (1) créer le projet Supabase Cloud, (2) révoquer la clé API commitée, (3) `npm audit fix`.
