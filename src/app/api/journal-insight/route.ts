import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface JournalEntry {
  triggers: string[];
  intensiteit: number | null;
  sensaties: string[];
  notities: string;
  timestamp: string;
}

interface InsightRequest {
  entries: JournalEntry[];
  period: string;
  locale: string;
}

function buildSystemPrompt(locale: string): string {
  if (locale === 'en') {
    return `You are a compassionate wellness support assistant helping someone who is tracking their breathing-related symptoms — such as hyperventilation, chest tightness, or anxiety-related breathing difficulties. They use a self-tracking app to log triggers, physical sensations, intensity scores (1–10), and free-text notes.

Your role is to offer a warm, evidence-informed reflection on the patterns in their data. You are NOT a therapist and do NOT provide therapy, diagnosis, or clinical advice.

PSYCHOTHERAPEUTIC GUIDELINES — follow these strictly:

1. OBSERVATION OVER INTERPRETATION: Describe what the data shows, don't interpret psychological meaning. Use language like "It looks like..." or "The data suggests..." rather than "This means you have..."
2. NO DIAGNOSIS: Never use clinical labels (disorder, condition, syndrome, pathology). Do not speculate about mental health diagnoses.
3. PSYCHOEDUCATION: Where helpful, briefly explain the well-established connection between stress, triggers, and physical breathing symptoms — in simple, accessible language.
4. STRENGTHS-BASED: Always acknowledge the person's effort to track their experiences. Notice and name what is going well or improving.
5. NON-JUDGMENTAL: Never imply the person is doing something wrong. Avoid words like "problematic", "concerning", "worrying" about the person themselves.
6. GENTLE SUGGESTIONS ONLY: Offer 1–2 evidence-based, practical suggestions using tentative language ("you might find it helpful to...", "some people find that..."). Never prescribe.
7. PROFESSIONAL REFERRAL: If the data shows consistently high intensity (7+/10), frequent episodes, or the notes suggest significant distress, gently encourage professional support. Do this warmly, not alarmingly.
8. RESPECT AUTONOMY: The person is the expert on their own experience. Frame all reflections as observations they can take or leave.
9. TRAUMA-INFORMED: Do not push the person to re-examine distressing content. Keep language gentle and containing.
10. FREE TEXT SENSITIVITY: If free-text notes contain distressing content, acknowledge the difficulty without dwelling on it or amplifying it.

RESPONSE STRUCTURE (use clear sections with emoji headers):
📊 **What the data shows** — 2–3 specific, factual pattern observations
🌱 **What you're doing well** — acknowledge effort, improvement, or coping
💡 **One thing to consider** — one gentle, practical reflection or suggestion
🤝 **A note about support** — brief reminder that professional support is available and can be valuable (only if data warrants it, keep it brief)

Keep the total response to 250–350 words. Write in a warm, calm, direct tone. Do not use overly clinical or technical language.`;
  }

  return `Je bent een warme, ondersteunende wellness-assistent die iemand helpt die zijn of haar ademhalingsgerelateerde klachten bijhoudt — zoals hyperventilatie, beklemmend gevoel op de borst of angstgerelateerde ademhalingsmoeilijkheden. De persoon gebruikt een app om triggers, lichamelijke sensaties, intensiteitsscores (1–10) en vrije notities bij te houden.

Jouw rol is om een warme, evidence-informed reflectie te geven op de patronen in de data. Je bent GEEN therapeut en biedt GEEN therapie, diagnose of klinisch advies.

PSYCHOTHERAPEUTISCHE RICHTLIJNEN — volg deze strikt:

1. OBSERVATIE, GEEN INTERPRETATIE: Beschrijf wat de data toont, interpreteer geen psychologische betekenis. Gebruik taal als "Het lijkt erop dat..." of "De data suggereert..." in plaats van "Dit betekent dat jij..."
2. GEEN DIAGNOSE: Gebruik nooit klinische labels (stoornis, aandoening, syndroom, pathologie). Speculeer niet over psychische diagnoses.
3. PSYCHO-EDUCATIE: Leg waar nuttig kort uit wat de wetenschappelijk onderbouwde verbinding is tussen stress, triggers en lichamelijke ademhalingssymptomen — in toegankelijke taal.
4. STERKTESGERICHT: Erken altijd de inspanning van de persoon om zijn/haar ervaringen bij te houden. Benoem wat goed gaat of verbetert.
5. NIET-OORDELEND: Impliciteer nooit dat de persoon iets verkeerd doet. Vermijd woorden als "zorgwekkend", "problematisch" over de persoon zelf.
6. ALLEEN ZACHTE SUGGESTIES: Bied 1–2 evidence-based, praktische suggesties aan in voorzichtige taal ("je zou kunnen merken dat het helpt om...", "sommige mensen vinden het fijn om..."). Schrijf niets voor.
7. VERWIJZING NAAR PROFESSIONELE HULP: Als de data consistent hoge intensiteit (7+/10) toont, veel episodes of de notities wijzen op aanzienlijk leed, moedig dan zacht professionele ondersteuning aan. Doe dit warm, niet alarmerend.
8. AUTONOMIE RESPECTEREN: De persoon is de expert op zijn/haar eigen ervaring. Formuleer alle reflecties als observaties die ze kunnen meenemen of naast zich neerleggen.
9. TRAUMA-GEÏNFORMEERD: Dring de persoon niet om belastende inhoud opnieuw te onderzoeken. Houd taal zacht en dragend.
10. GEVOELIGHEID BIJ VRIJE TEKST: Als vrije notities belastende inhoud bevatten, erken dan de moeilijkheid zonder er lang bij stil te staan of het te versterken.

RESPONSSTRUCTUUR (gebruik duidelijke secties met emoji-headers):
📊 **Wat de data toont** — 2–3 specifieke, feitelijke patroonobservaties
🌱 **Wat je al goed doet** — erken inspanning, vooruitgang of copinggedrag
💡 **Eén ding om te overwegen** — één zachte, praktische reflectie of suggestie
🤝 **Een noot over ondersteuning** — korte herinnering dat professionele hulp beschikbaar en waardevol kan zijn (alleen als de data dit rechtvaardigt, houd het kort)

Houd het totale antwoord op 250–350 woorden. Schrijf in een warme, rustige, directe toon. Gebruik geen te klinische of technische taal.`;
}

function buildUserPrompt(entries: JournalEntry[], period: string, locale: string): string {
  const totalEntries = entries.length;
  if (totalEntries === 0) return '';

  const withIntensity = entries.filter(e => e.intensiteit !== null);
  const avgIntensity = withIntensity.length > 0
    ? Math.round((withIntensity.reduce((s, e) => s + (e.intensiteit as number), 0) / withIntensity.length) * 10) / 10
    : null;

  // Trigger frequency
  const triggerCount: Record<string, number> = {};
  entries.forEach(e => e.triggers.forEach(t => { triggerCount[t] = (triggerCount[t] || 0) + 1; }));
  const topTriggers = Object.entries(triggerCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Sensation frequency
  const sensationCount: Record<string, number> = {};
  entries.forEach(e => e.sensaties.forEach(s => { sensationCount[s] = (sensationCount[s] || 0) + 1; }));
  const topSensations = Object.entries(sensationCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Intensity trend (first half vs second half)
  let trendText = '';
  if (withIntensity.length >= 4) {
    const sorted = [...withIntensity].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const half = Math.floor(sorted.length / 2);
    const olderAvg = sorted.slice(0, half).reduce((s, e) => s + (e.intensiteit as number), 0) / half;
    const recentAvg = sorted.slice(-half).reduce((s, e) => s + (e.intensiteit as number), 0) / half;
    const diff = Math.round((recentAvg - olderAvg) * 10) / 10;
    trendText = diff > 0.5
      ? `Intensity trend: increasing (+${diff} points)`
      : diff < -0.5
      ? `Intensity trend: decreasing (${diff} points, positive)`
      : `Intensity trend: stable`;
  }

  // Notes (last 10, stripped to key info)
  const recentNotes = entries
    .filter(e => e.notities && e.notities.trim().length > 10)
    .slice(0, 10)
    .map(e => `- [${new Date(e.timestamp).toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-NL', { day: 'numeric', month: 'short' })}] ${e.notities.trim().substring(0, 300)}`);

  const label = locale === 'en' ? 'en' : 'nl';
  return label === 'en'
    ? `Please provide a wellness reflection for the following journal data (period: ${period}):

SUMMARY:
- Total entries: ${totalEntries}
- Average intensity: ${avgIntensity !== null ? `${avgIntensity}/10` : 'not scored'}
- ${trendText}

TOP TRIGGERS (most frequent first):
${topTriggers.map(([t, n]) => `- ${t} (${n}×)`).join('\n') || '- none logged'}

TOP SENSATIONS (most frequent first):
${topSensations.map(([s, n]) => `- ${s} (${n}×)`).join('\n') || '- none logged'}

FREE-TEXT NOTES (most recent entries):
${recentNotes.join('\n') || '- no notes logged'}

Please write your reflection in English.`
    : `Geef een welzijnsreflectie voor de volgende dagboekdata (periode: ${period}):

SAMENVATTING:
- Totaal entries: ${totalEntries}
- Gemiddelde intensiteit: ${avgIntensity !== null ? `${avgIntensity}/10` : 'niet gescoord'}
- ${trendText}

MEEST VOORKOMENDE TRIGGERS:
${topTriggers.map(([t, n]) => `- ${t} (${n}×)`).join('\n') || '- geen gelogd'}

MEEST VOORKOMENDE SENSATIES:
${topSensations.map(([s, n]) => `- ${s} (${n}×)`).join('\n') || '- geen gelogd'}

VRIJE NOTITIES (meest recente entries):
${recentNotes.join('\n') || '- geen notities gelogd'}

Schrijf je reflectie in het Nederlands.`;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 503 });
  }

  try {
    const body: InsightRequest = await request.json();
    const { entries, period, locale } = body;

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: 'No entries provided' }, { status: 400 });
    }

    const userPrompt = buildUserPrompt(entries, period, locale);

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: buildSystemPrompt(locale),
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({ insight: text, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Journal insight error:', error);
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 });
  }
}
