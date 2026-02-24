import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { usePatients, usePractitioners, useAssignPatient } from '@/hooks/useAdminData';
import { Loader2, Link2, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AssignPatientDialog() {
  const [open, setOpen] = useState(false);
  const [practitionerId, setPractitionerId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [pracOpen, setPracOpen] = useState(false);
  const [patOpen, setPatOpen] = useState(false);

  const { data: patients } = usePatients();
  const { data: practitioners } = usePractitioners();
  const assignPatient = useAssignPatient();

  const selectedPractitioner = practitioners?.find((p) => p.id === practitionerId);
  const selectedPatient = patients?.find((p) => p.id === patientId);

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
            <Popover open={pracOpen} onOpenChange={setPracOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={pracOpen} className="w-full justify-between font-normal">
                  {selectedPractitioner
                    ? `${selectedPractitioner.profile.full_name}${selectedPractitioner.specialty ? ` (${selectedPractitioner.specialty})` : ''}`
                    : 'Sélectionner un praticien'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher un praticien…" />
                  <CommandList>
                    <CommandEmpty>Aucun praticien trouvé</CommandEmpty>
                    <CommandGroup>
                      {practitioners?.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.profile.full_name || ''}
                          onSelect={() => {
                            setPractitionerId(p.id === practitionerId ? '' : p.id);
                            setPracOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', practitionerId === p.id ? 'opacity-100' : 'opacity-0')} />
                          {p.profile.full_name} {p.specialty && `(${p.specialty})`}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Patient *</Label>
            <Popover open={patOpen} onOpenChange={setPatOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={patOpen} className="w-full justify-between font-normal">
                  {selectedPatient
                    ? selectedPatient.profile.full_name
                    : 'Sélectionner un patient'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher un patient…" />
                  <CommandList>
                    <CommandEmpty>Aucun patient trouvé</CommandEmpty>
                    <CommandGroup>
                      {patients?.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.profile.full_name || ''}
                          onSelect={() => {
                            setPatientId(p.id === patientId ? '' : p.id);
                            setPatOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', patientId === p.id ? 'opacity-100' : 'opacity-0')} />
                          {p.profile.full_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
