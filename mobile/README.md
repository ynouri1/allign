# Mobile roadmap — AlignerTracker

Ce document décrit une stratégie mobile pragmatique pour rendre le projet utilisable sur smartphone, avec un chemin progressif vers publication store.

## 1) Recommandation expert (ordre conseillé)

### Niveau 1 — PWA (rapide, faible coût, impact immédiat)
- Objectif: expérience mobile web installable (Android + iOS Safari partiel)
- Avantages: pas de réécriture, mise en production rapide, maintenance unique
- Limites: accès caméra/background plus limité qu’une app native

### Niveau 2 — Wrapper mobile (Capacitor) pour stores
- Objectif: publier sur App Store / Play Store avec la base React existante
- Avantages: réutilise ~90% du code, accès natif caméra/files/permissions
- Limites: bridge natif à maintenir, quelques adaptations UX/device

### Niveau 3 — Modules natifs ciblés (si besoin clinique fort)
- Objectif: performance/capteurs avancés sur fonctions critiques (capture guidée, traitement image local)
- Avantages: meilleure ergonomie et robustesse mobile
- Limites: coût et complexité élevés

## 2) Étapes d’implémentation détaillées

## Phase A — Baseline mobile web (1 à 2 semaines)
1. Audit responsive des pages clés
   - Cibles: `patient`, `practitioner-new`, `admin`, `auth`
   - Vérifier: lisibilité, touch targets >= 44px, navigation tab mobile
2. Stabiliser viewport et zones safe-area
   - iOS notch, Android gesture bar
3. Optimiser perf mobile
   - Lazy load composants lourds (graphiques/3D)
   - Réduire JS initial et poids assets vidéos
4. QA device matrix
   - iPhone récent + Android milieu de gamme + tablette

## Phase B — PWA production (1 semaine)
1. Ajouter manifeste web app
   - `name`, `short_name`, `icons`, `theme_color`, `display: standalone`
2. Ajouter service worker
   - Cache shell + stratégies réseau API/media
3. Implémenter offline limité
   - File d’attente des actions non critiques (ex: brouillons)
4. Écran d’installation et fallback offline
5. Tester Lighthouse PWA et accessibilité

## Phase C — Capacitor (2 à 3 semaines)
1. Initialiser Capacitor
   - `npx cap init` puis plateformes iOS/Android
2. Brancher build web existant
   - sortie Vite vers dossier consommé par Capacitor
3. Permissions natives
   - caméra, photos, stockage selon besoin clinique
4. Adapter capture photo mobile
   - préférer plugins natifs quand navigateur mobile est instable
5. Packaging store
   - signatures, icônes splash, privacy manifest, textes stores

## Phase D — Durcissement santé/production (continu)
1. Sécurité
   - rotation tokens, durées session adaptées mobile
   - chiffrement local minimal, pas de données patient en clair
2. Observabilité
   - logs mobiles structurés + crash reporting
3. Conformité
   - bannière consentement, rétention, suppression données
4. Tests non-régression mobile
   - parcours: login, capture, analyse, alertes, changement aligneur

## 3) Backlog technique recommandé

Priorité haute:
- Rendre la capture photo robuste sur iOS Safari et Android Chrome
- Réduire le bundle initial et charger vidéos à la demande
- Gérer états réseau faible/intermittent

Priorité moyenne:
- Notifications push (rappels patient)
- Synchronisation background contrôlée

Priorité basse:
- Fonctionnalités natives avancées (widgets, intents, etc.)

## 4) KPI de succès mobile

- Taux de complétion capture photo (mobile)
- Temps moyen pour soumettre une session photo
- Taux d’erreur upload/analyse sur réseau cellulaire
- Crash-free sessions (si wrapper)
- Conversion installation PWA / app

## 5) Plan de lancement conseillé

1. Sprint 1: responsive + perf + QA devices
2. Sprint 2: PWA prête production
3. Sprint 3-4: Capacitor Android puis iOS
4. Go-live progressif avec feature flags

---

Décision recommandée: commencer immédiatement par Phase A + B (ROI le plus rapide), puis Phase C dès que les parcours patient/praticien sont stables en QA mobile.