import { collection, getDocs } from 'firebase/firestore';
import { db } from '../src/services/firebase.ts';

async function inspectMatches() {
  try {
    const snap = await getDocs(collection(db, 'matches'));
    console.log(`Found ${snap.size} matches in Firestore:`);
    snap.forEach(docSnap => {
      const data = docSnap.data();
      console.log(`\n--- Match ${data.roomCode || data.id} (status: ${data.status}, mode: ${data.mode}, totalRounds: ${data.totalRounds}) ---`);
      if (data.rounds) {
        data.rounds.forEach((r: any, idx: number) => {
          console.log(`  Round ${idx + 1}: theme="${r.theme}", themeId="${r.themeId}", seed=${r.seed}, gridSize=${r.gridSize}`);
        });
      }
    });
  } catch (err) {
    console.error('Error querying matches:', err);
  }
}

inspectMatches().then(() => process.exit(0));
