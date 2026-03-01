# Mobile roadmap — AlignerTracker

Ce document décrit une stratégie mobile pragmatique pour rendre le projet utilisable sur smartphone, avec un chemin progressif vers publication store.

## 1) Recommandation expert (ordre conseillé)

### Niveau 1 — PWA (rapide, faible coût, impact immédiat)
- Objectif: expérience mobile web installable (Android + iOS Safari partiel)
- Avantages: pas de réécriture, mise en production rapide, maintenance unique
- Limites: accès caméra/background plus limité qu'une app native

### Niveau 2 — Wrapper mobile (Capacitor) pour stores
- Objectif: publier sur App Store / Play Store avec la base React existante
- Avantages: réutilise ~90% du code, accès natif caméra/files/permissions
- Limites: bridge natif à maintenir, quelques adaptations UX/device

### Niveau 3 — Modules natifs ciblés (si besoin clinique fort)
- Objectif: performance/capteurs avancés sur fonctions critiques (capture guidée, traitement image local)
- Avantages: meilleure ergonomie et robustesse mobile
- Limites: coût et complexité élevés

## 2) Étapes d'implémentation détaillées

## Phase A — Baseline mobile web ✅ DONE (complet)
1. Audit responsive des pages clés
   - Cibles: `patient`, `practitioner-new`, `admin`, `auth`
   - Vérifier: lisibilité, touch targets >= 44px, navigation tab mobile
   - [x] Audit complet effectué (25/02/2026)
2. Stabiliser viewport et zones safe-area
   - [x] `viewport-fit=cover` ajouté dans `index.html`
   - [x] Safe-area CSS `env(safe-area-inset-*)` sur `<html>` et header
   - [x] iOS notch, Android gesture bar
3. Optimiser perf mobile
   - [x] Lazy load toutes les pages via `React.lazy()` + `Suspense` (code splitting)
   - [x] Suppression `App.css` mort (scaffold Vite)
   - [x] Fix ordre `@import` CSS
   - [x] Réduire JS initial et poids assets vidéos (lazy load vidéos à la demande via `new URL()` pattern)
   - [x] Lazy load composants lourds (3D TeethViewer, graphiques, VideoTutorials via `React.lazy()`)
4. QA device matrix
   - [ ] iPhone récent + Android milieu de gamme + tablette

## Phase B — PWA production ✅ DONE
1. Manifeste web app
   - [x] `vite-plugin-pwa` configuré avec manifest complet
   - [x] `name`, `short_name`, `icons`, `theme_color`, `background_color`, `display: standalone`, `orientation: portrait`
2. Icônes PWA
   - [x] SVG source créé (`public/icon.svg`)
   - [x] 192x192, 512x512 PNG générés via script sharp
   - [x] Icône maskable 512x512
   - [x] `apple-touch-icon.png` 180x180
   - [x] Meta tags iOS: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
   - [x] `<meta name="theme-color">` ajouté
3. Service worker
   - [x] Workbox via `vite-plugin-pwa` (mode `generateSW`, `autoUpdate`)
   - [x] Précache 42 assets (shell + JS/CSS/images)
   - [x] Runtime caching: `NetworkFirst` pour API, `CacheFirst` pour images
4. Navigation mobile
   - [x] `MobileTabBar` fixe en bas (6 onglets patient, icônes + labels, min 56px touch)
   - [x] `TabsList` classique masqué sur mobile (`hidden md:grid`)
   - [x] Bottom spacer pour éviter le recouvrement du contenu
5. Offline limité
   - [ ] File d'attente des actions non critiques (brouillons photos)
   - [x] Écran fallback offline (`public/offline.html` + workbox `navigateFallback`)
6. Tests Lighthouse
   - [ ] Score PWA Lighthouse
   - [ ] Score accessibilité

## Phase C — Capacitor ✅ DONE
1. Initialiser Capacitor
   - [x] `capacitor.config.ts` créé (appId: `com.alignbygn.app`, webDir: `dist`)
   - [x] `@capacitor/core`, `@capacitor/cli` installés
   - [x] Plateformes Android (`android/`) et iOS (`ios/`) ajoutées
2. Brancher build web existant
   - [x] Sortie Vite `dist/` consommée par Capacitor (`npx cap sync`)
   - [x] 7 plugins Capacitor détectés et synchronisés
   - [x] Scripts npm ajoutés: `cap:sync`, `cap:build`, `cap:android`, `cap:ios`, `cap:run:android`, `cap:run:ios`, `cap:livereload`
3. Permissions natives
   - [x] Android: `CAMERA`, `READ_MEDIA_IMAGES`, `READ/WRITE_EXTERNAL_STORAGE` (legacy)
   - [x] iOS: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`
   - [x] Plugins: `@capacitor/camera`, `@capacitor/filesystem`, `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/haptics`, `@capacitor/app`, `@capacitor/keyboard`
4. Adapter capture photo mobile
   - [x] `src/lib/capacitor.ts` — détection plateforme (isNative, isIOS, isAndroid, isWeb)
   - [x] `src/hooks/useNativeCamera.ts` — hook unifié camera native (takePhoto, pickFromGallery, checkPermissions)
   - [x] `MultiAngleCapture.tsx` adapté: caméra native sur Capacitor, flux web (`getUserMedia`) sur navigateur
   - [x] `main.tsx` — initialisation StatusBar, SplashScreen, Keyboard sur natif
5. Packaging store
   - [ ] Signatures, icônes splash, privacy manifest, textes stores

## Phase D — Durcissement santé/production ⬜ TODO
1. Sécurité
   - [ ] Rotation tokens, durées session adaptées mobile
   - [ ] Chiffrement local minimal, pas de données patient en clair
2. Observabilité
   - [ ] Logs mobiles structurés + crash reporting
3. Conformité
   - [ ] Bannière consentement, rétention, suppression données
4. Tests non-régression mobile
   - [ ] Parcours: login, capture, analyse, alertes, changement aligneur

## 3) Backlog technique recommandé

Priorité haute:
- [x] Rendre la capture photo robuste sur iOS Safari et Android Chrome (Capacitor natif intégré)
- [x] Réduire le bundle initial et charger vidéos à la demande
- [ ] Gérer états réseau faible/intermittent

Priorité moyenne:
- [ ] Notifications push (rappels patient)
- [ ] Synchronisation background contrôlée

Priorité basse:
- [ ] Fonctionnalités natives avancées (widgets, intents, etc.)

## 4) KPI de succès mobile

- Taux de complétion capture photo (mobile)
- Temps moyen pour soumettre une session photo
- Taux d'erreur upload/analyse sur réseau cellulaire
- Crash-free sessions (si wrapper)
- Conversion installation PWA / app

## 5) Plan de lancement conseillé

1. Sprint 1: responsive + perf + QA devices
2. Sprint 2: PWA prête production
3. Sprint 3-4: Capacitor Android puis iOS
4. Go-live progressif avec feature flags

---

Décision recommandée: commencer immédiatement par Phase A + B (ROI le plus rapide), puis Phase C dès que les parcours patient/praticien sont stables en QA mobile.
