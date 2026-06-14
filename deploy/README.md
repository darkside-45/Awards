# Guide de Déploiement - Les Awards 2026

## Domaine : awards.pixora-community.com
## Hébergement : cPanel LWS

---

## ETAPE 1 : Configurer votre Supabase

1. Allez sur https://supabase.com/dashboard
2. Ouvrez votre projet **omirnyotkctscuyypxlp**
3. Allez dans **SQL Editor**
4. Copiez-collez le contenu du fichier `supabase-setup.sql`
5. Cliquez **Run** pour créer toutes les tables et données

## ETAPE 2 : Récupérer votre clé API

1. Dans votre projet Supabase, allez dans **Settings > API**
2. Copiez la valeur **anon public** (elle commence par `eyJhbGci...`)
3. Remplacez `VOTRE_CLE_ANON_ICI` dans le fichier `.env` par cette clé

## ETAPE 3 : Construire le projet

```bash
npm run build
```

Le dossier `dist/` sera généré avec tous les fichiers prêts.

## ETAPE 4 : Déployer sur cPanel LWS

### Option A : Via le Gestionnaire de Fichiers cPanel

1. Connectez-vous à votre cPanel LWS
2. Ouvrez le **Gestionnaire de Fichiers**
3. Allez dans le dossier `public_html` (ou le sous-dossier pour awards.pixora-community.com)
4. **Supprimez** le fichier index.html par défaut s'il existe
5. **Uploadez** TOUT le contenu du dossier `dist/` dans ce dossier
6. Assurez-vous que le fichier `.htaccess` est bien présent à la racine

### Option B : Via FTP (FileZilla)

1. Connectez-vous en FTP à votre hébergement LWS
2. Allez dans le dossier du domaine awards.pixora-community.com
3. Uploadez tout le contenu de `dist/`

## Structure des fichiers à déployer :

```
/
├── .htaccess          (routing SPA)
├── index.html         (page principale)
├── vite.svg           (favicon)
└── assets/
    ├── index-XXX.css  (styles)
    └── index-XXX.js   (application)
```

## ETAPE 5 : Vérifier

1. Visitez https://awards.pixora-community.com
2. L'application doit s'afficher
3. Cliquez sur "Admin" pour accéder au panneau d'administration
4. Email : guenolekuate2023@gmail.com
5. Mot de passe : Guenole@#2026

## Notes importantes

- Le fichier `.env` n'est PAS déployé (les variables sont compilées dans le JS lors du build)
- Le bucket Storage "uploads" doit être créé dans Supabase (le script SQL le fait)
- Les photos des candidats sont stockées dans Supabase Storage, pas sur l'hébergement
