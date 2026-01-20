import { Bell, Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  userType?: 'patient' | 'practitioner';
  userRole?: 'admin' | 'practitioner' | 'patient';
  userName: string;
  alertCount?: number;
  onMenuClick?: () => void;
  onLogout?: () => void;
}

export function Header({ userType, userRole, userName, alertCount = 0, onMenuClick, onLogout }: HeaderProps) {
  const displayRole = userRole || userType || 'patient';
  const roleLabel = displayRole === 'admin' ? 'Administration' : displayRole === 'practitioner' ? 'Espace Praticien' : 'Espace Patient';
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
              <span className="text-lg font-bold text-primary-foreground">A</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gradient">AlignTrack</h1>
            <p className="text-xs text-muted-foreground">
                {roleLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </Button>
          
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
