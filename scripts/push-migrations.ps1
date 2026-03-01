# Script pour pousser les migrations vers Supabase Cloud
# À exécuter une fois que vous avez l'access token

# 1. Définir le token (remplacer YOUR_ACCESS_TOKEN)
$env:SUPABASE_ACCESS_TOKEN = "YOUR_ACCESS_TOKEN"

# 2. Lier le projet
supabase link --project-ref gpvpbmibhqieimurohwd

# 3. Pousser les migrations
supabase db push

# 4. Vérifier que tout est synchronisé
supabase db status

# 5. Optionnel : voir les différences
supabase db diff

Write-Host "✅ Migrations poussées vers la production !" -ForegroundColor Green