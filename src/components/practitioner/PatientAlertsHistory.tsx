import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Camera, 
  MessageSquare,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PatientAlertsHistoryProps {
  patientId: string;
}

interface AlertWithResolver {
  id: string;
  type: string;
  severity: string;
  message: string;
  resolved: boolean;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_by_profile?: {
    full_name: string;
  } | null;
  photo?: {
    photo_url: string;
    aligner_number: number;
  } | null;
}

// Helper function to get signed URL
async function getSignedUrl(photoUrl: string): Promise<string> {
  try {
    const match = photoUrl.match(/aligner-photos\/(.+)$/);
    if (!match) return photoUrl;
    
    const filePath = match[1];
    const { data, error } = await supabase.storage
      .from('aligner-photos')
      .createSignedUrl(filePath, 3600);
    
    if (error || !data) return photoUrl;
    return data.signedUrl;
  } catch {
    return photoUrl;
  }
}

function usePatientAlerts(patientId: string) {
  return useQuery({
    queryKey: ['patient-alerts-history', patientId],
    queryFn: async () => {
      // First get the practitioner ID for the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return [];

      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!practitioner) return [];

      // Query alerts with practitioner_id filter to pass RLS
      const { data, error } = await supabase
        .from('practitioner_alerts')
        .select(`
          id,
          type,
          severity,
          message,
          resolved,
          resolved_at,
          resolution_notes,
          created_at,
          resolved_by,
          photo:patient_photos (
            photo_url,
            aligner_number
          )
        `)
        .eq('patient_id', patientId)
        .eq('practitioner_id', practitioner.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching patient alerts:', error);
        throw error;
      }

      // Get resolver profiles and signed URLs
      const alertsWithDetails = await Promise.all(
        (data || []).map(async (alert) => {
          let resolverProfile = null;
          if (alert.resolved_by) {
            const { data: resolverData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', alert.resolved_by)
              .single();
            resolverProfile = resolverData;
          }

          let photoWithSignedUrl = alert.photo;
          if (alert.photo?.photo_url) {
            const signedUrl = await getSignedUrl(alert.photo.photo_url);
            photoWithSignedUrl = { ...alert.photo, photo_url: signedUrl };
          }

          return {
            ...alert,
            resolved_by_profile: resolverProfile,
            photo: photoWithSignedUrl,
          } as AlertWithResolver;
        })
      );

      return alertsWithDetails;
    },
    enabled: !!patientId,
  });
}

export function PatientAlertsHistory({ patientId }: PatientAlertsHistoryProps) {
  const { data: alerts, isLoading } = usePatientAlerts(patientId);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'attachment_lost':
        return <XCircle className="h-4 w-4" />;
      case 'poor_insertion':
      case 'gingival_issue':
        return <AlertTriangle className="h-4 w-4" />;
      case 'missed_change':
        return <Clock className="h-4 w-4" />;
      case 'photo_needed':
        return <Camera className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      attachment_lost: 'Taquet perdu',
      poor_insertion: 'Mauvaise insertion',
      gingival_issue: 'Problème gingival',
      missed_change: 'Changement manqué',
      photo_needed: 'Photo requise'
    };
    return labels[type] || type;
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">Haute</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-xs">Moyenne</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Basse</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-muted rounded-full mb-2" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle className="h-12 w-12 mx-auto text-success mb-3" />
        <p className="text-muted-foreground">
          Aucune alerte pour ce patient
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <h3 className="font-semibold">Historique des alertes</h3>
      </div>
      <ScrollArea className="max-h-96">
        <div className="divide-y divide-border/50">
          {alerts.map((alert) => (
            <div key={alert.id} className="p-4">
              {/* Header */}
              <div className="flex items-start gap-3 mb-2">
                <div className={cn(
                  "mt-0.5 p-1.5 rounded-full",
                  alert.resolved 
                    ? "bg-success/10 text-success" 
                    : alert.severity === 'high' 
                      ? "bg-destructive/10 text-destructive"
                      : "bg-warning/10 text-warning"
                )}>
                  {alert.resolved ? <CheckCircle className="h-4 w-4" /> : getAlertIcon(alert.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium">
                      {getAlertTypeLabel(alert.type)}
                    </span>
                    {getSeverityBadge(alert.severity)}
                    {alert.resolved && (
                      <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                        Résolu
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(alert.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>

                {/* Photo thumbnail if available */}
                {alert.photo?.photo_url && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                    <img
                      src={alert.photo.photo_url}
                      alt="Photo associée"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Alert message */}
              <p className="text-sm text-foreground mb-2 ml-9">
                {alert.message}
              </p>

              {/* Resolution info */}
              {alert.resolved && (
                <div className="ml-9 mt-3 p-3 bg-success/5 border border-success/20 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-success mb-1">
                    <CheckCircle className="h-3 w-3" />
                    <span className="font-medium">
                      Résolu le {format(new Date(alert.resolved_at!), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </span>
                    {alert.resolved_by_profile && (
                      <>
                        <span className="text-muted-foreground">par</span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {alert.resolved_by_profile.full_name}
                        </span>
                      </>
                    )}
                  </div>
                  
                  {/* Resolution notes */}
                  {alert.resolution_notes && (
                    <div className="mt-2 flex items-start gap-2">
                      <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground italic">
                        "{alert.resolution_notes}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}