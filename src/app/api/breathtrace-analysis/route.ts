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

  return `Je bent een expert in ademhalingspatroonanalyse met sterke communicatieve vaardigheden. Je taak is om de meetresultaten van deze sessie helder en begrijpelijk te beschrijven — alsof je ze uitlegt aan iemand die geïnteresseerd is maar geen medische achtergrond heeft. Schrijf warm maar zakelijk, in gewone taal. Vermijd vakjargon tenzij je het meteen uitlegt. Geen aannames over onderliggende aandoeningen. Gebruik **vetgedrukte termen** enkel voor de meest relevante begrippen. Schrijf in lopende alinea's. Max 220 woorden.

ACHTERGROND VOOR JOUW INTERPRETATIE (niet letterlijk herhalen in de tekst):
- De meting werkt via RSA: het hart versnelt licht bij inademing en vertraagt bij uitademing. Uit dit ritme worden ademfrequentie, regelmaat en opvallende ademhalingen (sighs) afgeleid.
- RMSSD weerspiegelt hier voornamelijk hoe diep iemand ademt, niet rechtstreeks de gezondheid van het zenuwstelsel. Klein ademen = lage RMSSD, diep ademen = hogere RMSSD.
- Een sigh is een ademhaling die statistisch ver boven de rest uitsteekt (strenge drempel: ≥1.8× mediaan én boven het bovenste kwartiel × 1.4). Het zijn echte uitschieters, geen gewone diepe ademhalingen.
- Ademregulariteit (CV) zegt iets over hoe consistent het ritme was, niet of het goed of slecht is.
- Sigh-frequentie wordt in onderzoek gelinkt aan ademdrang, maar is op zichzelf geen diagnose.

SESSIEDATA:
Duur: ${Math.floor(s.durationSec / 60)}m${s.durationSec % 60}s | Hartfrequentie: ${s.meanHR} bpm | Ademfrequentie: ${s.breathRate || '?'} per minuut
RMSSD: ${s.rmssd}ms | RSA-amplitude mediaan: ${s.medAmp}ms | RSA-amplitude piek: ${s.maxAmp}ms
Aantal slagen: ${s.totalBeats} | Sighs: ${s.nSigh} (${s.sighRatePerMin.toFixed(2)} per minuut)
Ademregelmaat: ${regularityLabel} (variatie: ${s.breathRateCV.toFixed(0)}%)
Amplitudetrend: ${trendLabel}

SIGH-MOMENTEN:
${evLines}

Schrijf de beschrijving in drie natuurlijke alinea's:
1. Wat er globaal gemeten werd — tempo, regelmaat, hoe de ademhaling aanvoelde in de data.
2. Wat de RMSSD en amplitudetrend zeggen in begrijpelijke termen.
3. De sighs: wanneer, hoe vaak, wat dat betekent in de context van deze sessie. Sluit af met één observatie die opvalt, zonder een conclusie te trekken over oorzaak of diagnose.`;
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
