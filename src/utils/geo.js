// Thin wrapper over `country-state-city` (offline dataset, no API key) so the
// Profile form can render Country / State dropdowns. We store the human-readable
// names as strings in the DB, so these helpers translate to/from ISO codes.
import { Country, State } from "country-state-city";

let _countriesCache = null;

/** All countries as { name, isoCode }, sorted by name. */
export function getCountries() {
  if (!_countriesCache) {
    _countriesCache = Country.getAllCountries()
      .map((c) => ({ name: c.name, isoCode: c.isoCode }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return _countriesCache;
}

/** Resolve a country name to its ISO code (case-insensitive). */
export function getCountryIsoByName(name) {
  if (!name) return null;
  const match = getCountries().find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  return match?.isoCode ?? null;
}

/** State names for a given country name. Empty array if none / unknown. */
export function getStatesForCountry(countryName) {
  const iso = getCountryIsoByName(countryName);
  if (!iso) return [];
  return State.getStatesOfCountry(iso)
    .map((s) => s.name)
    .sort((a, b) => a.localeCompare(b));
}
