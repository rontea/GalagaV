
import { db as firebaseDb, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, limit, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { HighScore, UserProfile } from '../types';
import { getScoresFromDB, saveScoreToDB, getProfileFromDB, saveProfileToDB } from '../lib/sqlite';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

const SCORES_COLLECTION = 'high_scores';
const PROFILES_COLLECTION = 'user_profiles';

export const saveScore = async (userId: string, score: number, pilotNameFallback: string) => {
  try {
    if (!firebaseDb) throw new Error("No Firebase Database");

    let finalPilotName = pilotNameFallback;
    
    const path = `${PROFILES_COLLECTION}/${userId}`;
    if (userId) {
      try {
        const profileRef = doc(firebaseDb, PROFILES_COLLECTION, userId);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data() as UserProfile;
          if (data.pilotName) {
            finalPilotName = data.pilotName;
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, path, auth);
      }
    }

    try {
      await addDoc(collection(firebaseDb, SCORES_COLLECTION), {
        userId,
        score,
        pilotName: finalPilotName,
        timestamp: Date.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, SCORES_COLLECTION, auth);
    }

  } catch (e) {
    console.log("Saving high score to SQLite database");
    saveScoreToDB({
      userId,
      score,
      pilotName: pilotNameFallback,
      timestamp: Date.now()
    });
  }
};

export const getHighScores = async (): Promise<HighScore[]> => {
  try {
    if (!firebaseDb) throw new Error("No Firebase Database");

    const q = query(
      collection(firebaseDb, SCORES_COLLECTION),
      orderBy('score', 'desc'),
      limit(10)
    );

    try {
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as HighScore));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, SCORES_COLLECTION, auth);
      return []; // Should not reach here as handleFirestoreError throws
    }
  } catch (e) {
    console.log("Fetching scores from SQLite database");
    const scores = getScoresFromDB();
    if (scores.length > 0) return scores;
    
    // Default fallback if SQL also empty
    return [
      { userId: 'cpu', pilotName: 'CPU-1', score: 50000, timestamp: Date.now() },
      { userId: 'cpu', pilotName: 'CPU-2', score: 40000, timestamp: Date.now() },
    ];
  }
};

export const saveUserProfile = async (userId: string, profile: Partial<UserProfile>) => {
  try {
    if (firebaseDb) {
      const path = `${PROFILES_COLLECTION}/${userId}`;
      try {
        const ref = doc(firebaseDb, PROFILES_COLLECTION, userId);
        await setDoc(ref, { ...profile, uid: userId }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path, auth);
      }
    }
  } finally {
    // Always save to SQLite for offline resilience
    const current = getProfileFromDB(userId) || {
      uid: userId,
      name: '',
      pilotName: '',
      themePreference: 'dark',
      createdAt: Date.now()
    };

    saveProfileToDB({
      ...current,
      ...profile,
      uid: userId
    } as UserProfile);
  }
};

export const getLocalProfile = (userId: string = 'local_user'): UserProfile | null => {
  return getProfileFromDB(userId);
};
