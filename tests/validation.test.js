import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCountryCode, normalizeCurrencyCode, validatePropertyDraft } from '../src/lib/validation.js';

const valid = {
  title:'Three bedroom apartment',
  listing_type:'sale',
  property_type:'Apartment',
  price:'100000',
  city:'Islamabad',
  country_code:'PK',
  currency_code:'PKR',
  timezone:'Asia/Karachi',
  area:'1200',
  beds:'3',
  baths:'2',
  lat:'33.7',
  lng:'73.0',
};

test('normalizes ISO country and currency codes',()=>{
  assert.equal(normalizeCountryCode('pk'),'PK');
  assert.equal(normalizeCurrencyCode('aed'),'AED');
  assert.equal(normalizeCountryCode('PAK'),null);
  assert.equal(normalizeCurrencyCode('US'),null);
});

test('accepts a valid global listing draft',()=>{
  assert.equal(validatePropertyDraft(valid),null);
});

test('rejects untrusted or malformed country/currency codes',()=>{
  assert.match(validatePropertyDraft({...valid,country_code:'PAK'}),/two-letter ISO/);
  assert.match(validatePropertyDraft({...valid,currency_code:'PK'}),/three-letter ISO/);
});

test('rejects invalid property prices and unsupported listing types',()=>{
  assert.match(validatePropertyDraft({...valid,price:'0'}),/greater than zero/);
  assert.match(validatePropertyDraft({...valid,listing_type:'auction'}),/listing type/);
});

test('rejects invalid timezone and partial coordinates',()=>{
  assert.match(validatePropertyDraft({...valid,timezone:'Not/A_Real_Zone'}),/valid IANA timezone/);
  assert.match(validatePropertyDraft({...valid,lng:''}),/both latitude and longitude/);
});

test('rejects invalid bedroom counts and blank title',()=>{
  assert.match(validatePropertyDraft({...valid,beds:'2.5'}),/whole number/);
  assert.match(validatePropertyDraft({...valid,title:'  '}),/title/);
});
