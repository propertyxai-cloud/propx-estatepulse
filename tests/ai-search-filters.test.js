import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAiSearchFilters, parseLocalFallback, resolveCurrencyCode } from '../src/lib/aiSearchFilters.js';

test('uses explicit ISO currency codes before location inference', () => {
  assert.equal(resolveCurrencyCode('Find a house in Dubai under 2 crore PKR'), 'PKR');
  assert.equal(resolveCurrencyCode('Show apartments in London priced in EUR'), 'EUR');
});

test('infers currency only for supported named cities and countries', () => {
  assert.equal(resolveCurrencyCode('Find a home in Lahore'), 'PKR');
  assert.equal(resolveCurrencyCode('Apartments in Dubai'), 'AED');
  assert.equal(resolveCurrencyCode('Rent a flat in London'), 'GBP');
  assert.equal(resolveCurrencyCode('Homes in Toronto'), 'CAD');
});

test('does not guess currency for ambiguous budgets', () => {
  assert.equal(resolveCurrencyCode('Find a house under 2 crore'), null);
  const filters = parseLocalFallback('Find a house under 2 crore');
  assert.equal(filters.maxPrice, undefined);
  assert.equal(filters.priceNeedsCurrency, true);
});

test('parses local numeric budgets, bedrooms and property type', () => {
  const filters = parseLocalFallback('Find a 4 bedroom house in Lahore under 2 crore');
  assert.equal(filters.city, 'Lahore');
  assert.equal(filters.currencyCode, 'PKR');
  assert.equal(filters.maxPrice, 20000000);
  assert.equal(filters.beds, 4);
  assert.equal(filters.propertyType, 'House');
});

test('parses Dubai million budgets with AED rather than another currency', () => {
  const filters = parseLocalFallback('Show apartments in Dubai under 1.5 million');
  assert.equal(filters.currencyCode, 'AED');
  assert.equal(filters.maxPrice, 1500000);
  assert.equal(filters.propertyType, 'Apartment');
});

test('removes AI budget bounds when no valid currency code is returned', () => {
  const result = normalizeAiSearchFilters({ minPrice: 100, maxPrice: 200, city: 'London' }, 'budget');
  assert.equal(result.hasBudgetWithoutCurrency, true);
  assert.equal(result.filters.minPrice, null);
  assert.equal(result.filters.maxPrice, null);
});

test('keeps AI budget bounds when an ISO currency code is present', () => {
  const result = normalizeAiSearchFilters({ minPrice: 100, maxPrice: 200, currencyCode: 'GBP', type: 'rent' }, 'budget');
  assert.equal(result.hasBudgetWithoutCurrency, false);
  assert.equal(result.filters.currencyCode, 'GBP');
  assert.equal(result.filters.minPrice, 100);
  assert.equal(result.filters.maxPrice, 200);
  assert.equal(result.filters.listingType, 'rent');
});
