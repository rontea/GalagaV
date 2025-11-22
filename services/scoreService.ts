import { db } from '../lib/firebase';
import { collection, addDoc, query, orderBy, limit, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { HighScore, UserProfile } from '../types';

const SCORES_COLLECTION = 'high_scores';
const PROFILES_COLLECTION = 'user_profiles';

// LOCAL STORAGE FALLBACK KEY
const LOCAL_HIGH_SCORE_KEY = 'galaga_local_high_score';
const LOCAL_PROFILE_KEY = 'galaga_local_profile';

export const saveScore = async (userId: string, score: number, pilotNameFallback: string) => {
  try {
    if (!db) throw new Error("No Database");

    // V1.1 RULE: Check user_profiles first
    let finalPilotName = pilotNameFallback;
    
    // Attempt to fetch profile if userId is valid (assuming not anonymous for now, or handling anon uids)
    if (userId) {
      const profileRef = doc(db, PROFILES_COLLECTION, userId);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        const data = profileSnap.data() as UserProfile;
        if (data.pilotName) {
          finalPilotName = data.pilotName;
        }
      }
    }

    await addDoc(collection(db, SCORES_COLLECTION), {
      userId,
      score,
      pilotName: finalPilotName,
      timestamp: Date.now()
    });

  } catch (e) {
    console.log("Offline mode: Saving high score locally");
    const currentLocal = parseInt(localStorage.getItem(LOCAL_HIGH_SCORE_KEY) || '0');
    if (score > currentLocal) {
      localStorage.setItem(LOCAL_HIGH_SCORE_KEY, score.toString());
    }
  }
};

export const getHighScores = async (): Promise<HighScore[]> => {
  try {
    if (!db) throw new Error("No Database");

    const q = query(
      collection(db, SCORES_COLLECTION),
      orderBy('score', 'desc'),
      limit(10)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as HighScore));
  } catch (e) {
    // Return dummy data or local high score if offline
    const localScore = parseInt(localStorage.getItem(LOCAL_HIGH_SCORE_KEY) || '0');
    return [
      { userId: 'local', pilotName: 'YOU', score: localScore, timestamp: Date.now() },
      { userId: 'cpu', pilotName: 'CPU-1', score: 50000, timestamp: Date.now() },
      { userId: 'cpu', pilotName: 'CPU-2', score: 40000, timestamp: Date.now() },
    ];
  }
};

export const saveUserProfile = async (userId: string, profile: Partial<UserProfile>) => {
  try {
    if (!db) throw new Error("No Database");
    const ref = doc(db, PROFILES_COLLECTION, userId);
    await setDoc(ref, { ...profile, uid: userId }, { merge: true });
  } catch (e) {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  }
};

export const getLocalProfile = (): Partial<UserProfile> | null => {
  const s = localStorage.getItem(LOCAL_PROFILE_KEY);
  return s ? JSON.parse(s) : null;
};
