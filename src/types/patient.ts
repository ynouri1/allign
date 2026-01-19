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
