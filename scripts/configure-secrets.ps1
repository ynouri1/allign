# Configuration des secrets production Supabase
# À exécuter après avoir obtenu les vraies clés

# 1. GEMINI_API_KEY (nouvelle clé - PAS celle commitée dans le repo)
# Générer depuis https://makersuite.google.com/app/apikey
# supabase secrets set GEMINI_API_KEY=AIza_NOUVELLE_CLE_ICI

# 2. RESEND_API_KEY 
# Générer depuis https://resend.com/api-keys
# supabase secrets set RESEND_API_KEY=re_VOTRE_CLE_ICI

# 3. EMAIL_FROM (expéditeur vérifié)
supabase secrets set EMAIL_FROM="alignbygn <noreply@alignbygn.com>"

# 4. APP_URL (URL finale de production)
supabase secrets set APP_URL="https://app.alignbygn.com"

# 5. ALLOWED_ORIGINS (CORS)
supabase secrets set ALLOWED_ORIGINS="https://app.alignbygn.com,https://alignbygn.com"

# 6. ADMIN_BOOTSTRAP_TOKEN (token fort pour créer le premier admin)
# Générer un token fort : 
$token = [System.Web.Security.Membership]::GeneratePassword(64, 16)
Write-Host "Token généré : $token"
# supabase secrets set ADMIN_BOOTSTRAP_TOKEN=$token

Write-Host "⚠️  ACTIONS REQUISES :" -ForegroundColor Yellow
Write-Host "1. Générer NOUVELLE clé Gemini (révoquer l'ancienne)" -ForegroundColor Red  
Write-Host "2. Obtenir clé Resend API" -ForegroundColor Red
Write-Host "3. Configurer ces secrets avec les vraies valeurs" -ForegroundColor Red