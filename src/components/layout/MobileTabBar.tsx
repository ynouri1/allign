import { cn } from '@/lib/utils';

interface MobileTabBarProps {
  tabs: { value: string; icon: React.ReactNode; label: string }[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function MobileTabBar({ tabs, activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border/40 bg-background/95 backdrop-blur-xl md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-medium transition-colors min-h-[56px] justify-center',
              activeTab === tab.value
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full transition-colors',
              activeTab === tab.value && 'bg-primary/10'
            )}>
              {tab.icon}
            </span>
            <span className="truncate max-w-full">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
