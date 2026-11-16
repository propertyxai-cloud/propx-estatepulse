import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTRY_OPTIONS,
  CURRENCY_CODES,
  TIME_ZONE_OPTIONS,
  defaultCurrencyForCountry,
  defaultTimezoneForCountry,
  getCountryName,
} from '../src/lib/localeData.js';

test('global country list contains common markets and valid ISO alpha-2 codes',()=>{
  const codes=new Set(COUNTRY_OPTIONS.map(item=>item.value));
  assert.ok(codes.size>200);
  for(const code of ['PK','US','GB','AE','SA','CA','AU','IN','SG','DE','JP']) assert.ok(codes.has(code));
  for(const code of codes) assert.match(code,/^[A-Z]{2}$/);
});

test('currency options contain common ISO-4217 listing currencies',()=>{
  for(const code of ['PKR','USD','EUR','GBP','AED','SAR','CAD','AUD','INR','JPY']) assert.ok(CURRENCY_CODES.includes(code));
  for(const code of CURRENCY_CODES) assert.match(code,/^[A-Z]{3}$/);
});

test('timezone selector contains IANA zones and UTC fallback',()=>{
  assert.ok(TIME_ZONE_OPTIONS.includes('UTC'));
  assert.ok(TIME_ZONE_OPTIONS.includes('Asia/Karachi'));
  assert.ok(TIME_ZONE_OPTIONS.includes('Europe/London'));
  assert.ok(TIME_ZONE_OPTIONS.includes('America/New_York'));
});

test('country-aware currency and timezone defaults are grounded in ISO codes',()=>{
  assert.equal(defaultCurrencyForCountry('PK'),'PKR');
  assert.equal(defaultCurrencyForCountry('US'),'USD');
  assert.equal(defaultCurrencyForCountry('AE'),'AED');
  assert.equal(defaultTimezoneForCountry('PK'),'Asia/Karachi');
  assert.equal(defaultTimezoneForCountry('GB'),'Europe/London');
  assert.equal(defaultCurrencyForCountry('XX'),'');
  assert.equal(defaultTimezoneForCountry('XX'),'');
});

test('country labels are localized and invalid codes are rejected safely',()=>{
  assert.ok(getCountryName('PK').length>0);
  assert.equal(getCountryName('PAK'),'');
  assert.equal(getCountryName(''),'');
});
