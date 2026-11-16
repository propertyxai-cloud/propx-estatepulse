import { supabase } from './supabase';

export const LISTING_TYPE_LABEL = {
  sale: 'For sale',
  rent: 'For rent',
  lease: 'For lease',
};

export const PROPERTY_TYPES = [
  'House', 'Apartment', 'Residential Plot', 'Farmhouse',
  'Commercial', 'Office', 'Penthouse',
];

export const AREA_UNITS = ['sq ft', 'sq yd', 'sq m', 'Marla', 'Kanal', 'Acre', 'Hectare'];

export function requireSupabase() {
  if (!supabase) {
    throw new Error('PropertyX is not connected to Supabase. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

function cleanSearchTerm(value) {
  return String(value ?? '')
    .trim()
    .slice(0, 100)
    .replace(/[%,_*()]/g, ' ')
    .replace(/[,]/g, ' ')
    .replace(/\s+/g, ' ');
}

function addTextSearch(query, value) {
  const term = cleanSearchTerm(value);
  if (!term) return query;
  const pattern = `%${term}%`;
  return query.or([
    `title.ilike.${pattern}`,
    `city.ilike.${pattern}`,
    `country.ilike.${pattern}`,
    `society.ilike.${pattern}`,
    `location.ilike.${pattern}`,
    `description.ilike.${pattern}`,
  ].join(','));
}

export async function fetchProperties(filters = {}) {
  const client = requireSupabase();
  const {
    listingType, city, country, countryCode, currencyCode, society,
    propertyType, beds, baths, minPrice, maxPrice, sort, query,
    investmentOnly, minRoi, minYield, limit = 60, offset = 0,
  } = filters;

  let request = client
    .from('properties')
    .select('*')
    .eq('moderation_status', 'approved')
    .is('archived_at', null)
    .in('availability', ['available', 'under_offer']);

  if (listingType && listingType !== 'all') request = request.eq('listing_type', listingType);
  if (city && city !== 'All Cities') request = request.ilike('city', `%${cleanSearchTerm(city)}%`);
  if (country && country !== 'All Countries') request = request.ilike('country', `%${cleanSearchTerm(country)}%`);
  if (countryCode) request = request.eq('country_code', String(countryCode).toUpperCase());
  if (currencyCode) request = request.eq('currency_code', String(currencyCode).toUpperCase());
  if (society && society !== 'All Societies') request = request.ilike('society', `%${cleanSearchTerm(society)}%`);
  if (propertyType && propertyType !== 'All Types') request = request.eq('property_type', propertyType);
  if (beds && beds !== 'Any') request = request.gte('beds', Number(beds));
  if (baths && baths !== 'Any') request = request.gte('baths', Number(baths));
  if (Number.isFinite(Number(minPrice)) && Number(minPrice) > 0) request = request.gte('price', Number(minPrice));
  if (Number.isFinite(Number(maxPrice)) && Number(maxPrice) > 0) request = request.lte('price', Number(maxPrice));
  if (investmentOnly) request = request.eq('investment_tagged', true);
  if (Number.isFinite(Number(minRoi)) && Number(minRoi) > 0) request = request.gte('est_roi', Number(minRoi));
  if (Number.isFinite(Number(minYield)) && Number(minYield) > 0) request = request.gte('est_yield', Number(minYield));
  if (query) request = addTextSearch(request, query);

  if (sort === 'price_asc') request = request.order('price', { ascending: true });
  else if (sort === 'price_desc') request = request.order('price', { ascending: false });
  else request = request.order('created_at', { ascending: false });

  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 60));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const { data, error } = await request.range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return data ?? [];
}

export async function fetchPropertiesPage(filters = {}) {
  const client = requireSupabase();
  const safeLimit = Math.max(1, Math.min(100, Number(filters.limit) || 24));
  const safeOffset = Math.max(0, Number(filters.offset) || 0);
  const items = await fetchProperties({ ...filters, limit: safeLimit, offset: safeOffset });
  return { items, limit: safeLimit, offset: safeOffset, hasMore: items.length === safeLimit };
}

export async function fetchProperty(id) {
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  let request = client.from('properties').select('*').eq('id', id);
  if (authData?.user?.id) {
    const uid = authData.user.id;
    request = request.or(`moderation_status.eq.approved,owner_id.eq.${uid},posted_by.eq.${uid}`);
  } else {
    request = request.eq('moderation_status', 'approved').is('archived_at', null);
  }
  const { data, error } = await request.maybeSingle();
  if (error) throw error;
  if (data?.archived_at && data.owner_id !== authData?.user?.id && data.posted_by !== authData?.user?.id) return null;
  return data ?? null;
}

export async function fetchMyProperties(userId) {
  const client = requireSupabase();
  if (!userId) return [];
  const { data, error } = await client
    .from('properties')
    .select('*')
    .or(`owner_id.eq.${userId},posted_by.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function fetchSocieties() {
  const { data, error } = await requireSupabase()
    .from('society_directory')
    .select('*')
    .order('listings_count', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function fetchBrokers() {
  const { data, error } = await requireSupabase()
    .from('broker_directory')
    .select('*')
    .order('review_count', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyProfile(userId) {
  if (!userId) return null;
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id,display_name,full_name,avatar_url,role,bio,phone,company_name,preferred_country_code,preferred_city,preferred_currency_code,preferred_timezone,preferred_language')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateMyProfile(userId, updates) {
  if (!userId) throw new Error('Sign in to update your profile.');
  const allowed = [
    'display_name', 'full_name', 'avatar_url', 'bio', 'phone', 'company_name',
    'preferred_country_code', 'preferred_city', 'preferred_currency_code',
    'preferred_timezone', 'preferred_language',
  ];
  const clean = Object.fromEntries(
    Object.entries(updates).filter(([key]) => allowed.includes(key)),
  );
  const { data, error } = await requireSupabase()
    .from('profiles')
    .update({ ...clean, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id,display_name,full_name,avatar_url,role,bio,phone,company_name,preferred_country_code,preferred_city,preferred_currency_code,preferred_timezone,preferred_language')
    .single();
  if (error) throw error;
  return data;
}

export async function isPropertyFavorite(userId, propertyId) {
  if (!userId || !propertyId) return false;
  const { data, error } = await requireSupabase()
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function addFavorite(userId, propertyId) {
  if (!userId) throw new Error('Sign in to save properties.');
  const { error } = await requireSupabase()
    .from('favorites')
    .upsert({ user_id: userId, property_id: propertyId }, { onConflict: 'user_id,property_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeFavorite(userId, propertyId) {
  if (!userId) throw new Error('Sign in to manage saved properties.');
  const { error } = await requireSupabase()
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('property_id', propertyId);
  if (error) throw error;
}

export async function fetchFavoriteProperties(userId) {
  if (!userId) return [];
  const { data, error } = await requireSupabase()
    .from('favorites')
    .select('id,created_at,property:properties(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? [])
    .map((row) => row.property)
    .filter((property) => property && property.moderation_status === 'approved' && !property.archived_at);
}

export async function recordRecentlyViewed(userId, propertyId) {
  if (!userId || !propertyId) return;
  const { error } = await requireSupabase()
    .from('recently_viewed')
    .upsert({ user_id: userId, property_id: propertyId, viewed_at: new Date().toISOString() }, { onConflict: 'user_id,property_id' });
  if (error) throw error;
}

export async function fetchOwnerInquiries(userId) {
  if (!userId) return [];
  const { data, error } = await requireSupabase()
    .from('inquiries')
    .select('id,property_id,name,email,phone,message,status,created_at,property:properties(title,city,currency,currency_code,price,price_label)')
    .eq('recipient_owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyInquiries(userId) {
  if (!userId) return [];
  const { data, error } = await requireSupabase()
    .from('inquiries')
    .select('id,property_id,name,email,phone,message,status,created_at,property:properties(title,city,currency,currency_code,price,price_label)')
    .or(`inquirer_id.eq.${userId},user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function createInquiry(property, values, user) {
  const client = requireSupabase();
  const payload = {
    property_id: property.id,
    user_id: user?.id ?? null,
    inquirer_id: user?.id ?? null,
    recipient_owner_id: property.owner_id ?? property.posted_by ?? null,
    name: String(values.name ?? '').trim().slice(0, 120),
    phone: String(values.phone ?? '').trim().slice(0, 40),
    email: user?.email ?? (String(values.email ?? '').trim() || null),
    message: (String(values.message ?? '').trim() || `I am interested in ${property.title}.`).slice(0, 5000),
    source: 'property_detail',
  };
  if (payload.name.length < 2 || payload.phone.length < 6) {
    throw new Error('Please enter your name and a valid phone number.');
  }
  const { data, error } = await client.from('inquiries').insert(payload).select('id').single();
  if (error) throw error;
  return data;
}

export async function createProperty(values, user, profile, imageUrls = []) {
  if (!user?.id) throw new Error('Sign in before posting a property.');
  const price = Number(values.price);
  if (!Number.isFinite(price) || price <= 0) throw new Error('Enter a valid price greater than zero.');
  const currency = String(values.currency_code || 'USD').toUpperCase();
  const countryCode = String(values.country_code || '').toUpperCase();
  const title = String(values.title || '').trim();
  const city = String(values.city || '').trim();
  if (title.length < 3 || !city || !/^[A-Z]{3}$/.test(currency) || !/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error('Enter a title, city, ISO country code and 3-letter currency code.');
  }
  const name = String(profile?.full_name || profile?.display_name || user.email || 'Property owner').slice(0, 120);
  const priceLabel = new Intl.NumberFormat(undefined, {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(price);

  const payload = {
    title,
    listing_type: values.listing_type,
    property_type: values.property_type,
    price,
    price_label: priceLabel,
    currency,
    currency_code: currency,
    country: String(values.country || countryCode).trim(),
    country_code: countryCode,
    region: String(values.region || '').trim() || null,
    city,
    city_code: String(values.city_code || '').trim() || null,
    postal_code: String(values.postal_code || '').trim() || null,
    timezone: String(values.timezone || '').trim() || null,
    society: String(values.society || '').trim() || null,
    location: String(values.location || values.address || city).trim(),
    address: String(values.address || '').trim() || null,
    area: values.area ? Number(values.area) : null,
    area_unit: values.area_unit || null,
    sqft: values.sqft ? Number(values.sqft) : null,
    beds: values.beds === '' ? null : Number(values.beds),
    baths: values.baths === '' ? null : Number(values.baths),
    description: String(values.description || '').trim() || null,
    features: Array.isArray(values.features) ? values.features : [],
    features_json: { source: 'seller_submitted' },
    badges: [],
    agent_name: name,
    agent_phone: profile?.phone || null,
    agent_verified: false,
    images: imageUrls,
    investment_tagged: false,
    verified: false,
    owner_id: user.id,
    posted_by: user.id,
    lat: values.lat ? Number(values.lat) : null,
    lng: values.lng ? Number(values.lng) : null,
    availability: 'available',
  };
  const { data, error } = await requireSupabase()
    .from('properties')
    .insert(payload)
    .select('id,title,moderation_status,created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function uploadPropertyImages(files, userId) {
  const client = requireSupabase();
  const list = Array.from(files ?? []);
  if (list.length > 8) throw new Error('You can upload up to 8 photos per listing.');
  const accepted = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
  const uploaded = [];

  try {
    for (const file of list) {
      if (!accepted.has(file.type)) throw new Error(`${file.name}: use JPG, PNG, WebP or AVIF images.`);
      if (file.size > 15 * 1024 * 1024) throw new Error(`${file.name}: image must be 15 MB or smaller.`);
      const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' })[file.type];
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await client.storage.from('property-images').upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = client.storage.from('property-images').getPublicUrl(path);
      uploaded.push({ path, url: data.publicUrl });
    }
    return uploaded;
  } catch (uploadError) {
    if (uploaded.length) {
      const { error: cleanupError } = await client.storage.from('property-images').remove(uploaded.map((item) => item.path));
      if (cleanupError) console.warn('Could not clean up partial property image upload:', cleanupError);
    }
    throw uploadError;
  }
}

export async function removeUploadedImages(paths) {
  if (!paths?.length) return;
  const { error } = await requireSupabase().storage.from('property-images').remove(paths);
  if (error) throw error;
}

export async function fetchMarketSnapshots(filters = {}) {
  let request = requireSupabase()
    .from('market_price_snapshots')
    .select('snapshot_month,country_code,city,currency_code,property_type,listing_count,median_price,average_price')
    .order('snapshot_month', { ascending: true })
    .limit(500);
  if (filters.countryCode) request = request.eq('country_code', filters.countryCode.toUpperCase());
  if (filters.city) request = request.ilike('city', `%${cleanSearchTerm(filters.city)}%`);
  if (filters.currencyCode) request = request.eq('currency_code', filters.currencyCode.toUpperCase());
  if (filters.propertyType) request = request.eq('property_type', filters.propertyType);
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

export async function fetchNotifications(userId) {
  if (!userId) return [];
  const { data, error } = await requireSupabase()
    .from('notifications')
    .select('id,type,title,body,link,read_at,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function createSavedSearch(userId, query, filters = {}) {
  if (!userId) throw new Error('Sign in to save a search.');
  const { data, error } = await requireSupabase()
    .from('saved_searches')
    .insert({ user_id: userId, query: String(query || '').slice(0, 500), filters })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export function formatCurrency(amount, currency = 'USD', locale) {
  if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return 'Price on request';
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: 'currency', currency: String(currency || 'USD').toUpperCase(),
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${String(currency || 'USD').toUpperCase()} ${Number(amount).toLocaleString()}`;
  }
}

export function formatDate(value, locale) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }).format(date);
}
