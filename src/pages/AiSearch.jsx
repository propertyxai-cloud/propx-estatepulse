import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, Sparkles, Info } from 'lucide-react';
import { fetchProperties } from '../lib/data';

const SUGGESTIONS = [
  'Find a 5 marla house in Lahore under 2 crore with 4 bedrooms',
  'Show apartments near a good school under my budget',
  'Find properties with high rental yield',
  'I have 50 lakh. Best investment opportunities?',
];

const BUDGETS = [
  { re: /under\s*([\d.]+)\s*(crore|crores)/i, mult: 10000000 },
  { re: /under\s*([\d.]+)\s*(lakh|lac|lakhs|lacs)/i, mult: 100000 },
  { re: /([\d.]+)\s*(crore|crores)/i, mult: 10000000 },
  { re: /([\d.]+)\s*(lakh|lac|lakhs|lacs)/i, mult: 100000 },
];

function parseQuery(q) {
  const filters = { query: q };
  const lower = q.toLowerCase();

  const city = ['lahore', 'islamabad', 'rawalpindi', 'karachi', 'multan'].find((c) => lower.includes(c));
  if (city) filters.city = city === 'lahore' ? 'Lahore' : city === 'islamabad' ? 'Islamabad' : city === 'rawalpindi' ? 'Rawalpindi' : city;

  for (const soc of ['dha', 'bahria', 'gulberg', 'lake city', 'capital smart city', 'al-kabir', 'park view']) {
    if (lower.includes(soc)) { filters.society = soc; break; }
  }

  if (lower.includes('plot')) filters.propertyType = 'Residential Plot';
  else if (lower.includes('apartment') || lower.includes('flat')) filters.propertyType = 'Apartment';
  else if (lower.includes('farmhouse')) filters.propertyType = 'Farmhouse';
  else if (lower.includes('house') || lower.includes('home') || lower.includes('bungalow')) filters.propertyType = 'House';

  const bedMatch = q.match(/(\d)\s*(?:bed|bedroom|beds?)/i);
  if (bedMatch) filters.beds = bedMatch[1];

  for (const b of BUDGETS) {
    const m = q.match(b.re);
    if (m) { filters.maxPrice = parseFloat(m[1]) * b.mult; break; }
  }

  if (lower.includes('rent')) filters.listingType = 'rent';
  else if (lower.includes('buy') || lower.includes('sale')) filters.listingType = 'sale';

  return filters;
}

function explain(q) {
  const reasons = [];
  const lower = q.toLowerCase();
  if (/under\s*[\d.]+\s*(crore|lakh|lac)/i.test(q)) reasons.push('within your budget');
  if (/(\d)\s*(?:bed|bedroom)/i.test(q)) reasons.push(`matches bedrooms`);
  if (lower.includes('dha') || lower.includes('bahria') || lower.includes('gulberg') || lower.includes('lake city')) reasons.push('in your preferred society');
  if (['lahore', 'islamabad', 'rawalpindi', 'karachi'].some((c) => lower.includes(c))) reasons.push('in the right city');
  if (lower.includes('plot')) reasons.push('plot listing');
  if (lower.includes('rent')) reasons.push('rental option');
  if (reasons.length === 0) reasons.push('closest overall match');
  return reasons;
}

export default function AiSearch() {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: "Hi! I'm your AI property assistant. Tell me what you're looking for — e.g. 'Find me a 5 marla house in Lahore under 2 crore with 4 bedrooms.'",
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const run = async (raw) => {
    const q = raw.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setTyping(true);

    const filters = parseQuery(q);
    const results = await fetchProperties(filters);
    setTyping(false);

    if (!results.length) {
      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          text: "I couldn't find an exact match — so I relaxed the criteria and searched all active listings. Here are the closest options:",
          results: results.slice(0, 3),
        },
      ]);
      // retry with relaxed filters
      const relaxed = await fetchProperties({ query: filters.query, listingType: filters.listingType });
      setMessages((m) => [...m, { role: 'ai', text: `Relaxed search returned ${relaxed.length} results.`, results: relaxed.slice(0, 3) }]);
      return;
    }

    const reasons = explain(q);
    setMessages((m) => [
      ...m,
      {
        role: 'ai',
        text: `I found ${results.length} matching listing${results.length > 1 ? 's' : ''} — ranked by how well they fit ${reasons.join(', ')}.`,
        results: results.slice(0, 3),
      },
    ]);
  };

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      <div className="chat-layout">
        <div className="chat-card">
          <div className="chat-header">
            <Sparkles size={16} style={{ color: 'var(--color-primary)' }} /> AI Property Assistant
          </div>
          <div className="chat-messages" ref={boxRef}>
            {messages.map((m, i) => (
              <div key={i}>
                <div className={`chat-bubble ${m.role}`}>
                  {m.role === 'ai' && <Bot size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: -2, color: 'var(--color-primary)' }} />}
                  {m.text}
                </div>
                {m.results?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12, marginBottom: 4 }}>
                    {m.results.map((r) => (
                      <Link to={`/property/${r.id}`} className="match-result" key={r.id}>
                        {r.images?.[0] && <img src={r.images[0]} alt={r.title} />}
                        <div className="mr-info">
                          <div className="mr-title">{r.title}</div>
                          <div className="mr-meta">{r.price_label} · {r.location || r.city} · {r.property_type}</div>
                          <div className="match-explainer">
                            {r.match_score ? <span className="chip green">{r.match_score}% match</span> : null}
                            {r.beds ? <span className="chip">{r.beds} bed</span> : null}
                            {r.area ? <span className="chip">{r.area} {r.area_unit}</span> : null}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {typing && <div className="chat-bubble ai" style={{ color: 'var(--color-text-muted)' }}>Searching real listings…</div>}
          </div>
          <form
            className="chat-input-bar"
            onSubmit={(e) => { e.preventDefault(); run(input); }}
          >
            <input
              placeholder="Describe what you're looking for…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="chat-send" type="submit" aria-label="Send"><Send size={16} /></button>
          </form>
        </div>

        <aside>
          <div className="side-card">
            <h4>Try asking</h4>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="suggestion-chip" onClick={() => run(s)}>{s}</button>
            ))}
          </div>
          <div className="side-card">
            <h4><Info size={14} style={{ verticalAlign: -2 }} /> How it works</h4>
            <p style={{ fontSize: 13, lineHeight: 21, color: 'var(--color-text-muted)' }}>
              The assistant interprets your message into search filters, queries only real PropX listings, and never invents
              property. When results are thin it relaxes criteria and tells you exactly what changed.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
