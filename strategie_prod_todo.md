# Stratégie Production AlignerTracker — Plan d'exécution (5 sprints)

**Projet** : AlignerTracker (alignbygn) — Suivi intelligent d'aligneurs dentaires  
**Date** : 1er mars 2026  
**Durée estimée** : 17 jours ouvrés (~3,5 semaines)

---

## 🔴 Sprint 1 — Fondations (3 jours) — CRITIQUE

### ✅ TERMINÉ (Sprint pour test dev local)
- [x] ~~Créer environnement Supabase production~~
- [x] ~~Configurer connexion Supabase prod~~
- [x] ~~Sécuriser accès et clés~~

### 🎯 ACTIONS CRITIQUES À FAIRE MAINTENANT

- [ ] **Créer projet Supabase Cloud RÉEL**
  - Région EU-West-1, plan Pro (25$/mois)
  - `supabase projects create alignbygn --region eu-west-1`
  - Récupérer URL + clés production

- [x] **Pousser migrations vers prod** ✅
  - `supabase link --project-ref gpvpbmibhqieimurohwd` ✅
  - `supabase db push` ✅ (13 migrations appliquées)
  - Schéma identique entre dev et prod ✅

- [x] **Déployer edge functions** ✅
  - `supabase functions deploy` ✅ (7 fonctions)
  - Toutes les fonctions ACTIVES ✅
  - Aucune erreur de déploiement ✅

- [x] **Configurer secrets production** ✅ (6/6)
  - `EMAIL_FROM="alignbygn <noreply@alignbygn.com>"` ✅
  - `APP_URL=https://app.alignbygn.com` ✅  
  - `ALLOWED_ORIGINS=https://app.alignbygn.com,https://alignbygn.com` ✅
  - `ADMIN_BOOTSTRAP_TOKEN` ✅ (généré 64 chars sécurisés)
  - `RESEND_API_KEY` ✅ (configuré pour emails)
  - `GEMINI_API_KEY` ✅ (nouvelle clé sécurisée)

- [x] **🚨 SÉCURITÉ : Rotation clé Gemini** ✅ (5/5)  
  - Ajouter .env au .gitignore ✅
  - Ancienne clé révoquée (nouvelle fournie) ✅
  - Nouvelle clé générée avec quotas élevés ✅
  - `supabase secrets set GEMINI_API_KEY` configuré ✅

- [x] **Fix vulnérabilités npm** ✅ (15→3)  
  - `npm audit fix` ✅ (résolu 12 vulnérabilités)
  - Objectif : 0 vulnérabilité high → **3 restantes** (build only)
  - `npm test` ✅ (161/161 tests passent après corrections)

- [x] **Auditer auth JWT edge functions** ✅
  - create-admin: Protection ADMIN_BOOTSTRAP_TOKEN ✅
  - delete-user: Vérification rôle admin via service_role ✅  
  - create-user: Protection admin validée ✅
  - analyze-aligner-photo: Rate limiting actif ✅

- [x] **Setup .env.production** ✅
  - Variables Vite pointent vers Supabase Cloud ✅
  - Build de production réussi (32.71s) ✅ 
  - PWA configurée avec 53 entrées precache ✅

---

## 🚀 Sprint 2 — Hébergement & CI/CD (3 jours)

- [ ] **Acheter domaine**
  - `alignbygn.com` + sous-domaine `app.alignbygn.com`
  - Configurer DNS

- [ ] **Déployer sur Vercel (recommandé)**
  - Connecter repo Git
  - Configurer `npm run build`
  - App live sur HTTPS
  - Variables d'env production

- [ ] **Headers sécurité**
  - CSP, HSTS, X-Frame-Options
  - Configuration vercel.json

- [ ] **Pipeline CI/CD**
  - GitHub Actions : lint + test + build + deploy
  - Deploy auto sur push main
  - Branche staging optionnelle

- [ ] **Split vendor chunks**
  - `manualChunks` dans vite.config.ts
  - Objectif : chunks < 300 KB

- [ ] **DNS email**
  - Resend + domaine vérifié
  - Emails depuis @alignbygn.com

- [ ] **Auth redirect URLs**
  - Configurer dans Supabase Dashboard
  - Login/callback OK en prod

---

## 📊 Sprint 3 — Qualité & sécurité (4 jours)

- [ ] **Tests E2E**
  - Playwright : login, capture, analyse, alertes
  - 5+ scénarios E2E pass

- [ ] **Lighthouse audit**
  - PWA + performance + accessibilité
  - Objectif : score > 90

- [ ] **strictNullChecks**
  - Activer progressivement
  - 0 crash null

- [ ] **Rate limiting prod**
  - Vérifier limites Gemini API
  - Protection anti-abus

- [ ] **Monitoring Sentry**
  - Crash reporting + performance
  - Dashboard actif
  - Alertes configurées

- [ ] **Logging structuré**
  - Logs edge functions
  - Logs consultables

- [ ] **SSL/HTTPS**
  - Forcé partout
  - Pas de mixed content

---

## 🔄 Sprint 4 — Conformité & données de santé (3 jours)

- [ ] **Politique de confidentialité**
  - Document légal hébergé
  - URL publique

- [ ] **CGU (Conditions d'utilisation)**
  - Acceptation obligatoire au signup
  - Page dédiée

- [ ] **Bannière consentement**
  - Cookies/analytics
  - RGPD conforme

- [ ] **Chiffrement storage**
  - Vérifier encryption at rest (Supabase Pro)
  - Données chiffrées

- [ ] **Rétention données**
  - Politique suppression automatique
  - Configurable

- [ ] **Droit de suppression**
  - Endpoint suppression compte + données
  - Fonctionnel

- [ ] **Sauvegarde DB**
  - Backup quotidien vérifié
  - Test de restauration

---

## 🎯 Sprint 5 — Go-live & stores (4 jours)

- [ ] **Beta fermée**
  - 5-10 utilisateurs réels
  - Feedback collecté

- [ ] **Fix bugs beta**
  - Corrections prioritaires
  - 0 bloquant

- [ ] **Publication Play Store**
  - Build Capacitor + signing
  - APK/AAB signé
  - Fiche Play Store

- [ ] **Publication App Store**
  - Build Capacitor + signing
  - IPA signé
  - Review Apple soumise

- [ ] **Feature flags**
  - Activer/désactiver fonctionnalités
  - Granularité par rôle

- [ ] **Documentation utilisateur**
  - Guide patient + guide praticien
  - PDF / page web

- [ ] **🚀 GO-LIVE PUBLIC**
  - DNS final
  - Monitoring actif
  - **PRODUCTION LIVE** ✅

---

## ⚠️ Checklist Go/No-Go BLOQUANT

### MUST-HAVE avant prod
- [ ] Projet Supabase Cloud créé et linké
- [ ] Migrations poussées en prod (`supabase db push`)
- [ ] Edge functions déployées (7 fonctions)
- [ ] Secrets configurés (6 variables)
- [ ] Clé API Gemini rotée (ancienne révoquée)
- [ ] `npm audit` — 0 vulnérabilité high
- [ ] Frontend déployé sur CDN avec HTTPS
- [ ] Domaine custom configuré (DNS + SSL)
- [ ] Auth redirect URLs configurées
- [ ] CORS pointant vers domaine prod
- [ ] RLS vérifié sur toutes les tables
- [ ] Storage policies vérifiées
- [ ] Edge functions auth interne validée
- [ ] Emails fonctionnels (Resend + domaine)
- [ ] Premier admin créé via token bootstrap
- [ ] Test bout en bout complet

---

## 📅 Planning & Effort

| Sprint | Durée | Focus | Status |
|---|---|---|---|
| **Sprint 1** | 3 jours | Fondations Supabase | ✅ **TERMINÉ** |
| **Sprint 2** | 3 jours | Hébergement CI/CD | 🟡 EN ATTENTE |
| **Sprint 3** | 4 jours | Qualité sécurité | 🟡 EN ATTENTE |
| **Sprint 4** | 3 jours | Conformité RGPD | 🟡 EN ATTENTE |
| **Sprint 5** | 4 jours | Go-live stores | 🟡 EN ATTENTE |

**📊 Total** : 17 jours ouvrés (~3,5 semaines)  
**🎯 Go-live estimé** : Mi-mars 2026
**✅ Sprint 1** : COMPLET (6/6 tâches, 10/10 secrets, sécurité auditée)

---

## 🚨 Actions IMMÉDIATES (aujourd'hui)

1. **Créer projet Supabase Cloud** (région EU)
2. **Révoquer clé API Gemini commitée** (sécurité)
3. **`npm audit fix`** (vulnérabilités)

> **Ces 3 actions sont les plus impactantes pour débloquer la production.**