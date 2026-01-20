export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  treatmentStart: Date;
  totalAligners: number;
  currentAligner: number;
  nextChangeDate: Date;
  lastPhotoDate?: Date;
  alerts: Alert[];
  photos: PatientPhoto[];
}

export interface Alert {
  id: string;
  type: 'attachment_lost' | 'poor_insertion' | 'gingival_issue' | 'missed_change' | 'photo_needed';
  severity: 'low' | 'medium' | 'high';
  message: string;
  createdAt: Date;
  resolved: boolean;
  photoId?: string;
}

export interface PatientPhoto {
  id: string;
  url: string;
  takenAt: Date;
  alignerNumber: number;
  angle?: PhotoAngle;
  qualityScore?: PhotoQualityScore;
  analysisResult?: PhotoAnalysis;
}

export interface PhotoAnalysis {
  status: 'pending' | 'analyzed' | 'error';
  attachmentStatus: 'ok' | 'missing' | 'partial';
  insertionQuality: 'good' | 'poor' | 'acceptable';
  gingivalHealth: 'healthy' | 'mild_inflammation' | 'inflammation';
  overallScore: number;
  recommendations: string[];
  analyzedAt: Date;
}

export interface AlignerSchedule {
  alignerNumber: number;
  startDate: Date;
  endDate: Date;
  status: 'completed' | 'current' | 'upcoming';
  daysPerAligner: number;
}

// Photo capture types
export type PhotoAngle = 'front' | 'left' | 'right' | 'occlusal';

export interface PhotoQualityScore {
  brightness: number; // 0-100
  sharpness: number; // 0-100
  framing: number; // 0-100
  overall: number; // 0-100
  issues: PhotoQualityIssue[];
}

export interface PhotoQualityIssue {
  type: 'too_dark' | 'too_bright' | 'blurry' | 'bad_framing' | 'too_close' | 'too_far';
  message: string;
  severity: 'warning' | 'error';
}

export interface PhotoAngleConfig {
  angle: PhotoAngle;
  label: string;
  description: string;
  icon: string;
  required: boolean;
}

export const PHOTO_ANGLES: PhotoAngleConfig[] = [
  {
    angle: 'front',
    label: 'Vue frontale',
    description: 'Sourire de face, gouttières bien visibles',
    icon: '😁',
    required: true,
  },
  {
    angle: 'right',
    label: 'Côté droit',
    description: 'Profil droit avec gouttières visibles',
    icon: '👉',
    required: true,
  },
  {
    angle: 'left',
    label: 'Côté gauche',
    description: 'Profil gauche avec gouttières visibles',
    icon: '👈',
    required: true,
  },
  {
    angle: 'occlusal',
    label: 'Vue occlusale',
    description: 'Vue du dessus (optionnel)',
    icon: '⬇️',
    required: false,
  },
];
