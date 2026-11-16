const RAW_COUNTRY_CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(' ');

const FALLBACK_CURRENCIES = `AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VED VES VND VUV WST XAF XCD XOF XPF YER ZAR ZMW ZWL`.split(' ');

const DEFAULT_CURRENCY_BY_COUNTRY = {
  AE:'AED', AF:'AFN', AU:'AUD', BD:'BDT', BH:'BHD', BR:'BRL', CA:'CAD',
  CH:'CHF', CN:'CNY', DE:'EUR', EG:'EGP', ES:'EUR', FR:'EUR', GB:'GBP',
  HK:'HKD', ID:'IDR', IN:'INR', IQ:'IQD', IR:'IRR', JP:'JPY', KE:'KES',
  KR:'KRW', KW:'KWD', LK:'LKR', MY:'MYR', NG:'NGN', NL:'EUR', NO:'NOK',
  NP:'NPR', NZ:'NZD', OM:'OMR', PH:'PHP', PK:'PKR', QA:'QAR', SA:'SAR',
  SE:'SEK', SG:'SGD', TH:'THB', TR:'TRY', TW:'TWD', TZ:'TZS', UA:'UAH',
  US:'USD', ZA:'ZAR'
};

const DEFAULT_TIMEZONE_BY_COUNTRY = {
  AE:'Asia/Dubai', AU:'Australia/Sydney', BD:'Asia/Dhaka', BH:'Asia/Bahrain',
  CA:'America/Toronto', CH:'Europe/Zurich', CN:'Asia/Shanghai',
  DE:'Europe/Berlin', EG:'Africa/Cairo', ES:'Europe/Madrid',
  FR:'Europe/Paris', GB:'Europe/London', HK:'Asia/Hong_Kong',
  ID:'Asia/Jakarta', IN:'Asia/Kolkata', IQ:'Asia/Baghdad',
  IR:'Asia/Tehran', JP:'Asia/Tokyo', KE:'Africa/Nairobi',
  KR:'Asia/Seoul', KW:'Asia/Kuwait', LK:'Asia/Colombo',
  MY:'Asia/Kuala_Lumpur', NG:'Africa/Lagos', NP:'Asia/Kathmandu',
  NZ:'Pacific/Auckland', OM:'Asia/Muscat', PH:'Asia/Manila',
  PK:'Asia/Karachi', QA:'Asia/Qatar', SA:'Asia/Riyadh',
  SG:'Asia/Singapore', TH:'Asia/Bangkok', TR:'Europe/Istanbul',
  TW:'Asia/Taipei', TZ:'Africa/Dar_es_Salaam', US:'America/New_York',
  ZA:'Africa/Johannesburg'
};

const countryNames = new Intl.DisplayNames(
  [typeof navigator !== 'undefined' ? navigator.language : 'en'],
  { type: 'region' }
);

export const COUNTRY_OPTIONS = RAW_COUNTRY_CODES
  .map((code) => ({ value: code, label: countryNames.of(code) || code }))
  .sort((a,b) => a.label.localeCompare(b.label));

export const CURRENCY_CODES = (
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('currency')
    : FALLBACK_CURRENCIES
).filter((code) => /^[A-Z]{3}$/.test(code)).sort();

export const TIME_ZONE_OPTIONS = (
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : ['UTC','Asia/Karachi','Asia/Dubai','Asia/Riyadh','Europe/London','Europe/Berlin','America/New_York','America/Los_Angeles','Australia/Sydney']
).sort();

export function getCountryName(code, locale) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '';
  try {
    return new Intl.DisplayNames([locale || (typeof navigator !== 'undefined' ? navigator.language : 'en')], { type: 'region' }).of(normalized) || normalized;
  } catch {
    return normalized;
  }
}

export function defaultCurrencyForCountry(code) {
  return DEFAULT_CURRENCY_BY_COUNTRY[String(code || '').trim().toUpperCase()] || '';
}

export function defaultTimezoneForCountry(code) {
  return DEFAULT_TIMEZONE_BY_COUNTRY[String(code || '').trim().toUpperCase()] || '';
}
