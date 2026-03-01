# Simulateur mobile — AlignerTracker

Guide complet pour tester l'application AlignerTracker sur simulateur/émulateur Android et iOS.

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Option A — Test PWA dans un émulateur Android](#2-option-a--test-pwa-dans-un-émulateur-android)
3. [Option B — Test PWA dans le simulateur iOS](#3-option-b--test-pwa-dans-le-simulateur-ios)
4. [Option C — Chrome DevTools Device Mode (rapide)](#4-option-c--chrome-devtools-device-mode-rapide)
5. [Option D — Capacitor (futur)](#5-option-d--capacitor-futur)
6. [Scénarios de test recommandés](#6-scénarios-de-test-recommandés)
7. [Résolution de problèmes](#7-résolution-de-problèmes)

---

## 1) Prérequis

### Commun

| Outil | Version min. | Installation |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| npm / bun | dernière | inclus ou https://bun.sh |
| Vite dev server | — | `npm run dev` (port 8080) |

### Android

| Outil | Installation |
|---|---|
| Android Studio | https://developer.android.com/studio |
| Android SDK (API 33+) | via Android Studio > SDK Manager |
| Émulateur Android (AVD) | via Android Studio > Device Manager |
| ADB | inclus dans Android SDK Platform-Tools |

### iOS (macOS uniquement)

| Outil | Installation |
|---|---|
| Xcode 15+ | Mac App Store |
| Xcode Command Line Tools | `xcode-select --install` |
| Simulateur iOS | inclus dans Xcode |

---

## 2) Option A — Test PWA dans un émulateur Android

### 2.1 Créer un appareil virtuel (AVD)

1. Ouvrir **Android Studio** > **Device Manager** (icône téléphone en haut à droite)
2. Cliquer **Create Virtual Device**
3. Choisir un profil :
   - **Pixel 7** (flagship, 1080×2400) — test principal
   - **Pixel 4a** (milieu de gamme, 1080×2340) — test perf
   - **Nexus 7** (tablette 7") — test tablet layout
4. Sélectionner une image système : **API 34 (Android 14)** avec Google Play
5. Finaliser et lancer l'émulateur

### 2.2 Lancer le serveur de dev

```bash
# Depuis la racine du projet
npm run dev
```

Le serveur Vite démarre sur `http://localhost:8080`.

### 2.3 Accéder à l'app depuis l'émulateur

L'émulateur Android utilise `10.0.2.2` pour accéder au `localhost` de la machine hôte :

```
http://10.0.2.2:8080
```

Ouvrir **Chrome** dans l'émulateur et naviguer vers cette URL.

### 2.4 Tester l'installation PWA

1. Dans Chrome de l'émulateur, ouvrir `http://10.0.2.2:8080`
2. Attendre le chargement complet
3. Chrome affiche une bannière **"Ajouter à l'écran d'accueil"**
   - Sinon : menu ⋮ > **Installer l'application**
4. L'app apparaît sur l'écran d'accueil de l'émulateur
5. Lancer l'app installée — elle s'ouvre en mode **standalone** (sans barre d'adresse)

### 2.5 Debug à distance (Chrome DevTools)

```bash
# Vérifier que l'émulateur est connecté
adb devices

# Résultat attendu :
# emulator-5554   device
```

1. Sur le PC, ouvrir Chrome et naviguer vers `chrome://inspect/#devices`
2. L'onglet du navigateur de l'émulateur apparaît
3. Cliquer **Inspect** pour ouvrir DevTools complet (console, network, elements, etc.)

### 2.6 Simuler des conditions réseau

Dans Chrome DevTools (connecté à l'émulateur) :

- **Network** tab > **Throttling** : sélectionner `Slow 3G`, `Offline`, etc.
- Tester le comportement offline : la page `offline.html` doit s'afficher
- Tester la reconnexion : les données doivent se recharger

---

## 3) Option B — Test PWA dans le simulateur iOS

> ⚠️ **macOS uniquement** — Le simulateur iOS nécessite Xcode sur Mac.

### 3.1 Lancer le simulateur

```bash
# Lister les simulateurs disponibles
xcrun simctl list devices

# Démarrer un simulateur spécifique (exemple iPhone 15 Pro)
xcrun simctl boot "iPhone 15 Pro"

# Ouvrir le Simulator.app
open -a Simulator
```

Ou directement via **Xcode** > **Window** > **Devices and Simulators**.

**Appareils recommandés :**

| Appareil | Résolution | Intérêt |
|---|---|---|
| iPhone 15 Pro | 1179×2556 | Flagship, Dynamic Island |
| iPhone SE (3rd gen) | 750×1334 | Petit écran, test responsive |
| iPad Air (5th gen) | 1640×2360 | Tablet layout |

### 3.2 Lancer le serveur de dev

```bash
npm run dev
```

### 3.3 Accéder à l'app depuis le simulateur

Dans le simulateur iOS, le `localhost` de la machine hôte est directement accessible :

```
http://localhost:8080
```

Ouvrir **Safari** dans le simulateur et naviguer vers cette URL.

### 3.4 Tester l'installation PWA sur iOS

1. Dans Safari du simulateur, ouvrir `http://localhost:8080`
2. Appuyer sur le bouton **Partager** (icône carré + flèche vers le haut)
3. Sélectionner **Sur l'écran d'accueil**
4. Confirmer le nom et appuyer **Ajouter**
5. L'app apparaît sur l'écran d'accueil et s'ouvre en mode standalone

### 3.5 Debug Safari (Web Inspector)

1. **Sur le Mac** : Safari > Préférences > Avancées > cocher **"Afficher le menu Développement"**
2. Avec le simulateur ouvert et l'app chargée :
   - Safari (Mac) > **Développement** > **Simulator — iPhone 15 Pro** > page à inspecter
3. Web Inspector s'ouvre avec console, réseau, éléments, etc.

### 3.6 Simuler caméra sur iOS Simulator

Le simulateur iOS ne possède pas de vraie caméra. Pour tester la capture photo :

- Utiliser `navigator.mediaDevices.getUserMedia()` — le simulateur fournit un flux vidéo de test (barres de couleur)
- Pour des photos réalistes : glisser-déposer une image dans le simulateur (simule un ajout photo)
- Alternative : tester la capture sur un vrai device via câble USB

---

## 4) Option C — Chrome DevTools Device Mode (rapide)

Pour un test rapide **sans émulateur**, utiliser le mode appareil de Chrome :

### 4.1 Étapes

1. Lancer `npm run dev` et ouvrir `http://localhost:8080` dans Chrome
2. Ouvrir DevTools (`F12` ou `Ctrl+Shift+I`)
3. Cliquer l'icône **Toggle Device Toolbar** (📱) ou `Ctrl+Shift+M`
4. Sélectionner un appareil dans la liste déroulante :
   - **iPhone 14 Pro Max** (390×844, DPR 3)
   - **Pixel 7** (412×915, DPR 2.625)
   - **iPad Air** (820×1180, DPR 2)
5. Activer le mode **tactile** (touch simulation)

### 4.2 Limites

- ❌ Pas de vrai comportement PWA (install, service worker limité)
- ❌ Pas de simulation caméra native  
- ❌ Pas de rendu Safari réel (iOS rendering)
- ✅ Bon pour : responsive design, touch targets, layout, navigation

---

## 5) Option D — Capacitor (futur)

Quand la **Phase C** du roadmap mobile sera implémentée :

### 5.1 Installation Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "alignbygn" "com.alignbygn.app" --web-dir dist

# Ajouter les plateformes
npx cap add android
npx cap add ios
```

### 5.2 Build et lancement

```bash
# Build web
npm run build

# Synchroniser avec les plateformes natives
npx cap sync

# Ouvrir dans Android Studio
npx cap open android

# Ouvrir dans Xcode (macOS)
npx cap open ios
```

### 5.3 Live Reload (développement)

```bash
# Lancer le dev server
npm run dev

# Dans capacitor.config.ts, ajouter temporairement :
# server: { url: "http://<IP_LOCALE>:8080", cleartext: true }

npx cap run android --livereload --external
npx cap run ios --livereload --external
```

---

## 6) Scénarios de test recommandés

### Parcours critique patient

| # | Étape | Points de vérification |
|---|---|---|
| 1 | Login | Formulaire lisible, clavier ne cache pas les champs, touch targets ≥ 44px |
| 2 | Dashboard patient | Tabs mobiles visibles, scroll fluide, données chargées |
| 3 | Capture photo | Accès caméra, guidage vocal, prise de photo, preview |
| 4 | Upload + analyse | Indicateur de progression, gestion timeout réseau |
| 5 | Résultats analyse | Affichage score, alertes, recommandations |
| 6 | Timer gouttière | Start/stop, notification, persistance état |
| 7 | Changement aligneur | Workflow complet, validation |

### Tests techniques

| Test | Comment | Attendu |
|---|---|---|
| **Offline** | Activer mode avion dans l'émulateur | `offline.html` affiché, pas de crash |
| **Réseau lent** | Throttle 3G dans DevTools | Chargement progressif, pas de timeout immédiat |
| **Rotation écran** | Tourner l'émulateur (Ctrl+← / Ctrl+→) | Layout adapté, pas de contenu coupé |
| **Notch / safe area** | iPhone avec Dynamic Island | Contenu non masqué par le notch |
| **PWA standalone** | Installer et lancer depuis l'écran d'accueil | Pas de barre d'adresse, thème correct |
| **Taille de police** | Augmenter la taille système (Accessibilité) | Textes lisibles, pas de débordement |

### Matrice d'appareils cibles

| Appareil | OS | Priorité | Émulateur/Simulateur |
|---|---|---|---|
| Pixel 7 | Android 14 | Haute | Android Studio AVD |
| Samsung Galaxy A54 | Android 13 | Haute | AVD profil custom |
| iPhone 15 Pro | iOS 17 | Haute | Xcode Simulator |
| iPhone SE (3rd) | iOS 17 | Moyenne | Xcode Simulator |
| iPad Air | iPadOS 17 | Moyenne | Xcode Simulator |

---

## 7) Résolution de problèmes

### L'émulateur Android ne peut pas accéder au serveur

```bash
# Vérifier que le serveur écoute sur toutes les interfaces
# Dans vite.config.ts, host est déjà configuré sur "::" (toutes interfaces) ✅

# Vérifier la connexion
adb shell ping 10.0.2.2

# Si bloqué par le firewall Windows :
# Autoriser Node.js / Vite dans le pare-feu Windows
```

### Safari iOS Simulator ne charge pas la page

```bash
# Vérifier que le simulateur a accès réseau
# Le simulateur iOS partage la connexion réseau du Mac

# Essayer avec l'IP locale au lieu de localhost
ipconfig getifaddr en0
# Utiliser http://<IP>:8080
```

### Service Worker ne s'installe pas en dev

Le service worker est désactivé par défaut en mode développement. Pour tester :

```bash
# Build production puis preview
npm run build
npm run preview
# Ouvrir http://localhost:4173 dans l'émulateur
```

### La caméra ne fonctionne pas dans l'émulateur

- **Android** : L'émulateur peut simuler une caméra (webcam ou scène virtuelle).  
  AVD > Settings > Camera > Front/Back > sélectionner `Webcam0` ou `Emulated`
- **iOS** : Le simulateur fournit un flux de test (barres de couleur). Pour tester la vraie caméra, utiliser un appareil physique.

### Performance lente dans l'émulateur

```bash
# Android : activer l'accélération matérielle (HAXM ou Hypervisor)
# Vérifier dans Android Studio > SDK Manager > SDK Tools > Intel HAXM

# Allouer plus de RAM à l'AVD (recommandé : 2 Go+)
# AVD Manager > Edit > Show Advanced Settings > RAM
```

---

## Scripts utiles

```bash
# Lancer le serveur de dev accessible sur le réseau
npm run dev -- --host 0.0.0.0

# Build + preview pour tester le service worker
npm run build && npm run preview

# Lister les émulateurs Android disponibles
emulator -list-avds

# Lancer un émulateur Android en ligne de commande
emulator -avd Pixel_7_API_34

# Lancer le simulateur iOS
xcrun simctl boot "iPhone 15 Pro" && open -a Simulator

# Ouvrir une URL dans le simulateur iOS
xcrun simctl openurl booted http://localhost:8080

# Prendre un screenshot de l'émulateur Android
adb exec-out screencap -p > screenshot_android.png

# Prendre un screenshot du simulateur iOS
xcrun simctl io booted screenshot screenshot_ios.png
```

---

> **Note** : Pour une couverture de test complète, combiner les tests sur émulateur/simulateur avec des tests sur **appareils physiques** (au moins 1 Android + 1 iPhone). Les émulateurs ne reproduisent pas parfaitement les performances réelles, la gestion mémoire et les particularités des capteurs.
