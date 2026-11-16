export const LISTING_TYPES = ['sale', 'rent', 'lease'];
export const PROPERTY_TYPES = ['House', 'Apartment', 'Residential Plot', 'Farmhouse', 'Commercial', 'Office', 'Penthouse'];

export function normalizeCountryCode(value) {
  const code = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

export function normalizeCurrencyCode(value) {
  const code = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

export function validatePropertyDraft(values) {
  const title = String(values?.title ?? '').trim();
  const city = String(values?.city ?? '').trim();
  const price = Number(values?.price);
  if (title.length < 3 || title.length > 200) return 'Property title must be between 3 and 200 characters.';
  if (!LISTING_TYPES.includes(values?.listing_type)) return 'Choose a valid listing type.';
  if (!PROPERTY_TYPES.includes(values?.property_type)) return 'Choose a valid property type.';
  if (!Number.isFinite(price) || price <= 0) return 'Price must be a number greater than zero.';
  if (!city || city.length > 120) return 'Enter a city name.';
  const address = String(values?.address ?? '').trim();
  if (address && (address.length < 5 || address.length > 300)) return 'Street address must be between 5 and 300 characters when provided.';
  if (!normalizeCountryCode(values?.country_code)) return 'Enter a valid two-letter ISO country code.';
  if (!normalizeCurrencyCode(values?.currency_code)) return 'Enter a valid three-letter ISO currency code.';
  if (!String(values?.timezone ?? '').trim()) return 'Enter the property timezone using an IANA timezone identifier.';
  try {
    new Intl.DateTimeFormat('en', { timeZone: values.timezone.trim() });
  } catch {
    return 'Enter a valid IANA timezone, such as Asia/Karachi or Europe/London.';
  }
  const area = values?.area === '' || values?.area == null ? null : Number(values.area);
  if (area !== null && (!Number.isFinite(area) || area <= 0)) return 'Area must be greater than zero.';
  for (const key of ['beds', 'baths']) {
    if (values?.[key] !== '' && values?.[key] != null) {
      const count = Number(values[key]);
      if (!Number.isInteger(count) || count < 0 || count > 100) return `${key === 'beds' ? 'Bedrooms' : 'Bathrooms'} must be a whole number from 0 to 100.`;
    }
  }
  const lat = values?.lat === '' || values?.lat == null ? null : Number(values.lat);
  const lng = values?.lng === '' || values?.lng == null ? null : Number(values.lng);
  if ((lat === null) !== (lng === null)) return 'Enter both latitude and longitude, or leave both empty.';
  if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) return 'Latitude must be between -90 and 90.';
  if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) return 'Longitude must be between -180 and 180.';
  return null;
}
