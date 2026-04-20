'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { BreathTraceSummary } from '@/app/api/breathtrace-analysis/route';

// ── Types ────────────────────────────────────────────────────────────────────
interface RRPoint {
  t: number;
  rr: number;
  phase: 'inhale' | 'exhale' | null;
  anomaly: 'sigh' | null;
}
interface BreathEvent {
  t: number;
  ts: string;
  type: 'sigh';
  detail: string;
}

// ── Constants ────────────────────────────────────────────────────────────────
const WIN_MS   = 60_000;   // visible window
const MA_PHASE = 7;        // MA window for phase detection
const MA_DISP  = 13;       // MA window for display envelope
const RR_MIN   = 300;
const RR_MAX   = 2_200;

// ── Moving average ────────────────────────────────────────────────────────────
function ma(arr: RRPoint[], win: number): number[] {
  const h = Math.floor(win / 2);
  return arr.map((_, i) => {
    const s = Math.max(0, i - h);
    const e = Math.min(arr.length - 1, i + h);
    let sum = 0;
    for (let j = s; j <= e; j++) sum += arr[j].rr;
    return sum / (e - s + 1);
  });
}

// ── Catmull-Rom spline on canvas ──────────────────────────────────────────────
function drawSpline(
  ctx: CanvasRenderingContext2D,
  xs: number[], ys: number[],
  color: string, width: number
) {
  if (xs.length < 2) return;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.moveTo(xs[0], ys[0]);
  for (let i = 0; i < xs.length - 1; i++) {
    const p0 = Math.max(0, i - 1);
    const p2 = i + 1;
    const p3 = Math.min(xs.length - 1, i + 2);
    ctx.bezierCurveTo(
      xs[i]  + (xs[p2] - xs[p0]) / 6, ys[i]  + (ys[p2] - ys[p0]) / 6,
      xs[p2] - (xs[p3] - xs[i])  / 6, ys[p2] - (ys[p3] - ys[i])  / 6,
      xs[p2], ys[p2],
    );
  }
  ctx.stroke();
}

export function BreathTraceSession() {
  const { currentUser } = useAuth();

  // ── Canvas ref ──────────────────────────────────────────────────────────────
  const cvRef  = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // ── Signal buffers (refs – no re-render) ────────────────────────────────────
  const rrBufRef      = useRef<RRPoint[]>([]);
  const eventsRef     = useRef<BreathEvent[]>([]);
  const sessionT0Ref  = useRef<number>(0);
  const isLiveRef     = useRef(false);

  // Detection state
  const lastPhaseRef   = useRef<'inhale' | 'exhale' | null>(null);
  const cycleAmpsRef   = useRef<number[]>([]);
  const cycleMinRef    = useRef(Infinity);
  const cycleMaxRef    = useRef(-Infinity);
  const breathTimesRef = useRef<number[]>([]);
  const cycleStartTRef = useRef<number | null>(null);
  const lastSighTRef   = useRef(-9999);

  // Amplitude halves for trend
  const ampFirstHalfRef  = useRef<number[]>([]);
  const ampSecondHalfRef = useRef<number[]>([]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [isConnected,    setIsConnected]    = useState(false);
  const [deviceName,     setDeviceName]     = useState('');
  const [sessionSec,     setSessionSec]     = useState(0);
  const [hr,             setHr]             = useState<number | null>(null);
  const [br,             setBr]             = useState<string | null>(null);
  const [rmssd,          setRmssd]          = useState<number | null>(null);
  const [nSigh,          setNSigh]          = useState(0);
  const [phase,          setPhase]          = useState<'inhale' | 'exhale' | null>(null);
  const [canAnalyse,     setCanAnalyse]     = useState(false);
  const [view,           setView]           = useState<'live' | 'analysis'>('live');
  const [aiText,         setAiText]         = useState('');
  const [aiLoading,      setAiLoading]      = useState(false);
  const [aiError,        setAiError]        = useState('');
  const [eventLog,       setEventLog]       = useState<BreathEvent[]>([]);

  const bleRef = useRef<BluetoothDevice | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── BLE connect ─────────────────────────────────────────────────────────────
  const doConnect = useCallback(async () => {
    if (!('bluetooth' in navigator)) {
      alert('Web Bluetooth vereist Chrome of Edge op desktop of Android.');
      return;
    }
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });
      bleRef.current = device;
      device.addEventListener('gattserverdisconnected', onDisconnect);

      const srv = await device.gatt!.connect();
      const svc = await srv.getPrimaryService('heart_rate');
      const chr = await svc.getCharacteristic('heart_rate_measurement');
      await chr.startNotifications();
      chr.addEventListener('characteristicvaluechanged', onHRM);

      // Reset all state
      rrBufRef.current      = [];
      eventsRef.current     = [];
      sessionT0Ref.current  = Date.now();
      isLiveRef.current     = true;
      lastPhaseRef.current  = null;
      cycleAmpsRef.current  = [];
      cycleMinRef.current   = Infinity;
      cycleMaxRef.current   = -Infinity;
      breathTimesRef.current = [];
      cycleStartTRef.current = null;
      lastSighTRef.current  = -9999;
      ampFirstHalfRef.current  = [];
      ampSecondHalfRef.current = [];

      setIsConnected(true);
      setDeviceName(device.name || 'Polar H10');
      setSessionSec(0);
      setNSigh(0);
      setEventLog([]);
      setCanAnalyse(false);
      setView('live');
      setHr(null); setBr(null); setRmssd(null); setPhase(null);

      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - sessionT0Ref.current) / 1000);
        setSessionSec(s);
        if (s >= 30 && rrBufRef.current.length > 20) setCanAnalyse(true);
      }, 1000);

    } catch (e: any) {
      if (e?.name !== 'NotFoundError') console.error('BLE:', e);
    }
  }, []);

  const onDisconnect = useCallback(() => {
    isLiveRef.current = false;
    setIsConnected(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (rrBufRef.current.length > 20) setCanAnalyse(true);
  }, []);

  const doDisconnect = useCallback(() => {
    if (bleRef.current?.gatt?.connected) bleRef.current.gatt.disconnect();
    else onDisconnect();
  }, [onDisconnect]);

  // ── HRM parsing (BT spec) ────────────────────────────────────────────────────
  const onHRM = useCallback((evt: Event) => {
    const v = (evt.target as BluetoothRemoteGATTCharacteristic).value!;
    const flags = v.getUint8(0);
    const fmt   = flags & 0x01;
    const hasE  = (flags >> 3) & 0x01;
    const hasRR = (flags >> 4) & 0x01;
    let off = 1;
    const hrVal = fmt ? (off += 2, v.getUint16(off - 2, true)) : v.getUint8(off++);
    if (hasE) off += 2;
    setHr(hrVal);
    if (!hasRR) return;
    const now = Date.now();
    while (off + 1 < v.byteLength) {
      const ms = Math.round(v.getUint16(off, true) * 1000 / 1024);
      off += 2;
      if (ms >= RR_MIN && ms <= RR_MAX) ingestRR(now, ms);
    }
  }, []);

  // ── Signal processing ────────────────────────────────────────────────────────
  const ingestRR = useCallback((t: number, rr: number) => {
    const buf = rrBufRef.current;
    buf.push({ t, rr, phase: null, anomaly: null });

    // Trim to 3 min
    const cutoff = t - 180_000;
    while (buf.length > 1 && buf[0].t < cutoff) buf.shift();
    if (buf.length < MA_PHASE + 2) return;

    const sm = ma(buf, MA_PHASE);
    const n  = sm.length;
    const phase = sm[n - 1] > sm[n - 2] ? 'exhale' : 'inhale';
    buf[n - 1].phase = phase;
    setPhase(phase);

    // Local RMSSD
    const r20 = buf.slice(-20);
    let sq = 0;
    for (let i = 1; i < r20.length; i++) sq += (r20[i].rr - r20[i - 1].rr) ** 2;
    const localRMSSD = Math.sqrt(sq / Math.max(1, r20.length - 1));
    setRmssd(Math.round(localRMSSD));

    // Breath rate
    const bTimes = breathTimesRef.current;
    if (bTimes.length >= 3) {
      const span = (bTimes.at(-1)! - bTimes[0]) / 1000;
      setBr(((bTimes.length - 1) / span * 60).toFixed(1));
    }

    // Track cycle amplitude
    cycleMinRef.current = Math.min(cycleMinRef.current, rr);
    cycleMaxRef.current = Math.max(cycleMaxRef.current, rr);
    if (cycleStartTRef.current === null) cycleStartTRef.current = t;

    // ── Sigh detection ─────────────────────────────────────────────────────
    if (lastPhaseRef.current === 'exhale' && phase === 'inhale') {
      const amp = cycleMaxRef.current - cycleMinRef.current;
      const cd  = cycleStartTRef.current ? t - cycleStartTRef.current : 9999;

      const amps = cycleAmpsRef.current;
      amps.push(amp);
      if (amps.length > 30) amps.shift();

      bTimes.push(t);
      if (bTimes.length > 20) bTimes.shift();

      // Amplitude trend: split session in halves
      const dur = t - sessionT0Ref.current;
      const half = 60_000; // rough: first vs second minute
      if (dur < half) ampFirstHalfRef.current.push(amp);
      else            ampSecondHalfRef.current.push(amp);

      if (amps.length >= 10) {
        const sorted = [...amps].sort((a, b) => a - b);
        const med    = sorted[Math.floor(sorted.length / 2)];
        // Gemiddelde en standaarddeviatie voor robuustere drempel
        const mean   = amps.reduce((s, v) => s + v, 0) / amps.length;
        const sd     = Math.sqrt(amps.reduce((s, v) => s + (v - mean) ** 2, 0) / amps.length);
        // Sigh = minstens 2× mediaan én meer dan 2.5 SD boven gemiddelde
        // én minimaal 50ms absolute amplitude (voorkomt trigger op vlakke basislijn)
        const thresh = Math.max(med * 2.0, mean + sd * 2.5, 50);

        if (amp > thresh && t - lastSighTRef.current > 8000) {
          const s   = (t - sessionT0Ref.current) / 1000;
          const ts  = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
          const ev: BreathEvent = {
            t, ts, type: 'sigh',
            detail: `amp ${amp}ms | drempel ${Math.round(thresh)}ms | med ${Math.round(med)}ms`,
          };
          eventsRef.current.push(ev);
          buf[n - 1].anomaly = 'sigh';
          lastSighTRef.current = t;
          setNSigh(eventsRef.current.length);
          setEventLog([...eventsRef.current]);
        }
      }

      cycleMinRef.current  = Infinity;
      cycleMaxRef.current  = -Infinity;
      cycleStartTRef.current = t;
    }

    lastPhaseRef.current = phase;
  }, []);

  // ── Canvas draw loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'live') return;
    const cv  = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;

    const resize = () => {
      const r = cv.parentElement!.getBoundingClientRect();
      cv.width  = Math.round(r.width);
      cv.height = Math.round(r.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv.parentElement!);

    const draw = () => {
      const W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#070b10';
      ctx.fillRect(0, 0, W, H);

      const buf = rrBufRef.current;
      if (buf.length < 4) { rafRef.current = requestAnimationFrame(draw); return; }

      const now = Date.now();
      const wS  = now - WIN_MS;
      const vis = buf.filter(p => p.t >= wS);
      if (vis.length < 2) { rafRef.current = requestAnimationFrame(draw); return; }

      const vals = vis.map(p => p.rr);
      const mn   = Math.min(...vals), mx = Math.max(...vals);
      const pad  = Math.max(mx - mn, 80) * 0.35;
      const yMn  = mn - pad, yMx = mx + pad;

      const toX = (t: number) => (t - wS) / WIN_MS * W;
      const toY = (v: number) => H - (v - yMn) / (yMx - yMn) * H;

      // Grid
      ctx.strokeStyle = '#1a2535'; ctx.lineWidth = 1;
      for (let v = Math.ceil(yMn / 50) * 50; v <= yMx; v += 50) {
        ctx.beginPath(); ctx.moveTo(0, toY(v)); ctx.lineTo(W, toY(v)); ctx.stroke();
      }
      for (let t = wS; t <= wS + WIN_MS; t += 10_000) {
        const x = toX(t); if (x < 0 || x > W) continue;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }

      // Phase bands
      for (let i = 0; i < vis.length - 1; i++) {
        if (!vis[i].phase) continue;
        ctx.fillStyle = vis[i].phase === 'inhale'
          ? 'rgba(0,224,122,.045)' : 'rgba(74,158,255,.028)';
        ctx.fillRect(toX(vis[i].t), 0, toX(vis[i + 1].t) - toX(vis[i].t), H);
      }

      // Envelope (smooth)
      const smAll = ma(buf, MA_DISP);
      const off   = buf.length - vis.length;
      const smVis = smAll.slice(off);
      drawSpline(ctx, vis.map(p => toX(p.t)), smVis.map(toY), 'rgba(0,224,122,.28)', 3.5);

      // Raw tachogram
      ctx.beginPath(); ctx.strokeStyle = '#00e07a'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
      vis.forEach((p, i) => {
        const x = toX(p.t), y = toY(vals[i]);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.fillStyle = '#00e07a';
      vis.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(toX(p.t), toY(vals[i]), 2, 0, Math.PI * 2); ctx.fill();
      });

      // Sigh markers
      for (const p of vis) {
        if (p.anomaly !== 'sigh') continue;
        const x = toX(p.t);
        ctx.strokeStyle = '#f5a02588'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(x, toY(p.rr), 5, 0, Math.PI * 2);
        ctx.fillStyle = '#f5a025'; ctx.fill();
        ctx.fillStyle = '#f5a025'; ctx.font = 'bold 8.5px Courier New, monospace';
        ctx.fillText('SIGH', x + 6, 14);
      }

      // Y labels
      ctx.fillStyle = '#2a3a50'; ctx.font = '9px Courier New, monospace'; ctx.textAlign = 'left';
      for (let v = Math.ceil(yMn / 50) * 50; v <= yMx; v += 50)
        ctx.fillText(`${v}`, 4, toY(v) - 3);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [view]);

  // ── Build summary ─────────────────────────────────────────────────────────────
  const buildSummary = (): BreathTraceSummary => {
    const buf  = rrBufRef.current;
    const vals = buf.map(p => p.rr);
    const meanRR  = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    const meanHR  = Math.round(60_000 / meanRR);

    let sq = 0;
    for (let i = 1; i < buf.length; i++) sq += (buf[i].rr - buf[i - 1].rr) ** 2;
    const rmssdVal = Math.round(Math.sqrt(sq / Math.max(1, buf.length - 1)));

    const bTimes  = breathTimesRef.current;
    let breathRate: string | null = null;
    if (bTimes.length >= 3) {
      const span = (bTimes.at(-1)! - bTimes[0]) / 1000;
      breathRate = ((bTimes.length - 1) / span * 60).toFixed(1);
    }

    // Breath rate CV from cycle durations
    let breathRateCV = 0;
    if (bTimes.length >= 4) {
      const durations = bTimes.slice(1).map((t, i) => t - bTimes[i]);
      const meanDur   = durations.reduce((s, v) => s + v, 0) / durations.length;
      const sdDur     = Math.sqrt(durations.reduce((s, v) => s + (v - meanDur) ** 2, 0) / durations.length);
      breathRateCV    = Math.round(sdDur / meanDur * 100);
    }

    // RSA amplitude trend
    const a1 = ampFirstHalfRef.current;
    const a2 = ampSecondHalfRef.current;
    let rsaTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (a1.length >= 3 && a2.length >= 3) {
      const mean1 = a1.reduce((s, v) => s + v, 0) / a1.length;
      const mean2 = a2.reduce((s, v) => s + v, 0) / a2.length;
      if (mean2 > mean1 * 1.2)      rsaTrend = 'increasing';
      else if (mean2 < mean1 * 0.8) rsaTrend = 'decreasing';
    }

    const rrMin = Math.min(...vals), rrMax = Math.max(...vals);
    const amps  = [...cycleAmpsRef.current].sort((a, b) => a - b);
    const dur   = Math.round((Date.now() - sessionT0Ref.current) / 1000);
    const sighsPerMin = dur > 0 ? eventsRef.current.length / (dur / 60) : 0;

    return {
      durationSec:    dur,
      meanHR,
      breathRate,
      rmssd:          rmssdVal,
      rrRange:        rrMax - rrMin,
      medAmp:         amps.length ? Math.round(amps[Math.floor(amps.length / 2)]) : 0,
      maxAmp:         amps.length ? Math.round(amps.at(-1)!) : 0,
      totalBeats:     buf.length,
      nSigh:          eventsRef.current.length,
      sighRatePerMin: Math.round(sighsPerMin * 100) / 100,
      breathRateCV,
      rsaTrend,
      events:         eventsRef.current.map(e => ({ ts: e.ts, type: e.type, detail: e.detail })),
    };
  };

  // ── Analysis ──────────────────────────────────────────────────────────────────
  const doAnalyse = useCallback(async () => {
    setView('analysis');
    setAiText('');
    setAiError('');
    setAiLoading(true);

    const summary = buildSummary();

    // Save to Firestore
    if (currentUser) {
      try {
        // Downsample RR buffer to max 300 points for storage
        const buf = rrBufRef.current;
        const step = Math.max(1, Math.floor(buf.length / 300));
        const rrSample = buf.filter((_, i) => i % step === 0);
        await addDoc(collection(db, `users/${currentUser.uid}/breathtraceSessions`), {
          createdAt: serverTimestamp(),
          ...summary,
          rrSample,
        });
      } catch (e) {
        console.error('Firestore save error:', e);
      }
    }

    // Claude analysis via server route
    try {
      const resp = await fetch('/api/breathtrace-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summary),
      });
      if (!resp.ok || !resp.body) {
        setAiError('Analyse mislukt. Probeer opnieuw.');
        setAiLoading(false);
        return;
      }
      setAiLoading(false);
      const reader = resp.body.getReader();
      const dec    = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        setAiText(full);
      }
    } catch (e: any) {
      setAiError(`Verbindingsfout: ${e.message}`);
      setAiLoading(false);
    }
  }, [currentUser]);

  // ── Format time ───────────────────────────────────────────────────────────────
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Render AI text (minimal markdown) ─────────────────────────────────────────
  const fmtAI = (text: string) =>
    text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^#{1,3}\s+(.+)$/gm, '<em style="display:block;font-size:0.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin:16px 0 6px">$1</em>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-64px)]">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex-shrink-0">
        <span className="font-bold text-emerald-400 text-sm tracking-tight mr-auto">
          Breath<span className="text-slate-500">Trace</span>
        </span>

        {isConnected && (
          <>
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
            <span className="font-mono text-xs text-slate-400">{deviceName}</span>
            <span className="font-mono text-xs text-slate-500 w-10">{fmtTime(sessionSec)}</span>
          </>
        )}

        {!isConnected && (
          <button
            onClick={doConnect}
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition-colors"
          >
            <i className="fas fa-bluetooth text-sm" />
            {canAnalyse ? 'Nieuwe sessie' : 'Verbinden'}
          </button>
        )}

        {isConnected && (
          <button
            onClick={doDisconnect}
            className="px-3 py-1.5 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Stop
          </button>
        )}

        {canAnalyse && view === 'live' && (
          <button
            onClick={doAnalyse}
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-bold transition-colors"
          >
            <i className="fas fa-wave-square text-xs" />
            Analyseer
          </button>
        )}

        {view === 'analysis' && (
          <button
            onClick={() => setView('live')}
            className="px-3 py-1.5 border border-slate-700 hover:border-slate-500 text-slate-400 rounded-lg text-xs font-semibold transition-colors"
          >
            ← Live
          </button>
        )}
      </div>

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-4 bg-slate-950 border-b border-slate-800 flex-shrink-0">
        {[
          { label: 'HR',    value: hr    ? `${hr}` : '—',   unit: 'bpm',  color: 'text-slate-200' },
          { label: 'BR',    value: br    ?? '—',              unit: 'bpm',  color: 'text-emerald-400' },
          { label: 'RMSSD', value: rmssd ? `${rmssd}` : '—', unit: 'ms',   color: 'text-emerald-400' },
          { label: 'Sighs', value: `${nSigh}`,                unit: '',     color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="px-3 py-2 border-r border-slate-800 last:border-0">
            <div className="text-[9px] font-bold tracking-widest uppercase text-slate-600 mb-0.5">{s.label}</div>
            <div className={`font-mono text-lg font-semibold leading-none ${s.color}`}>
              {s.value}<span className="text-[10px] text-slate-600 ml-0.5 font-normal">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Live view ────────────────────────────────────────────── */}
      {view === 'live' && (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950">

          {/* Canvas */}
          <div className="flex-1 relative min-h-0">
            <canvas ref={cvRef} className="absolute inset-0 w-full h-full" />

            {/* Phase badge */}
            {phase && (
              <div className={`absolute top-2.5 right-3 font-mono text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md ${
                phase === 'inhale'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                  : 'bg-blue-500/8 text-blue-400 border border-blue-500/20'
              }`}>
                {phase === 'inhale' ? 'Inademing' : 'Uitademing'}
              </div>
            )}

            {/* Idle overlay */}
            {!isConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <i className="fas fa-bluetooth text-3xl text-slate-700" />
                <p className="font-mono text-sm text-slate-600">Verbind een Polar H10</p>
                <p className="font-mono text-xs text-slate-700">Chrome of Edge vereist</p>
              </div>
            )}
          </div>

          {/* Event log */}
          <div className="h-28 border-t border-slate-800 overflow-y-auto flex-shrink-0">
            {eventLog.length === 0 ? (
              <p className="px-4 py-3 font-mono text-xs text-slate-700">Nog geen sighs gedetecteerd…</p>
            ) : (
              [...eventLog].reverse().map((e, i) => (
                <div key={i} className="flex items-baseline gap-3 px-4 py-1.5 border-b border-slate-900 font-mono text-xs">
                  <span className="text-slate-600 w-10 flex-shrink-0">{e.ts}</span>
                  <span className="text-amber-400 font-bold uppercase text-[9px] tracking-wider w-14 flex-shrink-0">Sigh</span>
                  <span className="text-slate-500 text-[10px]">{e.detail}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Analysis view ────────────────────────────────────────── */}
      {view === 'analysis' && (
        <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 dark:bg-slate-900">
          <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

            {/* Pattern metrics */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                Patroonmetrieken
              </p>
              <PatternMetrics
                breathRateCV={buildSummary().breathRateCV}
                rsaTrend={buildSummary().rsaTrend}
                sighRatePerMin={buildSummary().sighRatePerMin}
                breathRate={buildSummary().breathRate}
                durationSec={buildSummary().durationSec}
              />
            </div>

            {/* AI interpretation */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Interpretatie
                </p>
                {aiLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-gray-200 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin" />
                )}
              </div>

              {aiError ? (
                <p className="text-sm text-amber-600 dark:text-amber-400 font-mono">{aiError}</p>
              ) : aiText ? (
                <div
                  className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 prose-sm"
                  dangerouslySetInnerHTML={{ __html: fmtAI(aiText) }}
                />
              ) : aiLoading ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 font-mono animate-pulse">
                  Analyse bezig…
                </p>
              ) : null}
            </div>

            {/* Sigh list */}
            {eventLog.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                  Sighs ({eventLog.length})
                </p>
                <div className="space-y-1">
                  {eventLog.map((e, i) => (
                    <div key={i} className="flex items-baseline gap-3 py-1 border-b border-gray-100 dark:border-slate-700 last:border-0 font-mono text-xs">
                      <span className="text-gray-400 dark:text-gray-500 w-10 flex-shrink-0">{e.ts}</span>
                      <span className="text-amber-500 font-bold text-[9px] tracking-wider">SIGH</span>
                      <span className="text-gray-500 dark:text-gray-400 text-[10px]">{e.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New session */}
            <button
              onClick={() => {
                // Full reset van alle refs
                rrBufRef.current        = [];
                eventsRef.current       = [];
                lastPhaseRef.current    = null;
                cycleAmpsRef.current    = [];
                cycleMinRef.current     = Infinity;
                cycleMaxRef.current     = -Infinity;
                breathTimesRef.current  = [];
                cycleStartTRef.current  = null;
                lastSighTRef.current    = -9999;
                ampFirstHalfRef.current  = [];
                ampSecondHalfRef.current = [];
                // Reset UI state
                setView('live');
                setCanAnalyse(false);
                setNSigh(0);
                setEventLog([]);
                setHr(null); setBr(null); setRmssd(null); setPhase(null);
                setSessionSec(0);
                setAiText(''); setAiError('');
              }}
              className="w-full py-3 border border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-2xl text-sm font-semibold transition-colors"
            >
              Nieuwe meting
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pattern metrics sub-component ────────────────────────────────────────────
function PatternMetrics({
  breathRateCV, rsaTrend, sighRatePerMin, breathRate, durationSec,
}: {
  breathRateCV: number;
  rsaTrend: 'increasing' | 'decreasing' | 'stable';
  sighRatePerMin: number;
  breathRate: string | null;
  durationSec: number;
}) {
  const regularityLabel =
    breathRateCV < 10 ? 'Zeer regelmatig'   :
    breathRateCV < 20 ? 'Regelmatig'         :
    breathRateCV < 35 ? 'Matig onregelmatig' : 'Onregelmatig';

  const regularityColor =
    breathRateCV < 10 ? 'text-emerald-600 dark:text-emerald-400' :
    breathRateCV < 20 ? 'text-blue-600 dark:text-blue-400'       :
    breathRateCV < 35 ? 'text-amber-600 dark:text-amber-400'     : 'text-red-500 dark:text-red-400';

  const trendIcon  = rsaTrend === 'increasing' ? '↗' : rsaTrend === 'decreasing' ? '↘' : '→';
  const trendLabel = rsaTrend === 'increasing' ? 'Toenemend' : rsaTrend === 'decreasing' ? 'Afnemend' : 'Stabiel';
  const trendColor =
    rsaTrend === 'increasing' ? 'text-emerald-600 dark:text-emerald-400' :
    rsaTrend === 'decreasing' ? 'text-amber-600 dark:text-amber-400'     : 'text-blue-600 dark:text-blue-400';

  const items = [
    {
      label: 'Ademfrequentie',
      value: breathRate ? `${breathRate} bpm` : '—',
      sub: durationSec >= 30 ? `${Math.floor(durationSec / 60)}m${durationSec % 60}s opname` : 'onvoldoende data',
      color: 'text-gray-800 dark:text-gray-100',
    },
    {
      label: 'Ademregulariteit',
      value: regularityLabel,
      sub: `CV ${breathRateCV}%`,
      color: regularityColor,
    },
    {
      label: 'RSA-amplitudetrend',
      value: `${trendIcon} ${trendLabel}`,
      sub: 'eerste vs tweede helft sessie',
      color: trendColor,
    },
    {
      label: 'Sigh-frequentie',
      value: `${sighRatePerMin.toFixed(2)}/min`,
      sub: 'uitschieters in RSA-amplitude',
      color: sighRatePerMin > 0.3
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-gray-800 dark:text-gray-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(m => (
        <div key={m.label} className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3">
          <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
            {m.label}
          </div>
          <div className={`text-sm font-bold ${m.color}`}>{m.value}</div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{m.sub}</div>
        </div>
      ))}
    </div>
  );
}
