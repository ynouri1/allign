-- Test patient with FINISHED treatment (aligner 14/14)

-- 1) Auth user
INSERT INTO auth.users (instance_id, id, aud, role, encrypted_password, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '55555555-5555-5555-5555-555555555555',
  'authenticated', 'authenticated',
  crypt('PatientFini#2026', gen_salt('bf')),
  'patient.finished@smile-tracker.local',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(), now(), ''
);

-- 2) Auth identity
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '55555555-5555-5555-5555-555555555555',
  '{"sub":"55555555-5555-5555-5555-555555555555","email":"patient.finished@smile-tracker.local"}',
  'email',
  'patient.finished@smile-tracker.local',
  now(), now(), now()
);

-- 3) Profile
INSERT INTO public.profiles (id, user_id, email, full_name, phone)
VALUES (
  '55555555-aaaa-aaaa-aaaa-555555555555',
  '55555555-5555-5555-5555-555555555555',
  'patient.finished@smile-tracker.local',
  'Patient Traitement Fini',
  '+330600000005'
);

-- 4) Role
INSERT INTO public.user_roles (user_id, role)
VALUES ('55555555-5555-5555-5555-555555555555', 'patient');

-- 5) Patient record (finished: 14/14 aligners)
INSERT INTO public.patients (id, profile_id, treatment_start, total_aligners, current_aligner, next_change_date, notes, attachment_teeth)
VALUES (
  '55555555-ffff-ffff-ffff-555555555555',
  '55555555-aaaa-aaaa-aaaa-555555555555',
  current_date - interval '196 days',
  14,
  14,
  NULL,
  'Patient ayant terminé son traitement',
  ARRAY[11, 21, 31, 41]
);

-- 6) Assign to practitioner
INSERT INTO public.practitioner_patients (practitioner_id, patient_id)
VALUES ('22222222-eeee-eeee-eeee-222222222222', '55555555-ffff-ffff-ffff-555555555555');
