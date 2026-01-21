import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePatient } from '@/hooks/useAdminData';
import { Loader2, UserPlus } from 'lucide-react';
import { TeethSelector3D } from './TeethSelector3D';

export function CreatePatientDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    treatment_start: '',
    total_aligners: '',
  });
  const [attachmentTeeth, setAttachmentTeeth] = useState<number[]>([]);

  const createPatient = useCreatePatient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createPatient.mutateAsync({
      email: formData.email,
      password: formData.password,
      full_name: formData.full_name,
      phone: formData.phone || undefined,
      treatment_start: formData.treatment_start || undefined,
      total_aligners: formData.total_aligners ? parseInt(formData.total_aligners) : undefined,
      attachment_teeth: attachmentTeeth,
    });

    setFormData({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      treatment_start: '',
      total_aligners: '',
    });
    setAttachmentTeeth([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary">
          <UserPlus className="mr-2 h-4 w-4" />
          Ajouter un patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau patient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nom complet *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="treatment_start">Début du traitement</Label>
              <Input
                id="treatment_start"
                type="date"
                value={formData.treatment_start}
                onChange={(e) => setFormData({ ...formData, treatment_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_aligners">Nombre d'aligneurs</Label>
              <Input
                id="total_aligners"
                type="number"
                min="0"
                value={formData.total_aligners}
                onChange={(e) => setFormData({ ...formData, total_aligners: e.target.value })}
              />
            </div>
          </div>

          {/* 3D Teeth Selector for Attachments */}
          <div className="space-y-2">
            <Label>Taquets (attachements)</Label>
            <TeethSelector3D
              selectedTeeth={attachmentTeeth}
              onTeethChange={setAttachmentTeeth}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createPatient.isPending}>
              {createPatient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
