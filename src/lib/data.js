import { supabase } from './supabase';

// ---------- Fallback data (used only when Supabase is unreachable) ----------
export const FALLBACK_PROPERTIES = [
  { id: 'p1', title: '3 Bedroom Apartment in F-11, Islamabad', listing_type: 'rent', property_type: 'Apartment', price: 95000, price_label: 'PKR 95.0K', city: 'Islamabad', society: 'F-11', location: 'F-11, Model Town, Islamabad', area: 1800, area_unit: 'sq ft', beds: 3, baths: 3, description: 'Spacious 3-bed apartment in the heart of F-11, Islamabad. Well-maintained building with security, parking and proximity to schools and markets.', features: ['Gated Community', 'Near Park', 'Security Staff'], badges: ['For Rent', 'Hot'], agent_name: 'Farhan Ali', agent_phone: '+92 300 1112233', agent_verified: false, images: ['/assets/images/prop-1.jpg', '/assets/images/prop-9.jpg'], match_score: 96, view_count: 312, posted_months_ago: 2, est_yield: null, est_roi: null, possession: 'Ready', investment_tagged: false, lat: 33.7066, lng: 73.0468 },
  { id: 'p2', title: '7 Marla Corner Plot in Capital Smart City, Islamabad', listing_type: 'sale', property_type: 'Residential Plot', price: 5200000, price_label: 'PKR 52.00 Lac', installment: 'Installments from PKR 65.0K/mo', city: 'Islamabad', society: 'Capital Smart City', location: 'Harmony Park, Capital Smart City, Islamabad', area: 7, area_unit: 'Marla', beds: null, baths: null, description: 'Corner plot in Harmony Park block of Capital Smart City. File transfer available, possession letter in hand.', features: ['Corner Plot', 'Possession Letter', 'Approved Map'], badges: ['For Sale', 'Hot'], agent_name: 'Capital Dealers', agent_phone: '+92 300 2223344', agent_verified: false, images: ['/assets/images/prop-2.jpg', '/assets/images/prop-10.jpg'], match_score: 91, view_count: 378, posted_months_ago: 2, est_yield: null, est_roi: null, possession: 'Ready', investment_tagged: true, lat: 33.4938, lng: 73.1795 },
  { id: 'p3', title: '10 Marla Residential Plot in Lake City, Lahore', listing_type: 'sale', property_type: 'Residential Plot', price: 18500000, price_label: 'PKR 1.85 Crore', city: 'Lahore', society: 'Lake City', location: 'Sector M-2, Lake City, Lahore', area: 10, area_unit: 'Marla', beds: null, baths: null, description: 'Prime 10 marla residential plot in Lake City Sector M-2. Developed area with paved roads, parks and 24/7 security.', features: ['Developed Area', 'Near Park', 'Gated Community'], badges: ['For Sale'], agent_name: 'Lake City Dealers', agent_phone: '+92 300 3334455', agent_verified: false, images: ['/assets/images/prop-3.jpg', '/assets/images/prop-11.jpg'], match_score: null, view_count: 267, posted_months_ago: 2, est_yield: null, est_roi: null, possession: 'Ready', investment_tagged: false, lat: 31.405, lng: 74.391 },
  { id: 'p4', title: '5 Marla Plot in Bahria Town Phase 8', listing_type: 'sale', property_type: 'Residential Plot', price: 4500000, price_label: 'PKR 45.00 Lac', installment: 'Installments from PKR 55.0K/mo', city: 'Rawalpindi', society: 'Bahria Town', location: 'Block A, Phase 8, Bahria Town, Rawalpindi', area: 5, area_unit: 'Marla', beds: null, baths: null, description: '5 marla plot in Block A, Bahria Town Phase 8. Prime location near main boulevard and commercial zone.', features: ['Approved Map', 'Developed Area', 'Gated Community'], badges: ['For Sale'], agent_name: 'Sara Ahmed', agent_phone: '+92 300 4445566', agent_verified: false, images: ['/assets/images/prop-4.jpg', '/assets/images/prop-12.jpg'], match_score: null, view_count: 189, posted_months_ago: 2, est_yield: null, est_roi: null, possession: 'Ready', investment_tagged: true, lat: 33.485, lng: 73.097 },
  { id: 'p5', title: '1 Kanal Farmhouse in Bedian Road, Lahore', listing_type: 'sale', property_type: 'Farmhouse', price: 28000000, price_label: 'PKR 2.80 Crore', city: 'Lahore', society: 'Bedian Road', location: 'Bedian Road, Lahore', area: 1, area_unit: 'Kanal', beds: 5, baths: 6, description: 'Luxury farmhouse on Bedian Road with landscaped lawn, swimming pool and servant quarters. Ideal weekend retreat or rental income.', features: ['Swimming Pool', 'Lawn', 'Servant Quarter', 'CCTV'], badges: ['For Sale'], agent_name: 'Khalid Mehmood', agent_phone: '+92 300 5556677', agent_verified: false, images: ['/assets/images/prop-5.jpg', '/assets/images/prop-13.jpg'], match_score: null, view_count: 156, posted_months_ago: 2, est_yield: null, est_roi: 12.5, possession: 'Ready', investment_tagged: true, lat: 31.551, lng: 74.4 },
  { id: 'p6', title: '5 Marla House in Al-Kabir Town Phase 2, Lahore', listing_type: 'sale', property_type: 'House', price: 9500000, price_label: 'PKR 95.00 Lac', installment: 'Installments from PKR 1.20 Lac/mo', city: 'Lahore', society: 'Al-Kabir Town', location: 'Phase 2, Al-Kabir Town, Lahore', area: 5, area_unit: 'Marla', beds: 3, baths: 3, description: 'Brand new 5 marla house in Al-Kabir Town Phase 2. Modern construction, possession ready. Great for families.', features: ['Gated Community', 'CCTV', 'Near School'], badges: ['For Sale'], agent_name: 'Usman Properties', agent_phone: '+92 300 6667788', agent_verified: false, images: ['/assets/images/prop-6.jpg', '/assets/images/prop-14.jpg'], match_score: null, view_count: 201, posted_months_ago: 2, est_yield: null, est_roi: 9.4, possession: 'Ready', investment_tagged: false, lat: 31.429, lng: 74.336 },
  { id: 'p7', title: '10 Marla House in DHA Phase 6', listing_type: 'sale', property_type: 'House', price: 45000000, price_label: 'PKR 4.50 Crore', city: 'Lahore', society: 'DHA Lahore', location: 'Block D, Phase 6, DHA, Lahore', area: 10, area_unit: 'Marla', beds: 4, baths: 4, description: 'Elegant 10 marla house in DHA Phase 6 Block D. Double storey, modern finishes, double car porch and servant quarter.', features: ['Double Car Porch', 'Servant Quarter', 'Solar Panels', 'CCTV', 'Garden'], badges: ['For Sale', 'Hot', 'Docs Verified'], agent_name: 'Ahmed Khan', agent_phone: '+92 300 7778899', agent_verified: true, images: ['/assets/images/prop-7.jpg', '/assets/images/prop-15.jpg'], match_score: 94, view_count: 249, posted_months_ago: 2, est_yield: null, est_roi: 9.6, possession: 'Ready', investment_tagged: false, lat: 31.47, lng: 74.42 },
  { id: 'p8', title: '2 Kanal Bungalow in Cantt, Lahore', listing_type: 'sale', property_type: 'House', price: 180000000, price_label: 'PKR 18.00 Crore', city: 'Lahore', society: 'Cantt', location: 'Cantt, Lahore', area: 2, area_unit: 'Kanal', beds: 6, baths: 7, description: 'Grand 2 kanal bungalow in Lahore Cantt. Palatial interiors, huge lawn, multiple lounges and servant quarters.', features: ['Lawn', 'Servant Quarter', 'CCTV', 'Garden'], badges: ['For Sale', 'Docs Verified'], agent_name: 'Anjum Realty', agent_phone: '+92 300 8889900', agent_verified: true, images: ['/assets/images/prop-8.jpg', '/assets/images/prop-16.jpg'], match_score: null, view_count: 423, posted_months_ago: 2, est_yield: null, est_roi: 8.1, possession: 'Ready', investment_tagged: false, lat: 31.497, lng: 74.34 },
  { id: 'p9', title: '3 Bedroom Apartment in Gulberg, Lahore', listing_type: 'rent', property_type: 'Apartment', price: 85000, price_label: 'PKR 85.0K', city: 'Lahore', society: 'Gulberg', location: 'Gulberg 3, Lahore', area: 1400, area_unit: 'sq ft', beds: 3, baths: 2, description: 'Bright 3-bed apartment in Gulberg 3 with lift, generator backup and reserved parking.', features: ['Lift', 'Generator Backup', 'Parking'], badges: ['For Rent'], agent_name: 'Usman Properties', agent_phone: '+92 300 6667788', agent_verified: false, images: ['/assets/images/prop-9.jpg', '/assets/images/prop-1.jpg'], match_score: null, view_count: 145, posted_months_ago: 3, est_yield: null, est_roi: null, possession: 'Ready', investment_tagged: false, lat: 31.516, lng: 74.354 },
  { id: 'p10', title: '5 Marla House in DHA Phase 6, Lahore', listing_type: 'sale', property_type: 'House', price: 21000000, price_label: 'PKR 2.10 Crore', city: 'Lahore', society: 'DHA Lahore', location: 'Block E, Phase 6, DHA, Lahore', area: 5, area_unit: 'Marla', beds: 4, baths: 3, description: 'Compact yet comfortable 5 marla house in DHA Phase 6 Block E. Recently renovated, ready to move in.', features: ['CCTV', 'Near Park'], badges: ['For Sale'], agent_name: 'Ahmed Khan', agent_phone: '+92 300 7778899', agent_verified: true, images: ['/assets/images/prop-10.jpg', '/assets/images/prop-7.jpg'], match_score: null, view_count: 98, posted_months_ago: 3, est_yield: null, est_roi: 8.8, possession: 'Ready', investment_tagged: false, lat: 31.473, lng: 74.418 },
  { id: 'p11', title: '8 Marla House in Bahria Town Phase 8', listing_type: 'sale', property_type: 'House', price: 19500000, price_label: 'PKR 1.95 Crore', city: 'Rawalpindi', society: 'Bahria Town', location: 'Block C, Phase 8, Bahria Town, Rawalpindi', area: 8, area_unit: 'Marla', beds: 4, baths: 4, description: '8 marla double-storey house in Bahria Town Phase 8 Block C. Contemporary design with rooftop terrace.', features: ['Rooftop Terrace', 'CCTV', 'Gated Community'], badges: ['For Sale'], agent_name: 'Capital Dealers', agent_phone: '+92 300 2223344', agent_verified: false, images: ['/assets/images/prop-11.jpg', '/assets/images/prop-2.jpg'], match_score: null, view_count: 176, posted_months_ago: 4, est_yield: null, est_roi: 9.2, possession: 'Ready', investment_tagged: false, lat: 33.49, lng: 73.105 },
  { id: 'p12', title: '1 Kanal House in Bahria Town Phase 4', listing_type: 'sale', property_type: 'House', price: 32000000, price_label: 'PKR 3.20 Crore', city: 'Rawalpindi', society: 'Bahria Town', location: 'Phase 4, Bahria Town, Rawalpindi', area: 1, area_unit: 'Kanal', beds: 5, baths: 5, description: 'Spacious 1 kanal house in Bahria Town Phase 4. Premium block, landscaped garden and double garage.', features: ['Garden', 'Double Car Porch', 'CCTV'], badges: ['For Sale'], agent_name: 'Anjum Realty', agent_phone: '+92 300 8889900', agent_verified: true, images: ['/assets/images/prop-12.jpg', '/assets/images/prop-8.jpg'], match_score: null, view_count: 204, posted_months_ago: 4, est_yield: null, est_roi: 9.9, possession: 'Ready', investment_tagged: false, lat: 33.5, lng: 73.08 },
  { id: 'p13', title: '10 Marla Plot in DHA Phase 9', listing_type: 'sale', property_type: 'Residential Plot', price: 24000000, price_label: 'PKR 2.40 Crore', city: 'Lahore', society: 'DHA Lahore', location: 'Phase 9, DHA, Lahore', area: 10, area_unit: 'Marla', beds: null, baths: null, description: '10 marla residential plot in DHA Phase 9 Prism. Corner location, clear title and immediate transfer.', features: ['Corner Plot', 'Clear Title', 'Possession Letter'], badges: ['For Sale', 'Hot'], agent_name: 'Lake City Dealers', agent_phone: '+92 300 3334455', agent_verified: false, images: ['/assets/images/prop-13.jpg', '/assets/images/prop-3.jpg'], match_score: null, view_count: 88, posted_months_ago: 3, est_yield: null, est_roi: null, possession: 'Ready', investment_tagged: true, lat: 31.41, lng: 74.45 },
  { id: 'p14', title: '2 Bedroom Apartment in Bahria Town Phase 4', listing_type: 'rent', property_type: 'Apartment', price: 60000, price_label: 'PKR 60.0K', city: 'Rawalpindi', society: 'Bahria Town', location: 'Phase 4, Bahria Town, Rawalpindi', area: 1100, area_unit: 'sq ft', beds: 2, baths: 2, description: 'Cozy 2-bed apartment in Bahria Town Phase 4. Community amenities include gym, pool and parks.', features: ['Gym', 'Swimming Pool', 'Parking'], badges: ['For Rent'], agent_name: 'Farhan Ali', agent_phone: '+92 300 1112233', agent_verified: false, images: ['/assets/images/prop-14.jpg', '/assets/images/prop-4.jpg'], match_score: null, view_count: 132, posted_months_ago: 3, est_yield: null, est_roi: null, possession: 'Ready', investment_tagged: false, lat: 33.505, lng: 73.075 },
  { id: 'p15', title: '4 Marla House in Park View City, Islamabad', listing_type: 'sale', property_type: 'House', price: 11500000, price_label: 'PKR 1.15 Crore', city: 'Islamabad', society: 'Park View City', location: 'Park View City, Islamabad', area: 4, area_unit: 'Marla', beds: 3, baths: 3, description: 'Newly constructed 4 marla house in Park View City. Waterfront community with stunning Margalla views.', features: ['Margalla View', 'Gated Community', 'CCTV'], badges: ['For Sale'], agent_name: 'Sara Ahmed', agent_phone: '+92 300 4445566', agent_verified: false, images: ['/assets/images/prop-15.jpg', '/assets/images/prop-5.jpg'], match_score: null, view_count: 167, posted_months_ago: 4, est_yield: null, est_roi: 9.7, possession: 'Ready', investment_tagged: false, lat: 33.672, lng: 73.071 },
  { id: 'p16', title: '1 Kanal House in Gulberg 3, Lahore', listing_type: 'sale', property_type: 'House', price: 85000000, price_label: 'PKR 8.50 Crore', city: 'Lahore', society: 'Gulberg', location: 'Gulberg 3, Lahore', area: 1, area_unit: 'Kanal', beds: 5, baths: 6, description: 'Premium 1 kanal house on Main Gulberg Boulevard. Prime commercial-cum-residential location.', features: ['Prime Location', 'CCTV', 'Servant Quarter'], badges: ['For Sale', 'Docs Verified'], agent_name: 'Usman Properties', agent_phone: '+92 300 6667788', agent_verified: true, images: ['/assets/images/prop-16.jpg', '/assets/images/prop-6.jpg'], match_score: null, view_count: 93, posted_months_ago: 3, est_yield: null, est_roi: 8.5, possession: 'Ready', investment_tagged: false, lat: 31.518, lng: 74.352 },
];

export const FALLBACK_SOCIETIES = [
  { id: 's1', name: 'DHA Lahore', city: 'Lahore', developer: 'Defence Housing Authority', rating: 4.9, listings_count: 980, avg_price_per_marla: 50.0, verified: true, image_url: '/assets/images/society-dha.jpg' },
  { id: 's2', name: 'Bahria Town Lahore', city: 'Lahore', developer: 'Bahria Town Pvt Ltd', rating: 4.8, listings_count: 1250, avg_price_per_marla: 35.0, verified: true, image_url: '/assets/images/society-bahria.jpg' },
  { id: 's3', name: 'DHA Lahore Phase', city: 'Lahore', developer: 'Defence Housing Authority', rating: 4.8, listings_count: 142, avg_price_per_marla: 85.0, verified: true, image_url: '/assets/images/society-dha-phase.jpg' },
  { id: 's4', name: 'Lake City Lahore', city: 'Lahore', developer: 'Lake City Holdings', rating: 4.6, listings_count: 67, avg_price_per_marla: 35.0, verified: true, image_url: '/assets/images/society-lakecity.jpg' },
];

export const FALLBACK_BROKERS = [
  { id: 'b1', name: 'Ahmed Khan', email: 'ahmed@propx.pk', rating: 4.8, review_count: 3, verified_deals: 1, communication: 90, professionalism: 85, market_knowledge: 80, score: 50, rank: 1 },
  { id: 'b2', name: 'Farhan Ali', email: 'farhan@propx.pk', rating: 4.0, review_count: 1, verified_deals: 1, communication: 75, professionalism: 70, market_knowledge: 65, score: 60, rank: 2 },
  { id: 'b3', name: 'Sara Ahmed', email: 'sara@propx.pk', rating: 3.9, review_count: 1, verified_deals: 1, communication: 70, professionalism: 68, market_knowledge: 60, score: 40, rank: 3 },
];

export const TREND_DATA = [
  { month: 'Jan 25', DHA: 42, Bahria: 30, Gulberg: 52 },
  { month: 'Feb 25', DHA: 44, Bahria: 32, Gulberg: 54 },
  { month: 'Mar 25', DHA: 46, Bahria: 33, Gulberg: 55 },
  { month: 'Apr 25', DHA: 48, Bahria: 35, Gulberg: 58 },
  { month: 'May 25', DHA: 51, Bahria: 37, Gulberg: 60 },
  { month: 'Jun 25', DHA: 53, Bahria: 38, Gulberg: 62 },
  { month: 'Jul 25', DHA: 55, Bahria: 40, Gulberg: 64 },
  { month: 'Aug 25', DHA: 57, Bahria: 41, Gulberg: 66 },
  { month: 'Sep 25', DHA: 59, Bahria: 42, Gulberg: 68 },
  { month: 'Oct 25', DHA: 61, Bahria: 43, Gulberg: 69 },
  { month: 'Nov 25', DHA: 63, Bahria: 44, Gulberg: 70 },
  { month: 'Dec 25', DHA: 65, Bahria: 45, Gulberg: 72 },
];

// ---------- Fetch helpers ----------
async function safeFetch(fn, fallback) {
  if (!supabase) return fallback;
  try {
    const { data, error } = await fn();
    if (error) throw error;
    if (Array.isArray(data)) return data.length ? data : fallback;
    return data ?? fallback;
  } catch (e) {
    console.warn('Supabase fetch failed, using fallback data:', e.message);
    return fallback;
  }
}

export function fetchProperties(filters = {}) {
  const { listingType, city, society, propertyType, beds, maxPrice, sort, query, investmentOnly, minRoi, minYield } = filters;
  const f = supabase ? supabase.from('properties').select('*') : null;
  if (!f) return Promise.resolve(FALLBACK_PROPERTIES);
  let chain = f;
  if (listingType && listingType !== 'all') chain = chain.eq('listing_type', listingType);
  if (city && city !== 'All Cities') chain = chain.eq('city', city);
  if (society && society !== 'All Societies') chain = chain.eq('society', society);
  if (propertyType && propertyType !== 'All Types') chain = chain.eq('property_type', propertyType);
  if (beds && beds !== 'Any') chain = chain.gte('beds', Number(beds));
  if (maxPrice && maxPrice > 0) chain = chain.lte('price', maxPrice);
  if (investmentOnly) chain = chain.eq('investment_tagged', true);
  if (minRoi) chain = chain.gte('est_roi', Number(minRoi));
  if (minYield) chain = chain.gte('est_yield', Number(minYield));
  if (query) {
    const q = query.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    if (terms.length) {
      chain = chain.or(terms.map((t) => `title.ilike.%${t}%,society.ilike.%${t}%,city.ilike.%${t}%,location.ilike.%${t}%`).join(','));
    }
  }
  if (sort === 'price_asc') chain = chain.order('price', { ascending: true });
  else if (sort === 'price_desc') chain = chain.order('price', { ascending: false });
  else chain = chain.order('created_at', { ascending: false });
  return safeFetch(() => chain.limit(60), FALLBACK_PROPERTIES);
}

export function fetchProperty(id) {
  if (!supabase) {
    const hit = FALLBACK_PROPERTIES.find((p) => p.id === id);
    return Promise.resolve(hit || null);
  }
  return safeFetch(() => supabase.from('properties').select('*').eq('id', id).maybeSingle(), FALLBACK_PROPERTIES.find((p) => p.id === id) || null);
}

export function fetchSocieties() {
  if (!supabase) return Promise.resolve(FALLBACK_SOCIETIES);
  return safeFetch(() => supabase.from('societies').select('*').order('listings_count', { ascending: false }), FALLBACK_SOCIETIES);
}

export function fetchBrokers() {
  if (!supabase) return Promise.resolve(FALLBACK_BROKERS);
  return safeFetch(() => supabase.from('brokers').select('*').order('rank', { ascending: true }), FALLBACK_BROKERS);
}

// ---------- Text helpers ----------
export const LISTING_TYPE_LABEL = { sale: 'For Sale', rent: 'For Rent', lease: 'For Lease' };
