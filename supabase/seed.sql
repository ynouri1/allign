-- Comptes de test locaux (Supabase local uniquement)
-- Réappliqués à chaque: npm run supabase:reset

-- 1) Utilisateurs Auth (admin + praticien + 2 patients actifs + 1 patient traitement fini)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  email_confirmed_at,
  confirmation_sent_at,
  recovery_sent_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'admin.test@smile-tracker.local',
    crypt('AdminTest#2026', gen_salt('bf')),
    '',
    '',
    '',
    '',
    now(),
    now(),
    null,
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin Test"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'practitioner.test@smile-tracker.local',
    crypt('PraticienTest#2026', gen_salt('bf')),
    '',
    '',
    '',
    '',
    now(),
    now(),
    null,
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Praticien Test"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'patient1.test@smile-tracker.local',
    crypt('PatientTest#2026', gen_salt('bf')),
    '',
    '',
    '',
    '',
    now(),
    now(),
    null,
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Patient Test 1"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'patient2.test@smile-tracker.local',
    crypt('PatientTest#2026', gen_salt('bf')),
    '',
    '',
    '',
    '',
    now(),
    now(),
    null,
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Patient Test 2"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-5555-5555-5555-555555555555',
    'authenticated',
    'authenticated',
    'patient.finished@smile-tracker.local',
    crypt('PatientFini#2026', gen_salt('bf')),
    '',
    '',
    '',
    '',
    now(),
    now(),
    null,
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Patient Traitement Fini"}',
    now(),
    now()
  );

-- 2) Identités email
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at,
  last_sign_in_at
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin.test@smile-tracker.local"}',
    'email',
    'admin.test@smile-tracker.local',
    now(),
    now(),
    now()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"practitioner.test@smile-tracker.local"}',
    'email',
    'practitioner.test@smile-tracker.local',
    now(),
    now(),
    now()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"patient1.test@smile-tracker.local"}',
    'email',
    'patient1.test@smile-tracker.local',
    now(),
    now(),
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '44444444-4444-4444-4444-444444444444',
    '{"sub":"44444444-4444-4444-4444-444444444444","email":"patient2.test@smile-tracker.local"}',
    'email',
    'patient2.test@smile-tracker.local',
    now(),
    now(),
    now()
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '55555555-5555-5555-5555-555555555555',
    '{"sub":"55555555-5555-5555-5555-555555555555","email":"patient.finished@smile-tracker.local"}',
    'email',
    'patient.finished@smile-tracker.local',
    now(),
    now(),
    now()
  );

-- 3) Profils applicatifs
INSERT INTO public.profiles (id, user_id, email, full_name, phone)
VALUES
  ('11111111-aaaa-aaaa-aaaa-111111111111', '11111111-1111-1111-1111-111111111111', 'admin.test@smile-tracker.local', 'Admin Test', '+330600000001'),
  ('22222222-bbbb-bbbb-bbbb-222222222222', '22222222-2222-2222-2222-222222222222', 'practitioner.test@smile-tracker.local', 'Praticien Test', '+330600000002'),
  ('33333333-cccc-cccc-cccc-333333333333', '33333333-3333-3333-3333-333333333333', 'patient1.test@smile-tracker.local', 'Patient Test 1', '+330600000003'),
  ('44444444-dddd-dddd-dddd-444444444444', '44444444-4444-4444-4444-444444444444', 'patient2.test@smile-tracker.local', 'Patient Test 2', '+330600000004'),
  ('55555555-aaaa-aaaa-aaaa-555555555555', '55555555-5555-5555-5555-555555555555', 'patient.finished@smile-tracker.local', 'Patient Traitement Fini', '+330600000005');

-- 4) Rôles
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'practitioner'),
  ('33333333-3333-3333-3333-333333333333', 'patient'),
  ('44444444-4444-4444-4444-444444444444', 'patient'),
  ('55555555-5555-5555-5555-555555555555', 'patient');

-- 5) Entités métier
INSERT INTO public.practitioners (id, profile_id, specialty, license_number)
VALUES
  ('22222222-eeee-eeee-eeee-222222222222', '22222222-bbbb-bbbb-bbbb-222222222222', 'Orthodontie', 'RPPS-TEST-001');

INSERT INTO public.patients (
  id,
  profile_id,
  treatment_start,
  total_aligners,
  current_aligner,
  next_change_date,
  notes,
  attachment_teeth
)
VALUES
  (
    '33333333-ffff-ffff-ffff-333333333333',
    '33333333-cccc-cccc-cccc-333333333333',
    current_date - interval '14 days',
    20,
    2,
    current_date + interval '14 days',
    'Compte de test patient 1',
    ARRAY[11, 12, 21, 22]
  ),
  (
    '44444444-eeee-eeee-eeee-444444444444',
    '44444444-dddd-dddd-dddd-444444444444',
    current_date,
    18,
    1,
    current_date + interval '14 days',
    'Compte de test patient 2',
    ARRAY[13, 23, 33, 43]
  ),
  (
    '55555555-ffff-ffff-ffff-555555555555',
    '55555555-aaaa-aaaa-aaaa-555555555555',
    current_date - interval '196 days',
    14,
    14,
    NULL,
    'Patient ayant terminé son traitement',
    ARRAY[11, 21, 31, 41]
  );

INSERT INTO public.practitioner_patients (practitioner_id, patient_id)
VALUES
  ('22222222-eeee-eeee-eeee-222222222222', '33333333-ffff-ffff-ffff-333333333333'),
  ('22222222-eeee-eeee-eeee-222222222222', '44444444-eeee-eeee-eeee-444444444444'),
  ('22222222-eeee-eeee-eeee-222222222222', '55555555-ffff-ffff-ffff-555555555555');

-- 7) Session de port de gouttière — patient1 démarrée aujourd'hui à 00h00
INSERT INTO public.wear_time_sessions (id, patient_id, started_at, ended_at)
VALUES
  (
    'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    '33333333-ffff-ffff-ffff-333333333333',
    current_date AT TIME ZONE 'UTC',
    NULL
  );