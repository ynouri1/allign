#!/bin/bash
# Script de déploiement complet pour la production

echo "🚀 === Déploiement Production Smile Tracker ===" 

# 1. Vérification des prérequis
echo "✅ Vérification des prérequis..."

if [ ! -f ".env.production" ]; then
    echo "❌ Fichier .env.production manquant"
    exit 1
fi

if [ ! -f ".env.docker.prod" ]; then
    echo "❌ Fichier .env.docker.prod manquant"
    exit 1
fi

# 2. Build de production
echo "🔨 Build de l'application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Échec du build"
    exit 1
fi

# 3. Test des composants critiques
echo "🧪 Tests des composants..."
npm run test

if [ $? -ne 0 ]; then
    echo "❌ Échec des tests"
    exit 1
fi

# 4. Vérification de la configuration Supabase
echo "🔍 Vérification de la configuration..."

# Vérifier que les URLs sont correctes
grep -q "gpvpbmibhqieimurohwd.supabase.co" .env.production
if [ $? -ne 0 ]; then
    echo "❌ URL Supabase incorrecte dans .env.production"
    exit 1
fi

# 5. Instructions de déploiement par plateforme
echo "📋 === Instructions de déploiement ==="

echo "📦 Vercel:"
echo "  1. vercel env add VITE_SUPABASE_URL https://gpvpbmibhqieimurohwd.supabase.co production"
echo "  2. vercel env add VITE_SUPABASE_ANON_KEY sb_publishable_F0v3VCdab8MNapaazSG2bA_MGf0iatB production"
echo "  3. vercel env add SUPABASE_SERVICE_ROLE_KEY [YOUR_SERVICE_KEY] production"
echo "  4. vercel deploy --prod"

echo "🐳 Docker:"
echo "  1. Remplacer [YOUR-PASSWORD] dans .env.docker.prod"
echo "  2. docker build -t smile-tracker-prod ."
echo "  3. docker run --env-file .env.docker.prod -p 3000:3000 smile-tracker-prod"

echo "📱 Netlify:"
echo "  1. Aller dans Site settings > Environment variables"
echo "  2. Ajouter toutes les variables VITE_ depuis .env.production"
echo "  3. Redéployer depuis le dashboard"

echo "✅ === Préparation terminée ==="
echo "📁 Fichiers de déploiement créés:"
echo "  - dist/ (build de production)"
echo "  - .env.production (Vercel/Netlify)"
echo "  - .env.docker.prod (Docker)"
echo "  - docs/ENV_PRODUCTION.md (documentation)"