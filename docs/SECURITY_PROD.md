# Guide de Sécurité - Production Supabase

## Variables d'environnement
- Ne jamais exposer les mots de passe dans le code
- Utiliser des variables d'environnement pour toutes les clés
- Séparer les configurations dev/prod

## Politiques de sécurité (RLS)
- Row Level Security activé sur toutes les tables sensibles
- Accès patients limité à leurs propres données
- Accès praticiens limités aux patients assignés
- Admins avec droits complets mais auditables

## Clés API
- Publishable key: pour le frontend (publique)
- Service key: pour les opérations backend (privée)
- Limiter les droits selon les besoins

## Storage
- Politiques strictes sur le bucket aligner-photos
- Accès basé sur l'ownership et les assignments
- Chiffrement automatique en transit et au repos

## Audit et monitoring
- Logs d'accès activés
- Surveillance des tentatives d'accès non autorisées
- Backup automatique quotidien

## Vérifications à faire avant production
1. Tester toutes les politiques RLS
2. Vérifier les accès storage
3. Valider l'auth et les rôles
4. Effectuer un audit de sécurité complet