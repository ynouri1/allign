import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Video, Upload, Loader2, GripVertical, Eye, EyeOff } from 'lucide-react';

interface TutorialVideo {
  id: string;
  title: string;
  description: string | null;
  duration: string;
  category: string;
  video_url: string;
  thumbnail_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const categories = [
  { value: 'insertion', label: 'Insertion' },
  { value: 'retrait', label: 'Retrait' },
  { value: 'hygiene', label: 'Hygiène' },
  { value: 'conseils', label: 'Conseils' },
];

const getCategoryLabel = (value: string) => {
  return categories.find(c => c.value === value)?.label || value;
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'insertion': return 'bg-blue-500/10 text-blue-500';
    case 'retrait': return 'bg-orange-500/10 text-orange-500';
    case 'hygiene': return 'bg-green-500/10 text-green-500';
    case 'conseils': return 'bg-purple-500/10 text-purple-500';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function VideoManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TutorialVideo | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '0:00',
    category: 'conseils',
    video_url: '',
    thumbnail_url: '',
    is_active: true,
    sort_order: 0,
  });

  // Fetch videos
  const { data: videos, isLoading } = useQuery({
    queryKey: ['tutorial-videos-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutorial_videos')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as TutorialVideo[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('tutorial_videos')
          .update({
            title: data.title,
            description: data.description || null,
            duration: data.duration,
            category: data.category,
            video_url: data.video_url,
            thumbnail_url: data.thumbnail_url || null,
            is_active: data.is_active,
            sort_order: data.sort_order,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tutorial_videos')
          .insert({
            title: data.title,
            description: data.description || null,
            duration: data.duration,
            category: data.category,
            video_url: data.video_url,
            thumbnail_url: data.thumbnail_url || null,
            is_active: data.is_active,
            sort_order: data.sort_order,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorial-videos-admin'] });
      queryClient.invalidateQueries({ queryKey: ['tutorial-videos'] });
      toast.success(editingVideo ? 'Vidéo mise à jour' : 'Vidéo ajoutée');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tutorial_videos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorial-videos-admin'] });
      queryClient.invalidateQueries({ queryKey: ['tutorial-videos'] });
      toast.success('Vidéo supprimée');
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('tutorial_videos')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorial-videos-admin'] });
      queryClient.invalidateQueries({ queryKey: ['tutorial-videos'] });
    },
  });

  const handleOpenDialog = (video?: TutorialVideo) => {
    if (video) {
      setEditingVideo(video);
      setFormData({
        title: video.title,
        description: video.description || '',
        duration: video.duration,
        category: video.category,
        video_url: video.video_url,
        thumbnail_url: video.thumbnail_url || '',
        is_active: video.is_active,
        sort_order: video.sort_order,
      });
    } else {
      setEditingVideo(null);
      setFormData({
        title: '',
        description: '',
        duration: '0:00',
        category: 'conseils',
        video_url: '',
        thumbnail_url: '',
        is_active: true,
        sort_order: (videos?.length || 0) + 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVideo(null);
    setFormData({
      title: '',
      description: '',
      duration: '0:00',
      category: 'conseils',
      video_url: '',
      thumbnail_url: '',
      is_active: true,
      sort_order: 0,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'thumbnail') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = type === 'video' ? `videos/${fileName}` : `thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tutorial-videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tutorial-videos')
        .getPublicUrl(filePath);

      if (type === 'video') {
        setFormData(prev => ({ ...prev, video_url: publicUrl }));
      } else {
        setFormData(prev => ({ ...prev, thumbnail_url: publicUrl }));
      }

      toast.success(`${type === 'video' ? 'Vidéo' : 'Miniature'} uploadée`);
    } catch (error: any) {
      toast.error('Erreur upload: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.video_url) {
      toast.error('Titre et URL vidéo requis');
      return;
    }
    saveMutation.mutate({
      ...formData,
      id: editingVideo?.id,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Gestion des vidéos tutoriels
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une vidéo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVideo ? 'Modifier la vidéo' : 'Ajouter une vidéo'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Comment insérer vos aligneurs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={formData.category}
                    onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de la vidéo..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Durée</Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={e => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="Ex: 1:30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Ordre d'affichage</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={e => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fichier vidéo *</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.video_url}
                    onChange={e => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="URL de la vidéo ou uploader un fichier"
                    className="flex-1"
                  />
                  <Label className="cursor-pointer">
                    <Input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={e => handleFileUpload(e, 'video')}
                      disabled={isUploading}
                    />
                    <Button type="button" variant="outline" disabled={isUploading} asChild>
                      <span>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </span>
                    </Button>
                  </Label>
                </div>
                {formData.video_url && (
                  <video src={formData.video_url} className="w-full h-32 object-cover rounded mt-2" controls />
                )}
              </div>

              <div className="space-y-2">
                <Label>Miniature (optionnel)</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.thumbnail_url}
                    onChange={e => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                    placeholder="URL de la miniature ou uploader une image"
                    className="flex-1"
                  />
                  <Label className="cursor-pointer">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleFileUpload(e, 'thumbnail')}
                      disabled={isUploading}
                    />
                    <Button type="button" variant="outline" disabled={isUploading} asChild>
                      <span>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </span>
                    </Button>
                  </Label>
                </div>
                {formData.thumbnail_url && (
                  <img src={formData.thumbnail_url} alt="Miniature" className="w-32 h-20 object-cover rounded mt-2" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Vidéo active (visible pour les patients)</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Annuler
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingVideo ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : videos && videos.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-16 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                          <Video className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{video.title}</p>
                        {video.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {video.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getCategoryColor(video.category)}>
                      {getCategoryLabel(video.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>{video.duration}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({
                        id: video.id,
                        is_active: !video.is_active
                      })}
                    >
                      {video.is_active ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(video)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Supprimer cette vidéo ?')) {
                            deleteMutation.mutate(video.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucune vidéo tutoriel</p>
            <p className="text-sm">Cliquez sur "Ajouter une vidéo" pour commencer</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
