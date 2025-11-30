# Leaders Sensibles - Application de Rencontres et Networking

Application web complète pour leaders sensibles avec système de matching, événements, cours et networking.

## Structure du projet

- `server/` - Backend Node.js/Express avec SQLite
- `client/` - Frontend React avec Vite

## Installation

1. Installer toutes les dépendances :
```bash
npm run install-all
```

2. Démarrer le serveur de développement :
```bash
npm run dev
```

Le backend sera disponible sur `http://localhost:5000`
Le frontend sera disponible sur `http://localhost:5173`

## Rôles

- **Admin** : Gestion complète (utilisateurs, rôles, événements, cours)
- **Instructeur** : Création et gestion d'événements et contenus
- **Participant** : Matching, messages, événements, cours

## Fonctionnalités

- Authentification (Login/Signup)
- Profil utilisateur complet
- Matching style Tinder
- Messages entre utilisateurs matchés
- Liste des membres avec filtres et carte
- Événements (création, inscription)
- Cours avec modules et contenus
- Mur de partage communautaire
- Dashboard Admin




