import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdatePractitioner, PractitionerWithProfile } from '@/hooks/useAdminData';
import { Loader2 } from 'lucide-react';

interface EditPractitionerDialogProps {
  practitioner: PractitionerWithProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPractitionerDialog({ practitioner, open, onOpenChange }: EditPractitionerDialogProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    specialty: '',
    license_number: '',
  });

  const updatePractitioner = useUpdatePractitioner();

  useEffect(() => {
    if (practitioner) {
      setFormData({
        full_name: practitioner.profile.full_name,
        phone: practitioner.profile.phone || '',
        specialty: practitioner.specialty || '',
        license_number: practitioner.license_number || '',
      });
    }
  }, [practitioner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practitioner) return;

    await updatePractitioner.mutateAsync({
      practitionerId: practitioner.id,
      profileId: practitioner.profile_id,
      full_name: formData.full_name,
      phone: formData.phone || undefined,
      specialty: formData.specialty || undefined,
      license_number: formData.license_number || undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le praticien</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_pract_full_name">Nom complet *</Label>
              <Input
                id="edit_pract_full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_pract_phone">Téléphone</Label>
              <Input
                id="edit_pract_phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_pract_specialty">Spécialité</Label>
              <Input
                id="edit_pract_specialty"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                placeholder="Orthodontie"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_pract_license_number">N° de licence</Label>
              <Input
                id="edit_pract_license_number"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updatePractitioner.isPending}>
              {updatePractitioner.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
