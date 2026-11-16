export function resolveCurrencyCode(query, city = null) {
  const upper = String(query ?? '').toUpperCase();
  const explicit = upper.match(/\b(PKR|AED|SAR|QAR|KWD|BHD|OMR|USD|CAD|AUD|NZD|GBP|EUR|INR|SGD|JPY|CNY|TRY|CHF)\b/);
  if (explicit) return explicit[1];

  const lower = String(query ?? '').toLowerCase();
  if (/\b(pakistani rupees?|pakistan rupees?)\b/.test(lower)) return 'PKR';
  if (/\b(dirhams?|uae dirhams?)\b/.test(lower)) return 'AED';
  if (/\bsaudi riyals?\b/.test(lower)) return 'SAR';
  if (/\b(us dollars?|american dollars?)\b/.test(lower)) return 'USD';
  if (/\b(pounds?|sterling)\b/.test(lower)) return 'GBP';
  if (/\beuros?\b/.test(lower)) return 'EUR';
  if (/\bindian rupees?\b/.test(lower)) return 'INR';
  if (/\bsingapore dollars?\b/.test(lower)) return 'SGD';
  if (/\byen\b/.test(lower)) return 'JPY';
  if (/\bcanadian dollars?\b/.test(lower)) return 'CAD';
  if (/\baustralian dollars?\b/.test(lower)) return 'AUD';

  const cityCurrency = {
    lahore: 'PKR', islamabad: 'PKR', rawalpindi: 'PKR', karachi: 'PKR', multan: 'PKR',
    dubai: 'AED', 'abu dhabi': 'AED', london: 'GBP', singapore: 'SGD',
    'new york': 'USD', toronto: 'CAD', sydney: 'AUD', mumbai: 'INR', delhi: 'INR',
  };
  const normalizedCity = String(city ?? '').toLowerCase();
  if (cityCurrency[normalizedCity]) return cityCurrency[normalizedCity];
  if (/\b(pakistan|lahore|islamabad|karachi|rawalpindi)\b/.test(lower)) return 'PKR';
  if (/\b(india|mumbai|delhi)\b/.test(lower)) return 'INR';
  if (/\b(uae|united arab emirates|dubai|abu dhabi)\b/.test(lower)) return 'AED';
  if (/\b(united kingdom|uk|london|england)\b/.test(lower)) return 'GBP';
  if (/\b(united states|usa|us|new york)\b/.test(lower)) return 'USD';
  if (/\b(singapore)\b/.test(lower)) return 'SGD';
  if (/\b(canada|toronto)\b/.test(lower)) return 'CAD';
  if (/\b(australia|sydney)\b/.test(lower)) return 'AUD';
  if (/\b(new zealand|auckland)\b/.test(lower)) return 'NZD';
  return null;
}

export function parseLocalFallback(query) {
  const text = String(query ?? '').trim().slice(0, 500);
  const lower = text.toLowerCase();
  const filters = { query: text };
  const cities = [
    'new york', 'abu dhabi', 'lahore', 'islamabad', 'rawalpindi', 'karachi',
    'multan', 'dubai', 'london', 'singapore', 'mumbai', 'delhi', 'toronto', 'sydney',
  ];
  const city = cities.find((value) => lower.includes(value));
  if (city) {
    filters.city = city.replace(/\b\w/g, (letter) => letter.toUpperCase());
    filters.currencyCode = resolveCurrencyCode(text, city);
  } else {
    filters.currencyCode = resolveCurrencyCode(text);
  }

  if (/\b(rent|rental|lease)\b/.test(lower)) filters.listingType = lower.includes('lease') ? 'lease' : 'rent';
  else if (/\b(buy|sale|purchase)\b/.test(lower)) filters.listingType = 'sale';

  const beds = text.match(/(\d+)\s*(?:bed|bedroom)/i);
  if (beds) filters.beds = Number(beds[1]);

  const money = text.match(/(?:under|below|max(?:imum)?|budget(?:\s+of)?)\s*([\d,.]+)\s*(crore|crores|cr|lakh|lac|lakhs|lacs|million|m|k)?/i);
  if (money) {
    const amount = Number(money[1].replace(/,/g, ''));
    const unit = (money[2] || '').toLowerCase();
    const multiplier = ['crore', 'crores', 'cr'].includes(unit) ? 10000000
      : ['lakh', 'lac', 'lakhs', 'lacs'].includes(unit) ? 100000
      : ['million', 'm'].includes(unit) ? 1000000
      : unit === 'k' ? 1000 : 1;
    if (Number.isFinite(amount) && amount > 0 && filters.currencyCode) {
      filters.maxPrice = amount * multiplier;
    } else if (Number.isFinite(amount) && amount > 0) {
      filters.priceNeedsCurrency = true;
    }
  }

  if (lower.includes('plot')) filters.propertyType = 'Residential Plot';
  else if (lower.includes('apartment') || lower.includes('flat')) filters.propertyType = 'Apartment';
  else if (lower.includes('farmhouse')) filters.propertyType = 'Farmhouse';
  else if (lower.includes('house')) filters.propertyType = 'House';
  return filters;
}

export function normalizeAiSearchFilters(aiFilters = {}, query = '') {
  const candidate = String(aiFilters.currencyCode || aiFilters.currency_code || '').toUpperCase();
  const currencyCode = /^[A-Z]{3}$/.test(candidate) ? candidate : null;
  const hasBudget = aiFilters.minPrice != null || aiFilters.maxPrice != null;
  const validListingType = ['sale', 'rent', 'lease'].includes(String(aiFilters.type ?? '').toLowerCase())
    ? String(aiFilters.type).toLowerCase()
    : null;

  return {
    hasBudgetWithoutCurrency: hasBudget && !currencyCode,
    filters: {
      query: aiFilters.q || query,
      city: aiFilters.city || null,
      country: aiFilters.country || null,
      currencyCode,
      listingType: validListingType,
      minPrice: currencyCode ? (aiFilters.minPrice ?? null) : null,
      maxPrice: currencyCode ? (aiFilters.maxPrice ?? null) : null,
      beds: aiFilters.beds ?? null,
      baths: aiFilters.baths ?? null,
      propertyType: aiFilters.propertyType ?? null,
    },
  };
}
