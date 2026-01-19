import { Patient, Alert, PatientPhoto, AlignerSchedule } from '@/types/patient';

const today = new Date();
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const subDays = (date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000);

export const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Marie Dupont',
    email: 'marie.dupont@email.com',
    phone: '+33 6 12 34 56 78',
    treatmentStart: subDays(today, 90),
    totalAligners: 24,
    currentAligner: 7,
    nextChangeDate: addDays(today, 3),
    lastPhotoDate: subDays(today, 2),
    alerts: [
      {
        id: 'a1',
        type: 'attachment_lost',
        severity: 'high',
        message: 'Taquet #3 (canine supérieure droite) possiblement décollé',
        createdAt: subDays(today, 1),
        resolved: false,
        photoId: 'p1'
      }
    ],
    photos: [
      {
        id: 'p1',
        url: '/placeholder.svg',
        takenAt: subDays(today, 2),
        alignerNumber: 7,
        analysisResult: {
          status: 'analyzed',
          attachmentStatus: 'missing',
          insertionQuality: 'good',
          gingivalHealth: 'healthy',
          overallScore: 72,
          recommendations: ['Consulter pour recoller le taquet #3', 'Continuer le port 22h/jour'],
          analyzedAt: subDays(today, 2)
        }
      }
    ]
  },
  {
    id: '2',
    name: 'Jean Martin',
    email: 'jean.martin@email.com',
    phone: '+33 6 98 76 54 32',
    treatmentStart: subDays(today, 45),
    totalAligners: 18,
    currentAligner: 4,
    nextChangeDate: addDays(today, 5),
    lastPhotoDate: subDays(today, 7),
    alerts: [
      {
        id: 'a2',
        type: 'photo_needed',
        severity: 'medium',
        message: 'Aucune photo depuis 7 jours',
        createdAt: today,
        resolved: false
      }
    ],
    photos: []
  },
  {
    id: '3',
    name: 'Sophie Bernard',
    email: 'sophie.bernard@email.com',
    phone: '+33 6 55 44 33 22',
    treatmentStart: subDays(today, 120),
    totalAligners: 20,
    currentAligner: 10,
    nextChangeDate: addDays(today, 1),
    lastPhotoDate: today,
    alerts: [],
    photos: [
      {
        id: 'p2',
        url: '/placeholder.svg',
        takenAt: today,
        alignerNumber: 10,
        analysisResult: {
          status: 'analyzed',
          attachmentStatus: 'ok',
          insertionQuality: 'good',
          gingivalHealth: 'healthy',
          overallScore: 95,
          recommendations: ['Excellent suivi, continuez ainsi!'],
          analyzedAt: today
        }
      }
    ]
  },
  {
    id: '4',
    name: 'Pierre Leroy',
    email: 'pierre.leroy@email.com',
    phone: '+33 6 11 22 33 44',
    treatmentStart: subDays(today, 60),
    totalAligners: 22,
    currentAligner: 5,
    nextChangeDate: subDays(today, 1),
    lastPhotoDate: subDays(today, 3),
    alerts: [
      {
        id: 'a3',
        type: 'missed_change',
        severity: 'high',
        message: 'Changement de gouttière en retard de 1 jour',
        createdAt: today,
        resolved: false
      },
      {
        id: 'a4',
        type: 'gingival_issue',
        severity: 'medium',
        message: 'Légère inflammation gingivale détectée',
        createdAt: subDays(today, 3),
        resolved: false,
        photoId: 'p3'
      }
    ],
    photos: [
      {
        id: 'p3',
        url: '/placeholder.svg',
        takenAt: subDays(today, 3),
        alignerNumber: 5,
        analysisResult: {
          status: 'analyzed',
          attachmentStatus: 'ok',
          insertionQuality: 'acceptable',
          gingivalHealth: 'mild_inflammation',
          overallScore: 68,
          recommendations: ['Améliorer le brossage interdentaire', 'Surveiller l\'inflammation'],
          analyzedAt: subDays(today, 3)
        }
      }
    ]
  }
];

export const currentPatient = mockPatients[0];

export const generateAlignerSchedule = (patient: Patient): AlignerSchedule[] => {
  const schedule: AlignerSchedule[] = [];
  const daysPerAligner = 14;
  
  for (let i = 1; i <= patient.totalAligners; i++) {
    const startDate = addDays(patient.treatmentStart, (i - 1) * daysPerAligner);
    const endDate = addDays(startDate, daysPerAligner - 1);
    
    let status: 'completed' | 'current' | 'upcoming';
    if (i < patient.currentAligner) {
      status = 'completed';
    } else if (i === patient.currentAligner) {
      status = 'current';
    } else {
      status = 'upcoming';
    }
    
    schedule.push({
      alignerNumber: i,
      startDate,
      endDate,
      status,
      daysPerAligner
    });
  }
  
  return schedule;
};
