/**
 * Shared mock fixtures for tests.
 */

export const MOCK_USER_ID = 'user-uuid-1';
export const MOCK_PROFILE_ID = 'profile-uuid-1';
export const MOCK_PATIENT_ID = 'patient-uuid-1';
export const MOCK_PRACTITIONER_ID = 'practitioner-uuid-1';
export const MOCK_PHOTO_ID = 'photo-uuid-1';
export const MOCK_ALERT_ID = 'alert-uuid-1';

export const mockUser = {
  id: MOCK_USER_ID,
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00.000Z',
};

export const mockProfile = {
  id: MOCK_PROFILE_ID,
  user_id: MOCK_USER_ID,
  full_name: 'Jean Dupont',
  email: 'test@example.com',
  phone: '+33612345678',
};

export const mockPatient = {
  id: MOCK_PATIENT_ID,
  profile_id: MOCK_PROFILE_ID,
  treatment_start: '2026-01-15',
  total_aligners: 20,
  current_aligner: 5,
  next_change_date: '2026-03-01',
  notes: null,
  attachment_teeth: [11, 21, 33],
};

export const mockPractitioner = {
  id: MOCK_PRACTITIONER_ID,
  profile_id: MOCK_PROFILE_ID,
  specialty: 'Orthodontie',
  license_number: 'FR-12345',
};

export const mockPhoto = {
  id: MOCK_PHOTO_ID,
  patient_id: MOCK_PATIENT_ID,
  photo_url: 'https://test.supabase.co/storage/v1/object/public/aligner-photos/patient-uuid-1/photo.jpg',
  angle: 'front',
  aligner_number: 5,
  brightness_score: 72,
  sharpness_score: 65,
  framing_score: 80,
  quality_overall: 72,
  analysis_status: 'analyzed',
  attachment_status: 'ok',
  insertion_quality: 'good',
  gingival_health: 'healthy',
  overall_score: 88,
  recommendations: ['Continuer le port régulier'],
  analyzed_at: '2026-02-18T10:00:00.000Z',
  created_at: '2026-02-18T09:00:00.000Z',
  updated_at: '2026-02-18T10:00:00.000Z',
};

export const mockAlert = {
  id: MOCK_ALERT_ID,
  patient_id: MOCK_PATIENT_ID,
  photo_id: MOCK_PHOTO_ID,
  practitioner_id: MOCK_PRACTITIONER_ID,
  type: 'attachment_lost' as const,
  severity: 'high' as const,
  message: 'Attache manquante détectée sur dent 21',
  resolved: false,
  resolved_at: null,
  resolved_by: null,
  resolution_notes: null,
  created_at: '2026-02-18T10:30:00.000Z',
  updated_at: '2026-02-18T10:30:00.000Z',
};

export const mockAlertWithJoins = {
  ...mockAlert,
  patient: {
    id: MOCK_PATIENT_ID,
    current_aligner: 5,
    total_aligners: 20,
    profile: {
      full_name: 'Jean Dupont',
      email: 'test@example.com',
    },
  },
  photo: {
    id: MOCK_PHOTO_ID,
    photo_url: 'https://test.supabase.co/storage/v1/object/public/aligner-photos/patient-uuid-1/photo.jpg',
    angle: 'front',
    aligner_number: 5,
    overall_score: 88,
    attachment_status: 'ok',
    insertion_quality: 'good',
    gingival_health: 'healthy',
    recommendations: ['Continuer le port régulier'],
    analyzed_at: '2026-02-18T10:00:00.000Z',
    created_at: '2026-02-18T09:00:00.000Z',
  },
};

export const mockAlignerChange = {
  id: 'change-uuid-1',
  patient_id: MOCK_PATIENT_ID,
  from_aligner: 4,
  to_aligner: 5,
  confirmed_at: '2026-02-15T14:00:00.000Z',
};

export const mockAssignment = {
  id: 'assignment-uuid-1',
  practitioner_id: MOCK_PRACTITIONER_ID,
  patient_id: MOCK_PATIENT_ID,
  assigned_at: '2026-01-20T00:00:00.000Z',
  practitioner: { profile: { full_name: 'Dr. Martin' } },
  patient: { profile: { full_name: 'Jean Dupont' } },
};
