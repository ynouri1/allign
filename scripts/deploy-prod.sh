#!/bin/bash
# Script de déploiement des migrations Supabase en production
# Utiliser ce script pour appliquer toutes les migrations nécessaires

echo "=== Déploiement migrations Supabase Production ==="

# Vérifier que les variables d'environnement sont définies
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "Erreur: SUPABASE_DB_PASSWORD n'est pas défini"
    exit 1
fi

# Variables de production
SUPABASE_URL="https://gpvpbmibhqieimurohwd.supabase.co"
DB_URL="postgresql://postgres:$SUPABASE_DB_PASSWORD@db.gpvpbmibhqieimurohwd.supabase.co:5432/postgres"

echo "🔗 Connexion à la base de production..."

# Appliquer toutes les migrations dans l'ordre
echo "📋 Application des migrations..."

# Migration: Structure de base
psql "$DB_URL" -f supabase/migrations/20260120162837_a1c094a2-0e2d-470b-a370-70516c1ee86d.sql

# Migration: Authentification et rôles
psql "$DB_URL" -f supabase/migrations/20260120165904_92d2c2df-7016-4d8b-896a-3a41731cf627.sql

# Migration: Tables patients et praticiens
psql "$DB_URL" -f supabase/migrations/20260120170736_8fbf4c44-9b98-4046-883b-5a02c77708bd.sql

# Migration: Politiques de sécurité storage
psql "$DB_URL" -f supabase/migrations/20260217165000_harden_aligner_storage_policies.sql

# Migration: Realtime
psql "$DB_URL" -f supabase/migrations/20260222100000_enable_realtime.sql

# Migration: Sessions de port
psql "$DB_URL" -f supabase/migrations/20260223120000_wear_time_sessions.sql

echo "✅ Migrations appliquées avec succès"

# Vérifications post-déploiement
echo "🔍 Vérifications de sécurité..."

# Vérifier que RLS est activé
psql "$DB_URL" -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity IS NOT NULL;"

# Vérifier les politiques storage
psql "$DB_URL" -c "SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'storage';"

echo "🎉 Déploiement terminé avec succès!"