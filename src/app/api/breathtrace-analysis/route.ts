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

  return `Je bent een expert in ademhalingspatroonanalyse. Schrijf een objectieve, feitelijke beschrijving van wat er in deze hartslagtachogram-sessie gemeten werd. Geen aannames over onderliggende aandoeningen. Gebruik **vetgedrukte termen** bij sleutelbegrippen. Schrijf in lopende tekst, geen bullet points. Max 250 woorden.

MEETMETHODE:
RSA (Respiratory Sinus Arrhythmia): het hartritme versnelt tijdens inademing en vertraagt tijdens uitademing. Uit de RR-intervalreeks worden ademfrequentie, cyclus-regelmaat en sighs (uitzonderlijk grote RSA-cycli) afgeleid.

BELANGRIJKE KANTTEKENINGEN BIJ DE INTERPRETATIE:
- RMSSD in deze korte meting weerspiegelt primair RSA-amplitude, niet autonoom welzijn. Oppervlakkig ademen geeft lage RMSSD, diep ademen geeft hoge RMSSD — ongeacht vagale tonus.
- Een sigh is hier gedefinieerd als een RSA-cyclus met amplitude ≥2× de mediaan én >2.5 SD boven het gemiddelde. Dit is een strenge drempel; het zijn echte uitschieters.
- Sigh-frequentie >0.2/min wordt in de literatuur geassocieerd met verhoogde ademdrang, maar is op zichzelf geen klinische bevinding.
- Ademregulariteit (CV van cyclusduur) beschrijft consistentie van het ritme, niet kwaliteit.

SESSIEDATA:
Duur: ${Math.floor(s.durationSec / 60)}m${s.durationSec % 60}s | HR: ${s.meanHR} bpm | BR: ${s.breathRate || '?'} bpm
RMSSD: ${s.rmssd}ms | RR-bereik: ${s.rrRange}ms | RSA mediaan: ${s.medAmp}ms | RSA max: ${s.maxAmp}ms
Beats: ${s.totalBeats} | Sighs: ${s.nSigh} (${s.sighRatePerMin.toFixed(2)}/min)
Ademregulariteit: ${regularityLabel} (CV: ${s.breathRateCV.toFixed(0)}%)
RSA-amplitudetrend: ${trendLabel}

SIGH-EVENTS:
${evLines}

Beschrijf: (1) het algemene adempatroon en frequentie in neutrale termen, (2) de RMSSD in de context van de meetmethode, (3) de sigh-events feitelijk — hoe frequent, hoe verdeeld over de sessie, (4) de RSA-trend en regulariteit objectief. Sluit eventueel af met één zin over wat opvalt, zonder conclusies te trekken.`;
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
