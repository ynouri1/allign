# 🚀 Pipeline CI/CD - AlignerTracker

## Vue d'ensemble

Configuration complète de CI/CD avec GitHub Actions pour automatiser le déploiement de l'application AlignerTracker.

## 🔧 Workflows disponibles

### 1. Pipeline Vercel (`ci-cd.yml`)
- **Déclencheurs**: Push sur `main` et `develop`, PR vers `main`
- **Jobs**:
  - 🔍 **Lint & Test**: ESLint + Tests unitaires
  - 🏗️ **Build**: Build de production avec variables d'env
  - 🚀 **Deploy Production**: Deploy sur Vercel (branche `main`)
  - 🧪 **Deploy Staging**: Deploy preview (branche `develop`)

### 2. Pipeline Netlify (`ci-cd-netlify.yml`)
- Alternative Netlify pour l'hébergement
- Structure similaire avec deploy Netlify

## 📦 Configuration required

### Secrets GitHub à configurer :

#### Pour Vercel:
```bash
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id  
VERCEL_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=https://gpvpbmibhqieimurohwd.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

#### Pour Netlify:
```bash
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=your_site_id
VITE_SUPABASE_URL=https://gpvpbmibhqieimurohwd.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 🏗️ Optimisations Build

### Vendor Chunks Split
La configuration Vite optimise les bundles :

- **vendor-react**: React, React DOM, React Router
- **vendor-ui**: Composants Radix UI + utilitaires CSS
- **vendor-supabase**: Client Supabase
- **vendor-3d**: Three.js, React Three Fiber
- **vendor-charts**: Recharts pour graphiques
- **vendor-utils**: Date-fns, Zod, React Hook Form
- **vendor-mobile**: Capacitor plugins

### Scripts disponibles
```bash
npm run ci              # Pipeline rapide : type-check + test + build
npm run ci:strict       # Pipeline complet : lint + type-check + test + build  
npm run build:analyze   # Build + analyse des bundles
npm run type-check      # Vérification TypeScript
```

## 🛡️ Sécurité

### Headers configurés (Vercel/Netlify)
- **CSP**: Content Security Policy strict
- **HSTS**: HTTPS forcé avec preload
- **X-Frame-Options**: Protection contre clickjacking
- **X-XSS-Protection**: Protection XSS
- **Permissions-Policy**: Permissions limitées

### Cache Strategy
- **Assets** (JS/CSS): 1 an immutable
- **Service Worker**: 0 max-age, must-revalidate
- **Manifest**: 1 an immutable

## 🚀 Utilisation

### Deployment automatique
1. **Production**: Push vers `main` → Deploy automatique
2. **Staging**: Push vers `develop` → Preview deploy
3. **Pull Requests**: Build de test + validation

### Deployment manuel
```bash
# Vercel
npm run build && vercel --prod

# Netlify  
npm run build && netlify deploy --prod --dir=dist
```

## 📊 Monitoring

Le pipeline génère automatiquement :
- **Coverage reports** (tests)
- **Bundle analysis** (taille des chunks)
- **Build artifacts** (dist/ packagé)
- **déploiement notifications**

## 🔧 Maintenance

### Mise à jour des dépendances
```bash
npm audit fix              # Corrections sécurité
npm update                 # Mise à jour patches
```

### Debug pipeline
- Vérifier les **Secrets GitHub** dans Settings > Secrets
- Consulter les **logs GitHub Actions** pour diagnostics
- Test local avec `npm run ci` avant push

## 📝 Prochaines étapes

Après configuration des secrets :
1. **Test du pipeline**: Push sur develop
2. **Validation staging**: Vérifier le preview deploy
3. **Go-live**: Merge vers main pour production

---
*Pipeline optimisé pour AlignerTracker Sprint 2 🎯*