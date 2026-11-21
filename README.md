# WordRush

A fast-paced, multiplayer word-search game built with React 19, Vite, Tailwind CSS 4, and Firebase. Play solo or race friends on identical seeded boards across **Duel**, **Series**, **Weekly**, and **Zen** modes.

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Run Locally
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

## Firebase Setup
WordRush uses Firebase Authentication (Google Sign-In), Cloud Firestore (live multiplayer match rooms, leaderboards, and cloud stats), and Firebase Hosting.

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication → Google Sign-In** and **Cloud Firestore**.
3. Update the web app config in `src/services/firebase.ts` and the default project ID in `.firebaserc`.
4. Deploy security rules and hosting with the Firebase CLI:
   ```bash
   firebase deploy
   ```
