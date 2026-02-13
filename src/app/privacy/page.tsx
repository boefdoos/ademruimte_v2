import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
          Privacybeleid
        </h1>
        <p className="text-gray-500 text-sm mb-8">Laatst bijgewerkt: 12 januari 2026</p>

        <div className="bg-cyan-50 border-l-4 border-cyan-600 p-4 mb-6">
          <strong>In het kort:</strong> Ademruimte respecteert je privacy. We verzamelen alleen data die nodig is voor de app functionaliteit en delen deze nooit met derden voor marketing doeleinden.
        </div>

        {/* Section 1 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-cyan-700 mb-3">1. Wie zijn wij?</h2>
          <p className="mb-3">
            <strong>Ademruimte</strong> is een web-applicatie voor het bijhouden en verbeteren van chronische hyperventilatie door middel van de Buteyko methode.
          </p>
          <p>
            Verantwoordelijke voor gegevensverwerking:<br />
            Thomas Oostberg<br />
            Email: troostberg@gmail.com
          </p>
        </section>

        {/* Section 2 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-cyan-700 mb-3">2. Welke gegevens verzamelen we?</h2>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">2.1 Accountgegevens</h3>
          <ul className="list-disc ml-6 mb-4 space-y-1">
            <li><strong>Email adres</strong> - Voor authenticatie en accountherstel</li>
            <li><strong>Unieke gebruikers-ID</strong> - Automatisch gegenereerd door Firebase</li>
            <li><strong>Aanmaakdatum account</strong> - Voor administratieve doeleinden</li>
          </ul>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">2.2 Gezondheidsgegevens</h3>
          <ul className="list-disc ml-6 mb-4 space-y-1">
            <li><strong>Dagboek entries</strong> - Ademhalingsoefeningen, symptomen, triggers, intensiteitsscores</li>
            <li><strong>Medicatie tracking</strong> - Vrijwillig ingevoerde medicatie informatie</li>
            <li><strong>Control Pause metingen</strong> - CO2 tolerantie scores</li>
            <li><strong>Persoonlijke notities</strong> - Vrijwillig ingevoerde tekst</li>
          </ul>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">2.3 Technische gegevens</h3>
          <ul className="list-disc ml-6 mb-4 space-y-1">
            <li><strong>Login tijdstippen</strong> - Voor security en sessie management</li>
            <li><strong>Device voorkeuren</strong> - Lokaal opgeslagen (bijv. haptische feedback)</li>
            <li><strong>Browser type</strong> - Voor technische ondersteuning</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-cyan-700 mb-3">3. Waarom verzamelen we deze gegevens?</h2>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">3.1 Rechtsgrondslag (Art. 6 AVG)</h3>
          <ul className="list-disc ml-6 mb-4 space-y-1">
            <li><strong>Toestemming (Art. 6.1.a)</strong> - Voor gezondheidsgegevens verwerking</li>
            <li><strong>Uitvoering overeenkomst (Art. 6.1.b)</strong> - Voor basis app functionaliteit</li>
            <li><strong>Gerechtvaardigd belang (Art. 6.1.f)</strong> - Voor functionele cookies en security</li>
          </ul>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">3.2 Doeleinden</h3>
          <ul className="list-disc ml-6 mb-4 space-y-1">
            <li>Bijhouden van ademhalingsoefeningen en voortgang</li>
            <li>Genereren van persoonlijke inzichten en patronen</li>
            <li>Synchroniseren van data tussen je devices</li>
            <li>Verbeteren van de app functionaliteit</li>
            <li>Technische ondersteuning en bugfixes</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-cyan-700 mb-3">4. Met wie delen we gegevens?</h2>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">4.1 Verwerkers</h3>
          <p className="font-semibold mb-2">Google Firebase (Google Cloud)</p>
          <ul className="list-disc ml-6 mb-4 space-y-1">
            <li>Locatie: EU servers (België/Nederland)</li>
            <li>Doel: Database hosting en authenticatie</li>
            <li>Verwerkersovereenkomst: Standard Contractual Clauses (SCCs)</li>
            <li>Privacy: <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">Firebase Privacy</a></li>
          </ul>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">4.2 Geen marketing of verkoop</h3>
          <div className="bg-cyan-50 border-l-4 border-cyan-600 p-4 mb-4">
            We verkopen of verhuren <strong>NOOIT</strong> je gegevens aan derden voor marketing doeleinden.
          </div>
        </section>

        {/* Section 5 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-cyan-700 mb-3">5. Hoe lang bewaren we gegevens?</h2>
          <ul className="list-disc ml-6 mb-4 space-y-1">
            <li><strong>Actieve accounts</strong> - Zolang je account bestaat</li>
            <li><strong>Na account verwijdering</strong> - Direct verwijderd uit productie databases</li>
            <li><strong>Backups</strong> - Maximum 30 dagen retention</li>
            <li><strong>Logs</strong> - Maximum 90 dagen</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-cyan-700 mb-3">6. Jouw rechten (AVG Art. 15-22)</h2>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">6.1 Recht op inzage (Art. 15)</h3>
          <p className="mb-3">Je kunt al je gegevens inzien via de &quot;Mijn Gegevens&quot; sectie in de app.</p>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">6.2 Recht op rectificatie (Art. 16)</h3>
          <p className="mb-3">Je kunt je gegevens aanpassen via de app interface.</p>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">6.3 Recht op verwijdering (Art. 17)</h3>
          <p className="mb-3">Je kunt je account en alle gegevens verwijderen via &quot;Account Verwijderen&quot; in de instellingen.</p>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">6.4 Recht op gegevensoverdracht (Art. 20)</h3>
          <p className="mb-3">Je kunt al je gegevens exporteren in JSON formaat via de &quot;Exporteer Data&quot; functie.</p>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">6.5 Recht op bezwaar (Art. 21)</h3>
          <p className="mb-3">Je kunt bezwaar maken tegen verwerking door je toestemming in te trekken.</p>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">6.6 Klachten</h3>
          <p className="mb-3">
            Je hebt het recht een klacht in te dienen bij de toezichthouder:<br />
            <strong>Gegevensbeschermingsautoriteit (België)</strong><br />
            Website: <a href="https://www.gegevensbeschermingsautoriteit.be" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">gegevensbeschermingsautoriteit.be</a>
          </p>
        </section>

        {/* Section 7 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-cyan-700 mb-3">7. Beveiliging</h2>
          <ul className="list-disc ml-6 mb-4 space-y-1">
            <li><strong>Encryptie in transit</strong> - HTTPS/TLS voor alle communicatie</li>
            <li><strong>Encryptie at rest</strong> - Firebase database encryptie</li>
            <li><strong>Authenticatie</strong> - Firebase Authentication met wachtwoord hashing</li>
            <li><strong>Toegangscontrole</strong> - Firestore security rules</li>
            <li><strong>Regular updates</strong> - Beveiligingspatches en monitoring</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-cyan-700 mb-3">8. Cookies en tracking</h2>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">8.1 Essentiële cookies (geen toestemming nodig)</h3>
          <ul className="list-disc ml-6 mb-4 space-y-1">
            <li><strong>Firebase Authentication</strong> - Voor inloggen en sessie management</li>
            <li><strong>localStorage</strong> - Voor device voorkeuren (haptische feedback, dev mode)</li>
          </ul>

          <h3 className="text-xl font-semibold text-cyan-600 mb-2 mt-4">8.2 Geen tracking cookies</h3>
          <p className="mb-2">We gebruiken <strong>GEEN</strong>:</p>
          <ul className="list-disc ml-6 mb-4 space-y-1">
            <li>Google Analytics</li>
            <li>Facebook Pixel</li>
            <li>Marketing cookies</li>
            <li>Cross-site tracking</li>
          </ul>
        </section>

        {/* Section 9 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-cyan-700 mb-3">9. Kinderen</h2>
          <p>
            Ademruimte is niet bedoeld voor kinderen onder de 16 jaar zonder toestemming van ouders/voogd.
            Als je onder de 16 bent, vraag toestemming aan je ouders voordat je een account aanmaakt.
          </p>
        </section>

        {/* Section 10 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-cyan-700 mb-3">10. Wijzigingen in dit beleid</h2>
          <p>
            We kunnen dit privacybeleid bijwerken. De laatste versie is altijd beschikbaar in de app en op onze website.
            Bij significante wijzigingen sturen we een notificatie naar je email.
          </p>
        </section>

        {/* Section 11 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-cyan-700 mb-3">11. Contact</h2>
          <p className="mb-2">Voor vragen over dit privacybeleid of je gegevens:</p>
          <ul className="list-disc ml-6 mb-4 space-y-1">
            <li><strong>Email:</strong> troostberg@gmail.com</li>
            <li><strong>In-app:</strong> Contactformulier in instellingen</li>
          </ul>
        </section>

        {/* Back button */}
        <div className="mt-8 pt-6 border-t">
          <Link
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Terug naar Ademruimte
          </Link>
        </div>
      </div>
    </div>
  );
}
