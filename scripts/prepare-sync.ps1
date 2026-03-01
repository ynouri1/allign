# Script de préparation pour la synchronisation prod
# Exporte le schéma et prépare les données pour la production

# Variables
$DEV_DB_URL = "postgresql://postgres:postgres@localhost:54322/postgres"
$EXPORT_DIR = "exports/prod-sync"

# Créer le dossier d'export
New-Item -ItemType Directory -Force -Path $EXPORT_DIR

Write-Host "=== Préparation synchronisation production ===" -ForegroundColor Green

# 1. Exporter le schéma de la base de dev
Write-Host "📋 Export du schéma..." -ForegroundColor Yellow
pg_dump --schema-only --no-owner --no-privileges $DEV_DB_URL > "$EXPORT_DIR/schema.sql"

# 2. Exporter les données de référence (non sensibles)
Write-Host "📋 Export des données de référence..." -ForegroundColor Yellow

# Exporter les rôles et permissions de base
pg_dump --data-only --table=public.app_roles $DEV_DB_URL > "$EXPORT_DIR/roles.sql"

# 3. Créer un script de validation
Write-Host "📋 Création du script de validation..." -ForegroundColor Yellow

@"
-- Validation script pour la production
-- Vérifier que toutes les tables existent et ont les bonnes politiques

-- Vérifier les tables principales
SELECT 'patients' as table_name, count(*) as row_count FROM public.patients;
SELECT 'practitioners' as table_name, count(*) as row_count FROM public.practitioners;
SELECT 'practitioner_patients' as table_name, count(*) as row_count FROM public.practitioner_patients;

-- Vérifier que RLS est activé
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled,
  enablerls
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('patients', 'practitioners', 'aligner_photos', 'wear_time_sessions');

-- Vérifier les politiques storage
SELECT 
  policyname,
  tablename,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'storage';

-- Vérifier les fonctions critiques
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_profile_id', 'has_role');
"@ > "$EXPORT_DIR/validate.sql"

# 4. Liste des migrations à appliquer en ordre
Write-Host "📋 Génération de la liste des migrations..." -ForegroundColor Yellow

$migrations = @(
  "20260120162837_a1c094a2-0e2d-470b-a370-70516c1ee86d.sql",
  "20260120165904_92d2c2df-7016-4d8b-896a-3a41731cf627.sql", 
  "20260120170736_8fbf4c44-9b98-4046-883b-5a02c77708bd.sql",
  "20260120174654_f36d0ba3-1952-497c-a232-746fc074042b.sql",
  "20260121105123_a103ffc8-280d-4403-a964-3638d3b9779c.sql",
  "20260121140222_3172b9e3-c3ff-409f-b673-38e148e44411.sql",
  "20260124131400_d352de94-a4da-4139-9fa6-822521cff76a.sql",
  "20260124131735_6bf1a2e5-c8a3-406c-9479-21da0763b3a2.sql",
  "20260124134449_08841d31-38dd-4c5f-a673-c84eeabd7fd3.sql",
  "20260124161101_e8092941-d4cc-4bc7-9a7a-3f0a37eccbfc.sql",
  "20260217165000_harden_aligner_storage_policies.sql",
  "20260222100000_enable_realtime.sql",
  "20260223120000_wear_time_sessions.sql"
)

$migrations | Out-File -FilePath "$EXPORT_DIR/migrations_order.txt"

Write-Host "✅ Synchronisation préparée dans le dossier: $EXPORT_DIR" -ForegroundColor Green
Write-Host "📁 Fichiers générés:" -ForegroundColor Cyan
Write-Host "  - schema.sql (structure complète)" -ForegroundColor White
Write-Host "  - roles.sql (données de référence)" -ForegroundColor White  
Write-Host "  - validate.sql (script de validation)" -ForegroundColor White
Write-Host "  - migrations_order.txt (ordre d'application)" -ForegroundColor White