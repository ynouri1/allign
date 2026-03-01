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
