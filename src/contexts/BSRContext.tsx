'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';

interface BSREntry {
  score: number;
  reflex: string | null;
  context: string | null;
  timestamp: number; // epoch ms for easy serialization
}

interface BSRContextType {
  entries: BSREntry[];
  logEntry: (score: number, reflex: string | null, context: string | null) => void;
  bsr4h: number | null;
  contextBSR: Record<string, number | null>;
  recentCount: number;
}

const STORAGE_KEY = 'bsr_entries';
const CONTEXTS = ['rest', 'work', 'social', 'walk', 'eat', 'session'];

function calcBSR(arr: BSREntry[]): number | null {
  if (!arr.length) return null;
  return Math.round(arr.reduce((s, e) => s + e.score, 0) / (arr.length * 2) * 100);
}

function loadFromStorage(): BSREntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Keep only last 7 days of data
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return parsed.filter((e: BSREntry) => e.timestamp > sevenDaysAgo);
  } catch {
    return [];
  }
}

function saveToStorage(entries: BSREntry[]) {
  try {
    // Keep only last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const trimmed = entries.filter(e => e.timestamp > sevenDaysAgo);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable — ignore
  }
}

const BSRContext = createContext<BSRContextType | undefined>(undefined);

export function useBSR() {
  const ctx = useContext(BSRContext);
  if (!ctx) throw new Error('useBSR must be used within BSRProvider');
  return ctx;
}

export function BSRProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState<BSREntry[]>([]);
  const hasHydrated = useRef(false);
  const hasSynced = useRef(false);

  // 1. Hydrate from localStorage on mount (instant, survives page reloads)
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    const stored = loadFromStorage();
    if (stored.length > 0) {
      setEntries(stored);
      console.log(`[BSR] Hydrated ${stored.length} entries from localStorage`);
    }
  }, []);

  // 2. Sync from Firestore once per session (background, merges with local)
  useEffect(() => {
    if (!currentUser || hasSynced.current) return;
    hasSynced.current = true;

    const sync = async () => {
      try {
        const q = query(
          collection(db, 'bsrEntries'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(200)
        );
        const snap = await getDocs(q);
        if (snap.empty) return;

        const remote: BSREntry[] = snap.docs.map(d => ({
          score: d.data().score,
          reflex: d.data().reflex || null,
          context: d.data().context || null,
          timestamp: d.data().timestamp?.toDate?.()?.getTime?.() || Date.now(),
        }));

        // Merge: use remote as truth, but keep any local entries not yet in remote
        // (entries from the last few seconds that haven't synced yet)
        setEntries(prev => {
          const remoteTimestamps = new Set(remote.map(e => e.timestamp));
          const localOnly = prev.filter(e => !remoteTimestamps.has(e.timestamp));
          // Also check within 2-second window to avoid near-duplicates
          const merged = [...remote];
          localOnly.forEach(local => {
            const hasSimilar = remote.some(r =>
              Math.abs(r.timestamp - local.timestamp) < 2000 && r.score === local.score
            );
            if (!hasSimilar) merged.push(local);
          });
          merged.sort((a, b) => b.timestamp - a.timestamp);
          saveToStorage(merged);
          return merged;
        });

        console.log(`[BSR] Synced ${snap.size} entries from Firestore`);
      } catch (err: any) {
        console.warn('[BSR] Firestore sync failed (using local data):', err?.message || err);
      }
    };

    sync();
  }, [currentUser]);

  // Log new entry
  const logEntry = useCallback((score: number, reflex: string | null, context: string | null) => {
    const newEntry: BSREntry = {
      score,
      reflex,
      context,
      timestamp: Date.now(),
    };

    setEntries(prev => {
      const updated = [newEntry, ...prev];
      saveToStorage(updated);
      return updated;
    });

    // Background Firestore write
    if (currentUser) {
      addDoc(collection(db, 'bsrEntries'), {
        userId: currentUser.uid,
        score,
        reflex,
        context,
        timestamp: Timestamp.now(),
      }).catch(err => {
        console.warn('[BSR] Firestore write failed:', err?.message || err);
      });
    }
  }, [currentUser]);

  // Derived values
  const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
  const recent = entries.filter(e => e.timestamp > fourHoursAgo);
  const bsr4h = calcBSR(recent);

  const contextBSR: Record<string, number | null> = {};
  CONTEXTS.forEach(cId => {
    const arr = entries.filter(e => e.context === cId);
    contextBSR[cId] = arr.length >= 3 ? calcBSR(arr) : null;
  });

  return (
    <BSRContext.Provider value={{
      entries,
      logEntry,
      bsr4h,
      contextBSR,
      recentCount: recent.length,
    }}>
      {children}
    </BSRContext.Provider>
  );
}
