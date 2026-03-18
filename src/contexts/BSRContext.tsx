'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';

interface BSREntry {
  score: number;
  reflex: string | null;
  context: string | null;
  timestamp: Date;
}

interface BSRContextType {
  entries: BSREntry[];
  logEntry: (score: number, reflex: string | null, context: string | null) => void;
  bsr4h: number | null;
  contextBSR: Record<string, number | null>;
  recentCount: number;
  isLoaded: boolean;
}

function calcBSR(arr: BSREntry[]): number | null {
  if (!arr.length) return null;
  return Math.round(arr.reduce((s, e) => s + e.score, 0) / (arr.length * 2) * 100);
}

const CONTEXTS = ['rest', 'work', 'social', 'walk', 'eat', 'session'];

const BSRContext = createContext<BSRContextType | undefined>(undefined);

export function useBSR() {
  const ctx = useContext(BSRContext);
  if (!ctx) throw new Error('useBSR must be used within BSRProvider');
  return ctx;
}

export function BSRProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState<BSREntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasLoaded = useRef(false);
  const currentUid = useRef<string | null>(null);

  // Load from Firestore once per user session
  useEffect(() => {
    if (!currentUser) {
      // User logged out — reset
      setEntries([]);
      setIsLoaded(false);
      hasLoaded.current = false;
      currentUid.current = null;
      return;
    }

    // Only reload if it's a different user or first load
    if (hasLoaded.current && currentUid.current === currentUser.uid) return;
    hasLoaded.current = true;
    currentUid.current = currentUser.uid;

    const load = async () => {
      try {
        const q = query(
          collection(db, 'bsrEntries'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(200)
        );
        const snap = await getDocs(q);
        const loaded: BSREntry[] = snap.docs.map(d => ({
          score: d.data().score,
          reflex: d.data().reflex || null,
          context: d.data().context || null,
          timestamp: d.data().timestamp?.toDate?.() || new Date(),
        }));
        setEntries(loaded);
        console.log(`[BSR] Loaded ${loaded.length} entries from Firestore`);
      } catch (err: any) {
        console.warn('[BSR] Firestore load failed:', err?.message || err);
        if (err?.message?.includes('index')) {
          console.warn('[BSR] 👆 Klik de link hierboven om de Firestore index aan te maken');
        }
      }
      setIsLoaded(true);
    };

    load();
  }, [currentUser]);

  // Log new entry — optimistic local + background Firestore
  const logEntry = useCallback((score: number, reflex: string | null, context: string | null) => {
    const newEntry: BSREntry = { score, reflex, context, timestamp: new Date() };
    setEntries(prev => [newEntry, ...prev]);

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
  const recent = entries.filter(e => e.timestamp.getTime() > fourHoursAgo);
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
      isLoaded,
    }}>
      {children}
    </BSRContext.Provider>
  );
}
