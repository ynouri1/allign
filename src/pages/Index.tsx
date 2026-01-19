import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Stethoscope, User, ArrowRight, Shield, Camera, Bell, Sparkles } from 'lucide-react';
import heroImage from '@/assets/hero-aligner.jpg';

export default function Index() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Bell className="h-6 w-6" />,
      title: 'Rappels intelligents',
      description: 'Ne manquez jamais un changement de gouttière'
    },
    {
      icon: <Camera className="h-6 w-6" />,
      title: 'Suivi photo IA',
      description: 'Analyse automatique de vos photos'
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: 'Détection automatique',
      description: 'Taquets, insertion, santé gingivale'
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Suivi sécurisé',
      description: 'Données protégées et confidentielles'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Aligneur dentaire" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>
        {/* Background gradient */}
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-info/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative container max-w-6xl py-16 px-4">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-primary/25">
              <span className="text-2xl font-bold text-primary-foreground">A</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient">AlignTrack</h1>
              <p className="text-sm text-muted-foreground">Suivi intelligent d'aligneurs</p>
            </div>
          </div>

          {/* Main headline */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              Votre traitement d'aligneurs,{' '}
              <span className="text-gradient">suivi par l'IA</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Application de suivi pour patients sous gouttières d'alignement. 
              Rappels automatiques, analyse photo par intelligence artificielle, 
              et tableau de bord pour praticiens.
            </p>
          </div>

          {/* Role selection cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
            <Card 
              className="group p-8 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 border-2 border-transparent hover:border-primary/30 glass-card"
              onClick={() => navigate('/patient')}
            >
              <div className="flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                  <User className="h-10 w-10 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Espace Patient</h3>
                <p className="text-muted-foreground mb-6">
                  Suivez votre traitement, prenez des photos et recevez des analyses IA
                </p>
                <Button variant="gradient" className="w-full group-hover:shadow-lg">
                  Accéder
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>

            <Card 
              className="group p-8 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 border-2 border-transparent hover:border-primary/30 glass-card"
              onClick={() => navigate('/practitioner')}
            >
              <div className="flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-accent to-warning flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                  <Stethoscope className="h-10 w-10 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Espace Praticien</h3>
                <p className="text-muted-foreground mb-6">
                  Gérez vos patients, recevez des alertes et suivez la progression
                </p>
                <Button variant="outline" className="w-full border-2">
                  Accéder
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-5 rounded-xl bg-card border border-border/50 text-center hover:shadow-md transition-all duration-200"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
                  {feature.icon}
                </div>
                <h4 className="font-medium text-sm mb-1">{feature.title}</h4>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>POC AlignTrack • Suivi intelligent des aligneurs dentaires</p>
          <p className="mt-1">Intégration Azure prête pour la production</p>
        </div>
      </footer>
    </div>
  );
}
