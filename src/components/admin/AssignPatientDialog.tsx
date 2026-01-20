import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePatients, usePractitioners, useAssignPatient } from '@/hooks/useAdminData';
import { Loader2, Link2 } from 'lucide-react';

export function AssignPatientDialog() {
  const [open, setOpen] = useState(false);
  const [practitionerId, setPractitionerId] = useState('');
  const [patientId, setPatientId] = useState('');

  const { data: patients } = usePatients();
  const { data: practitioners } = usePractitioners();
  const assignPatient = useAssignPatient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await assignPatient.mutateAsync({
      practitioner_id: practitionerId,
      patient_id: patientId,
    });

    setPractitionerId('');
    setPatientId('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Link2 className="mr-2 h-4 w-4" />
          Assigner un patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assigner un patient à un praticien</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Praticien *</Label>
            <Select value={practitionerId} onValueChange={setPractitionerId} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un praticien" />
              </SelectTrigger>
              <SelectContent>
                {practitioners?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.profile.full_name} {p.specialty && `(${p.specialty})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un patient" />
              </SelectTrigger>
              <SelectContent>
                {patients?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.profile.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={assignPatient.isPending || !practitionerId || !patientId}
            >
              {assignPatient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assigner
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
