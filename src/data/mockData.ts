import { Patient, Alert, PatientPhoto, AlignerSchedule } from '@/types/patient';

const today = new Date();
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const subDays = (date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000);

export const mockPatients: Patient[] = [];

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
