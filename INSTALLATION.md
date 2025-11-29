# Guide d'Installation - Leaders Sensibles

## Prérequis

- Node.js (version 16 ou supérieure)
- npm (généralement inclus avec Node.js)

## Installation

1. **Installer les dépendances du projet principal :**
```bash
npm install
```

2. **Installer les dépendances du serveur :**
```bash
cd server
npm install
cd ..
```

3. **Installer les dépendances du client :**
```bash
cd client
npm install
cd ..
```

Ou utilisez la commande combinée :
```bash
npm run install-all
```

## Configuration

1. **Créer un fichier `.env` dans le dossier `server/` :**
```bash
cd server
cp .env.example .env
```

2. **Modifier le fichier `.env` si nécessaire :**
```
PORT=5000
JWT_SECRET=votre-cle-secrete-changez-en-production
```

## Démarrage

### Développement (recommandé)

Démarre à la fois le serveur et le client :
```bash
npm run dev
```

Le serveur sera disponible sur `http://localhost:5000`
Le client sera disponible sur `http://localhost:5173`

### Démarrage séparé

**Serveur uniquement :**
```bash
cd server
npm run dev
```

**Client uniquement :**
```bash
cd client
npm run dev
```

## Première utilisation

1. Ouvrez votre navigateur sur `http://localhost:5173`
2. Créez un compte avec le bouton "Créer un compte"
3. Connectez-vous avec vos identifiants
4. Complétez votre profil dans l'onglet "Profil"

## Rôles

- **Participant** : Rôle par défaut, permet le matching, messages, événements, cours
- **Instructeur** : Peut créer et gérer des événements et contenus
- **Admin** : Accès complet, peut gérer les utilisateurs, rôles, événements et cours

Pour changer un rôle en Admin, vous devez modifier directement la base de données SQLite ou utiliser l'interface Admin si vous avez déjà un compte Admin.

## Base de données

La base de données SQLite est créée automatiquement au premier démarrage du serveur dans `server/database.sqlite`.

## Dépannage

### Erreur de port déjà utilisé
Changez le port dans le fichier `.env` du serveur ou dans `vite.config.js` pour le client.

### Erreur de dépendances
Supprimez les dossiers `node_modules` et réinstallez :
```bash
rm -rf node_modules server/node_modules client/node_modules
npm run install-all
```

### Problèmes avec les uploads
Assurez-vous que le dossier `server/uploads/` existe et est accessible en écriture.



