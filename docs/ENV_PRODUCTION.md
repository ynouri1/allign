# Configuration des variables d'environnement pour la production

## Vercel (.env.production)
```bash
VITE_SUPABASE_URL=https://gpvpbmibhqieimurohwd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_F0v3VCdab8MNapaazSG2bA_MGf0iatB
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY_FROM_SUPABASE_DASHBOARD]
NODE_ENV=production
```

## Docker (.env.docker.prod)
```bash
SUPABASE_URL=https://gpvpbmibhqieimurohwd.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_F0v3VCdab8MNapaazSG2bA_MGf0iatB
SUPABASE_CONNECTION_STRING=postgresql://postgres:[YOUR-PASSWORD]@db.gpvpbmibhqieimurohwd.supabase.co:5432/postgres
NODE_ENV=production
PORT=3000
```

## Variables à définir manuellement en production:
- `[YOUR-PASSWORD]`: Mot de passe de la base de données Supabase
- `[SERVICE_ROLE_KEY_FROM_SUPABASE_DASHBOARD]`: Clé service role depuis le dashboard Supabase

## Instructions de déploiement:

### Vercel
1. Aller dans Project Settings > Environment Variables
2. Ajouter chaque variable avec la valeur correspondante
3. S'assurer que les variables VITE_ sont exposées au build
4. Redéployer l'application

### Docker
1. Copier .env.docker.prod vers .env en production
2. Remplacer les placeholders par les vraies valeurs
3. Utiliser docker-compose ou docker run avec --env-file

### Variables sensibles
- Ne jamais commiter les vraies valeurs dans Git
- Utiliser des secrets dans le CI/CD
- Rotation régulière des clés d'accès