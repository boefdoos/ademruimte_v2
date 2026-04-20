import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface BreathTraceSummary {
  durationSec: number;
  meanHR: number;
  breathRate: string | null;
  rmssd: number;
  rrRange: number;
  medAmp: number;
  maxAmp: number;
  totalBeats: number;
  nSigh: number;
  sighRatePerMin: number;
  breathRateCV: number;       // Coefficient of variation van cyclusduur (lagere = regelmatiger)
  rsaTrend: 'increasing' | 'decreasing' | 'stable';
  events: Array<{ ts: string; type: string; detail: string }>;
}

function buildPrompt(s: BreathTraceSummary): string {
  const regularityLabel =
    s.breathRateCV < 10 ? 'zeer regelmatig' :
    s.breathRateCV < 20 ? 'redelijk regelmatig' :
    s.breathRateCV < 35 ? 'matig onregelmatig' : 'sterk onregelmatig';

  const trendLabel =
    s.rsaTrend === 'increasing' ? 'toenemend (RSA-amplitude werd groter over de sessie)' :
    s.rsaTrend === 'decreasing' ? 'afnemend (RSA-amplitude werd kleiner over de sessie)' :
    'stabiel';

  const evLines = s.events.length
    ? s.events.map(e => `  ${e.ts}  [${e.type}]  ${e.detail}`).join('\n')
    : '  (geen sighs gedetecteerd)';

  return `Je bent een expert in ademhalingspatroonanalyse bij chronische hyperventilatie (CHV). Analyseer deze hartslagtachogram-sessie. Schrijf in lopende tekst, geen bullet points. Gebruik **vetgedrukte termen** bij sleutelwoorden. Max 280 woorden.

CONTEXT (lees aandachtig):
- RMSSD hier = RSA-amplitude (mechanische koppeling ademhaling–hartritme). Klein ademen → lage RMSSD. Dit is GEEN marker van autonome verslechtering.
- RSA-amplitudetrend zegt iets over of de ademhaling dieper of oppervlakkiger werd over de sessie.
- Sigh = grote RSA-cyclus (amplitude-outlier t.o.v. de rest). Hoge sigh-rate per minuut is klinisch relevanter dan het totaal.
- Ademregulariteit (CV van cyclusduur) is een patroonmaat: onregelmatig = wisselende cycluslengtes = mogelijk gestoord adempatroon.
- Hoge ademfrequentie (>15 bpm in rust) wijst op hyperventilatie. Lage (<8 bpm) wijst op gedempt/bewust ademen.

SESSIEDATA:
Duur: ${Math.floor(s.durationSec / 60)}m${s.durationSec % 60}s | HR: ${s.meanHR} bpm | BR: ${s.breathRate || '?'} bpm
RMSSD: ${s.rmssd}ms | RR-bereik: ${s.rrRange}ms | RSA mediaan: ${s.medAmp}ms | RSA max: ${s.maxAmp}ms
Beats: ${s.totalBeats} | Sighs: ${s.nSigh} (${s.sighRatePerMin.toFixed(2)}/min)
Ademregulariteit: ${regularityLabel} (CV: ${s.breathRateCV.toFixed(0)}%)
RSA-amplitudetrend: ${trendLabel}

SIGH-EVENTS:
${evLines}

Bespreek: (1) patroon en ademfrequentie, (2) RMSSD-betekenis in context, (3) sighs en hun distributie over de sessie, (4) amplitudetrend en regulariteit als CHV-indicatoren.`;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 503 });
  }
  try {
    const summary: BreathTraceSummary = await request.json();
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: buildPrompt(summary) }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new NextResponse(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (e) {
    console.error('BreathTrace analysis error:', e);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
