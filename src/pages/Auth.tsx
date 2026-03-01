import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, Smile, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.string().email('Email invalide');
const passwordSchema = z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères');

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);

      if (error) {
        const isNetworkError = /fetch|network|failed to fetch|load failed/i.test(error.message || '');
        toast.error('Erreur de connexion', {
          description: isNetworkError
            ? 'Serveur Supabase inaccessible. Vérifie que Supabase local est démarré.'
            : error.message === 'Invalid login credentials'
              ? 'Email ou mot de passe incorrect'
              : error.message,
        });
      } else {
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(forgotEmail);
    if (!result.success) {
      toast.error('Email invalide', { description: result.error.errors[0].message });
      return;
    }
    setForgotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { email: forgotEmail.trim() },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error('Erreur', { description: data.error });
      } else {
        toast.success('Email envoyé', {
          description: 'Si un compte existe avec cet email, un nouveau mot de passe vous sera envoyé.',
        });
        setShowForgot(false);
        setForgotEmail('');
      }
    } catch (err) {
      toast.error('Erreur', {
        description: err instanceof Error ? err.message : 'Une erreur est survenue',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full gradient-primary flex items-center justify-center mb-2">
            <Smile className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">AlignerTrack</CardTitle>
          <CardDescription>
            Plateforme de suivi orthodontique
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showForgot ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour à la connexion
              </button>
              <p className="text-sm text-muted-foreground">
                Saisissez votre adresse email. Si un compte actif existe, un nouveau mot de passe vous sera envoyé.
              </p>
              <div className="space-y-2">
                <Label htmlFor="email-forgot">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email-forgot"
                    type="email"
                    placeholder="votre@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" className="w-full gradient-primary" disabled={forgotLoading}>
                {forgotLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Réinitialiser le mot de passe
              </Button>
            </form>
          ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signin">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email-signin"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signin">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password-signin"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Se connecter
                </Button>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
