import { Play, Clock, CheckCircle2, X, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import insertionVideo from '@/assets/videos/aligner-insertion-tutorial.mp4';
import removalVideo from '@/assets/videos/aligner-removal-tutorial.mp4';
import cleaningVideo from '@/assets/videos/aligner-cleaning-tutorial.mp4';
import dailyWearVideo from '@/assets/videos/aligner-daily-wear-tips.mp4';
import painReliefVideo from '@/assets/videos/aligner-pain-relief.mp4';
import eatingDrinkingVideo from '@/assets/videos/aligner-eating-drinking.mp4';

interface Video {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  videoUrl: string;
  isLocalVideo?: boolean;
  category: string;
}

// Vidéos statiques par défaut (celles générées par IA)
const defaultVideos: Video[] = [
  {
    id: 'default-1',
    title: 'Comment bien insérer sa gouttière',
    description: 'Apprenez la technique correcte pour mettre vos aligneurs en place sans les abîmer.',
    duration: '0:05',
    thumbnail: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=225&fit=crop',
    videoUrl: insertionVideo,
    isLocalVideo: true,
    category: 'insertion',
  },
  {
    id: 'default-2',
    title: 'Retirer ses aligneurs correctement',
    description: 'La bonne méthode pour enlever vos gouttières sans douleur ni dommage.',
    duration: '0:05',
    thumbnail: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=225&fit=crop',
    videoUrl: removalVideo,
    isLocalVideo: true,
    category: 'retrait',
  },
  {
    id: 'default-3',
    title: 'Nettoyage quotidien des gouttières',
    description: 'Gardez vos aligneurs propres et transparents avec ces conseils d\'hygiène.',
    duration: '0:05',
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=225&fit=crop',
    videoUrl: cleaningVideo,
    isLocalVideo: true,
    category: 'hygiene',
  },
  {
    id: 'default-4',
    title: 'Port 22h/jour : astuces pratiques',
    description: 'Comment atteindre les 22 heures de port quotidien recommandées.',
    duration: '0:05',
    thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=225&fit=crop',
    videoUrl: dailyWearVideo,
    isLocalVideo: true,
    category: 'conseils',
  },
  {
    id: 'default-5',
    title: 'Gérer la douleur des premiers jours',
    description: 'Conseils pour soulager l\'inconfort lors du changement de gouttière.',
    duration: '0:05',
    thumbnail: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=225&fit=crop',
    videoUrl: painReliefVideo,
    isLocalVideo: true,
    category: 'conseils',
  },
  {
    id: 'default-6',
    title: 'Manger et boire avec des aligneurs',
    description: 'Ce qu\'il faut savoir sur l\'alimentation pendant votre traitement.',
    duration: '0:05',
    thumbnail: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=225&fit=crop',
    videoUrl: eatingDrinkingVideo,
    isLocalVideo: true,
    category: 'conseils',
  },
];

const categoryLabels: Record<string, { label: string; color: string }> = {
  insertion: { label: 'Insertion', color: 'bg-blue-500' },
  retrait: { label: 'Retrait', color: 'bg-purple-500' },
  hygiene: { label: 'Hygiène', color: 'bg-green-500' },
  conseils: { label: 'Conseils', color: 'bg-orange-500' },
};

export function VideoTutorials() {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<string[]>([]);

  // Récupérer les vidéos personnalisées depuis la base de données
  const { data: dbVideos, isLoading } = useQuery({
    queryKey: ['tutorial-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutorial_videos')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(v => ({
        id: v.id,
        title: v.title,
        description: v.description || '',
        duration: v.duration || '0:00',
        thumbnail: v.thumbnail_url || 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=225&fit=crop',
        videoUrl: v.video_url,
        isLocalVideo: false, // Videos from storage are URLs
        category: v.category,
      })) as Video[];
    },
  });

  // Combiner les vidéos par défaut et les vidéos de la DB
  // Les vidéos de la DB apparaissent en premier si elles existent
  const allVideos = [...(dbVideos || []), ...defaultVideos];

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
    if (!watchedVideos.includes(video.id)) {
      setWatchedVideos([...watchedVideos, video.id]);
    }
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <Card className="p-4 glass-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Votre progression</p>
            <p className="text-sm text-muted-foreground">
              {watchedVideos.length} / {allVideos.length} vidéos vues
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(watchedVideos.length / allVideos.length) * 100}%` }}
              />
            </div>
            {watchedVideos.length === allVideos.length && allVideos.length > 0 && (
              <CheckCircle2 className="h-5 w-5 text-success" />
            )}
          </div>
        </div>
      </Card>

      {/* Video player modal */}
      {selectedVideo && (
        <Card className="p-4 glass-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{selectedVideo.title}</h3>
            <button 
              onClick={handleCloseVideo}
              className="p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            {selectedVideo.isLocalVideo ? (
              <video
                src={selectedVideo.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                src={selectedVideo.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            )}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{selectedVideo.description}</p>
        </Card>
      )}

      {/* Video grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allVideos.map((video) => {
          const isWatched = watchedVideos.includes(video.id);
          const category = categoryLabels[video.category] || { label: video.category, color: 'bg-gray-500' };
          
          return (
            <Card 
              key={video.id}
              className={cn(
                "overflow-hidden cursor-pointer transition-all hover:shadow-md",
                selectedVideo?.id === video.id && "ring-2 ring-primary",
                isWatched && "opacity-80"
              )}
              onClick={() => handleVideoClick(video)}
            >
              <div className="relative">
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="h-6 w-6 text-primary ml-1" />
                  </div>
                </div>
                <Badge className={cn("absolute top-2 left-2 text-[10px]", category.color)}>
                  {category.label}
                </Badge>
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {video.duration}
                </div>
                {isWatched && (
                  <div className="absolute top-2 right-2 bg-success text-success-foreground p-1 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {video.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
