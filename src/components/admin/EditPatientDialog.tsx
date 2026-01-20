import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdatePatient, PatientWithProfile } from '@/hooks/useAdminData';
import { Loader2 } from 'lucide-react';

interface EditPatientDialogProps {
  patient: PatientWithProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPatientDialog({ patient, open, onOpenChange }: EditPatientDialogProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    treatment_start: '',
    total_aligners: '',
    current_aligner: '',
    next_change_date: '',
    notes: '',
  });

  const updatePatient = useUpdatePatient();

  useEffect(() => {
    if (patient) {
      setFormData({
        full_name: patient.profile.full_name,
        phone: patient.profile.phone || '',
        treatment_start: patient.treatment_start || '',
        total_aligners: patient.total_aligners?.toString() || '',
        current_aligner: patient.current_aligner?.toString() || '',
        next_change_date: patient.next_change_date || '',
        notes: patient.notes || '',
      });
    }
  }, [patient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    await updatePatient.mutateAsync({
      patientId: patient.id,
      profileId: patient.profile_id,
      full_name: formData.full_name,
      phone: formData.phone || undefined,
      treatment_start: formData.treatment_start || undefined,
      total_aligners: formData.total_aligners ? parseInt(formData.total_aligners) : undefined,
      current_aligner: formData.current_aligner ? parseInt(formData.current_aligner) : undefined,
      next_change_date: formData.next_change_date || undefined,
      notes: formData.notes || undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le patient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Nom complet *</Label>
              <Input
                id="edit_full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Téléphone</Label>
              <Input
                id="edit_phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_treatment_start">Début du traitement</Label>
              <Input
                id="edit_treatment_start"
                type="date"
                value={formData.treatment_start}
                onChange={(e) => setFormData({ ...formData, treatment_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_next_change_date">Prochain changement</Label>
              <Input
                id="edit_next_change_date"
                type="date"
                value={formData.next_change_date}
                onChange={(e) => setFormData({ ...formData, next_change_date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_current_aligner">Aligneur actuel</Label>
              <Input
                id="edit_current_aligner"
                type="number"
                min="1"
                value={formData.current_aligner}
                onChange={(e) => setFormData({ ...formData, current_aligner: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_total_aligners">Total aligneurs</Label>
              <Input
                id="edit_total_aligners"
                type="number"
                min="0"
                value={formData.total_aligners}
                onChange={(e) => setFormData({ ...formData, total_aligners: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_notes">Notes</Label>
            <Textarea
              id="edit_notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes sur le patient..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updatePatient.isPending}>
              {updatePatient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
