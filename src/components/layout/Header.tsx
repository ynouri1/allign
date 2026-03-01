import { Bell, Menu, User, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface AlertItem {
  id: string;
  type: string;
  severity: string;
  message: string;
  resolved: boolean;
  created_at: string;
}

interface HeaderProps {
  userType?: 'patient' | 'practitioner';
  userRole?: 'admin' | 'practitioner' | 'patient';
  userName: string;
  alertCount?: number;
  alerts?: AlertItem[];
  onMenuClick?: () => void;
  onLogout?: () => void;
}

export function Header({ userType, userRole, userName, alertCount = 0, alerts = [], onMenuClick, onLogout }: HeaderProps) {
  const displayRole = userRole || userType || 'patient';
  const roleLabel = displayRole === 'admin' ? 'Administration' : displayRole === 'practitioner' ? 'Espace Praticien' : 'Espace Patient';

  const severityIcon = (severity: string) => {
    if (severity === 'high') return <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />;
    if (severity === 'medium') return <Info className="h-4 w-4 text-amber-500 shrink-0" />;
    return <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `Il y a ${diffD}j`;
  };

  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const displayAlerts = unresolvedAlerts.length > 0 ? unresolvedAlerts : alerts;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary overflow-hidden">
              <img src="/favicon.png" alt="alignbygn" className="h-7 w-7 object-contain" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gradient">alignbygn</h1>
            <p className="text-xs text-muted-foreground">
                {roleLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {alertCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {alertCount > 0 && (
                  <p className="text-xs text-muted-foreground">{alertCount} non résolue{alertCount > 1 ? 's' : ''}</p>
                )}
              </div>
              <ScrollArea className="max-h-80">
                {displayAlerts.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune notification</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {displayAlerts.slice(0, 20).map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors",
                          !alert.resolved && "bg-muted/20"
                        )}
                      >
                        {severityIcon(alert.severity)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(alert.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                  <User className="h-4 w-4" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="flex flex-col items-start">
                <span className="font-medium">{userName}</span>
                <span className="text-xs text-muted-foreground capitalize">{displayRole}</span>
              </DropdownMenuItem>
              <DropdownMenuItem>Paramètres</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={onLogout}>Déconnexion</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
