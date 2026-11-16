import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, Sparkles, Info, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchProperties, requireSupabase } from '../lib/data';
import { normalizeAiSearchFilters, parseLocalFallback } from '../lib/aiSearchFilters';

const SUGGESTIONS = [
  'Find a 5 marla house in Lahore under 2 crore with 4 bedrooms',
  'Show apartments for rent in Islamabad',
  'Compare homes in Dubai and Lahore',
  'Find properties with a published rental yield',
];


export default function AiSearch() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([{
    role: 'ai',
    text: 'Describe the country, city, property type, budget and features you need. I will search approved live PropertyX listings and explain what matches.',
  }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [notice, setNotice] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const run = async (raw) => {
    const query = raw.trim().slice(0,500);
    if (!query || typing) return;
    setMessages((items) => [...items, { role:'user', text:query }]);
    setInput(''); setTyping(true); setNotice('');
    try {
      const client = requireSupabase();
      let filters;
      let explanation = '';
      try {
        const { data, error } = await client.functions.invoke('ai-assistant', {
          body: { action:'search', payload:{ query } },
        });
        if (error) throw error;
        const result = data?.result || {};
        const aiFilters = result.filters || {};
        const normalized = normalizeAiSearchFilters(aiFilters, query);
        filters = normalized.filters;
        if (normalized.hasBudgetWithoutCurrency) {
          setNotice('I found a budget but could not establish its currency. I searched without a price filter to avoid comparing different currencies.');
        }
        explanation = result.explanation || '';
      } catch (aiError) {
        filters = parseLocalFallback(query);
        const budgetNotice = filters.priceNeedsCurrency
          ? ' Your budget needs a currency code or an unambiguous city; I did not apply a mixed-currency price filter.'
          : '';
        setNotice(`AI interpretation is temporarily unavailable; I searched using basic filters instead. ${aiError.message || ''}${budgetNotice}`);
      }

    if ((filters.minPrice != null || filters.maxPrice != null) && !filters.currencyCode) {
      filters.minPrice = null;
      filters.maxPrice = null;
      setNotice('I could not establish the budget currency. I searched without a price filter to avoid comparing different currencies.');
    }
      const results = await fetchProperties(filters);
      let response = explanation || `Found ${results.length} approved live listing(s) matching your search.`;
      if (!results.length) response += ' There are no approved live listings for those filters yet. Try broadening your search or change city/country.';
      else response += ' I have not estimated yields, market trends or distances unless that data is present in the listing.';
      let suggestions = results.slice(0,5);

      if (results.length && user) {
        try {
          const { data } = await client.functions.invoke('ai-assistant', {
            body: { action:'advisor', payload:{ message:query, listings:suggestions.map((p)=>({
              id:p.id,title:p.title,price:p.price,price_label:p.price_label,currency:p.currency_code||p.currency,
              city:p.city,country:p.country,property_type:p.property_type,beds:p.beds,baths:p.baths,area:p.area,area_unit:p.area_unit,
              features:p.features,est_yield:p.est_yield,est_roi:p.est_roi,
            })) } },
          });
          if (data?.result?.reply) response = data.result.reply;
        } catch { /* Live search is still useful even if AI narrative is unavailable. */ }
      }

      setMessages((items)=>[...items,{role:'ai',text:response,results:suggestions}]);
    } catch (error) {
      setMessages((items)=>[...items,{role:'ai',text:`I could not complete a live marketplace search: ${error.message || 'Unknown error'}. Please retry in a moment.`}]);
    } finally { setTyping(false); }
  };

  return (
    <div className="container page-section">
      {notice && <div className="notice"><AlertCircle size={15}/>{notice}</div>}
      <div className="chat-layout">
        <div className="chat-card">
          <div className="chat-header"><Sparkles size={16}/> PropertyX AI property intelligence</div>
          <div className="chat-messages" ref={boxRef} aria-live="polite">
            {messages.map((message,index)=>(
              <div key={index}>
                <div className={`chat-bubble ${message.role}`}>
                  {message.role==='ai' && <Bot size={13} style={{display:'inline',marginRight:6,verticalAlign:-2}}/>}
                  {message.text}
                </div>
                {message.results?.length>0 && <div className="ai-result-list">
                  {message.results.map((property)=><Link to={`/property/${property.id}`} className="match-result" key={property.id}>
                    {property.images?.[0] && <img src={property.images[0]} alt={property.title} loading="lazy"/>}
                    <div className="mr-info"><b className="mr-title">{property.title}</b>
                      <span className="mr-meta">{property.price_label || property.price} · {[property.city,property.country].filter(Boolean).join(', ')}</span>
                      <span className="mr-meta">{[property.property_type,property.beds ? `${property.beds} bed` : null].filter(Boolean).join(' · ')}</span>
                    </div>
                  </Link>)}
                </div>}
              </div>
            ))}
            {typing && <div className="chat-bubble ai">Searching approved live listings and interpreting your requirements…</div>}
          </div>
          <form className="chat-input-bar" onSubmit={(event)=>{event.preventDefault();run(input);}}>
            <input value={input} onChange={(event)=>setInput(event.target.value)} maxLength={500} placeholder="Ask about a property, budget or location…" />
            <button className="chat-send" type="submit" aria-label="Send search" disabled={typing || !input.trim()}><Send size={16}/></button>
          </form>
        </div>
        <aside>
          <div className="side-card"><h4>Try asking</h4>{SUGGESTIONS.map((item)=><button className="suggestion-chip" key={item} onClick={()=>run(item)} disabled={typing}>{item}</button>)}</div>
          <div className="side-card"><h4><Info size={14}/> How it works</h4><p className="muted-copy">The AI converts your request into search filters and can explain matches using the actual listing fields. It cannot verify ownership, guarantee returns or make up inventory.</p></div>
        </aside>
      </div>
    </div>
  );
}
