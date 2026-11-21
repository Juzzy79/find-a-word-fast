import { doc, getDoc } from 'firebase/firestore';
import { db } from '../src/services/firebase.ts';

async function inspectMatch() {
  const snap = await getDoc(doc(db, 'matches', 'UBURCV'));
  if (snap.exists()) {
    const data = snap.data();
    console.log('Match UBURCV:');
    console.log('Title:', data.title);
    console.log('Mode:', data.mode);
    console.log('isChaosMode:', (data as any).isChaosMode);
    console.log('Participants:', data.participants);
    data.rounds.forEach((r: any, idx: number) => {
      console.log(`\nRound ${idx + 1}:`);
      console.log('  Theme:', r.theme);
      console.log('  ThemeId:', r.themeId);
      console.log('  Seed:', r.seed);
      console.log('  Results:', Object.keys(r.results || {}));
      Object.entries(r.results || {}).forEach(([p, res]: any) => {
        console.log(`    ${p}: elapsedMs=${res.elapsedMs}, words=${res.wordFindTimestamps?.length}`);
      });
    });
  }
}

inspectMatch().then(() => process.exit(0));
