import { Check, Clock, Circle } from 'lucide-react';
import { AlignerSchedule } from '@/types/patient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TimelineProps {
  schedule: AlignerSchedule[];
  maxVisible?: number;
}

export function Timeline({ schedule, maxVisible = 8 }: TimelineProps) {
  const currentIndex = schedule.findIndex(s => s.status === 'current');
  const startIndex = Math.max(0, currentIndex - 2);
  const visibleSchedule = schedule.slice(startIndex, startIndex + maxVisible);

  return (
    <div className="relative">
      <div className="flex items-center gap-1 overflow-x-auto pb-4 scrollbar-hide">
        {visibleSchedule.map((item, index) => (
          <div 
            key={item.alignerNumber}
            className={cn(
              "flex flex-col items-center min-w-[80px] transition-all duration-300",
              item.status === 'current' && "scale-110"
            )}
          >
            {/* Connector line */}
            {index > 0 && (
              <div className="absolute h-0.5 w-[70px] -translate-x-[75px] top-5">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    item.status === 'completed' || item.status === 'current' 
                      ? 'gradient-primary' 
                      : 'bg-muted'
                  )}
                />
              </div>
            )}
            
            {/* Node */}
            <div 
              className={cn(
                "relative z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
                item.status === 'completed' && "gradient-success text-success-foreground",
                item.status === 'current' && "gradient-primary text-primary-foreground shadow-glow",
                item.status === 'upcoming' && "bg-muted text-muted-foreground"
              )}
            >
              {item.status === 'completed' ? (
                <Check className="h-5 w-5" />
              ) : item.status === 'current' ? (
                <Clock className="h-5 w-5" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </div>
            
            {/* Label */}
            <div className="mt-2 text-center">
              <p className={cn(
                "text-sm font-semibold",
                item.status === 'current' ? "text-primary" : "text-foreground"
              )}>
                #{item.alignerNumber}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {format(item.startDate, 'd MMM', { locale: fr })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
