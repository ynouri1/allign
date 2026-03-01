# Script de déploiement PowerShell pour la production

Write-Host "🚀 === Déploiement Production Smile Tracker ===" -ForegroundColor Green

# 1. Vérification des prérequis
Write-Host "✅ Vérification des prérequis..." -ForegroundColor Yellow

if (-not (Test-Path ".env.production")) {
    Write-Host "❌ Fichier .env.production manquant" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".env.docker.prod")) {
    Write-Host "❌ Fichier .env.docker.prod manquant" -ForegroundColor Red
    exit 1
}

# 2. Build de production
Write-Host "🔨 Build de l'application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Échec du build" -ForegroundColor Red
    exit 1
}

# 3. Test des composants critiques
Write-Host "🧪 Tests des composants..." -ForegroundColor Yellow
npm run test

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Échec des tests" -ForegroundColor Red
    exit 1
}

# 4. Vérification de la configuration Supabase
Write-Host "🔍 Vérification de la configuration..." -ForegroundColor Yellow

$envContent = Get-Content ".env.production"
if (-not ($envContent -match "gpvpbmibhqieimurohwd.supabase.co")) {
    Write-Host "❌ URL Supabase incorrecte dans .env.production" -ForegroundColor Red
    exit 1
}

# 5. Instructions de déploiement par plateforme
Write-Host "📋 === Instructions de déploiement ===" -ForegroundColor Cyan

Write-Host "📦 Vercel:" -ForegroundColor White
Write-Host "  1. vercel env add VITE_SUPABASE_URL https://gpvpbmibhqieimurohwd.supabase.co production" -ForegroundColor Gray
Write-Host "  2. vercel env add VITE_SUPABASE_ANON_KEY sb_publishable_F0v3VCdab8MNapaazSG2bA_MGf0iatB production" -ForegroundColor Gray
Write-Host "  3. vercel env add SUPABASE_SERVICE_ROLE_KEY [YOUR_SERVICE_KEY] production" -ForegroundColor Gray
Write-Host "  4. vercel deploy --prod" -ForegroundColor Gray

Write-Host "🐳 Docker:" -ForegroundColor White
Write-Host "  1. Remplacer [YOUR-PASSWORD] dans .env.docker.prod" -ForegroundColor Gray
Write-Host "  2. docker build -t smile-tracker-prod ." -ForegroundColor Gray
Write-Host "  3. docker run --env-file .env.docker.prod -p 3000:3000 smile-tracker-prod" -ForegroundColor Gray

Write-Host "📱 Netlify:" -ForegroundColor White
Write-Host "  1. Aller dans Site settings > Environment variables" -ForegroundColor Gray
Write-Host "  2. Ajouter toutes les variables VITE_ depuis .env.production" -ForegroundColor Gray
Write-Host "  3. Redéployer depuis le dashboard" -ForegroundColor Gray

Write-Host "✅ === Préparation terminée ===" -ForegroundColor Green
Write-Host "📁 Fichiers de déploiement créés:" -ForegroundColor Cyan
Write-Host "  - dist/ (build de production)" -ForegroundColor White
Write-Host "  - .env.production (Vercel/Netlify)" -ForegroundColor White
Write-Host "  - .env.docker.prod (Docker)" -ForegroundColor White
Write-Host "  - docs/ENV_PRODUCTION.md (documentation)" -ForegroundColor White