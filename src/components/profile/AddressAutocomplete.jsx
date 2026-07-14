import React, { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";

// Free, keyless address lookup via OpenStreetMap's Nominatim service.
// Usage policy: low volume, debounced, one request at a time.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

/**
 * Street-address input with live autocomplete suggestions.
 *
 * @param {string}   value      - current street address text
 * @param {Function} onChange   - (text) => void, fires on every keystroke
 * @param {Function} onSelect   - (parts) => void, fires when a suggestion is
 *                                 picked: { address, city, state, zipCode, country }
 * @param {boolean}  disabled
 * @param {string}   testId     - base data-test-id
 */
const AddressAutocomplete = ({
  value,
  onChange,
  onSelect,
  disabled = false,
  testId = "profile-address",
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef(null);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  // Skip the lookup that would otherwise fire right after a suggestion is picked.
  const skipNextSearchRef = useRef(false);

  // Debounced fetch whenever the typed value changes.
  useEffect(() => {
    if (disabled) return;
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    const query = (value || "").trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      // Cancel any in-flight request before starting a new one.
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          format: "jsonv2",
          addressdetails: "1",
          limit: "5",
          q: query,
        });
        const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Address lookup failed");
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setIsOpen(true);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Address autocomplete error:", err);
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [value, disabled]);

  // Cancel outstanding work on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Close the dropdown on outside click.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePick = (place) => {
    const a = place.address || {};
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const parts = {
      address: street || place.display_name?.split(",")[0] || "",
      city: a.city || a.town || a.village || a.hamlet || a.county || "",
      state: a.state || a.region || "",
      zipCode: a.postcode || "",
      country: a.country || "",
    };
    skipNextSearchRef.current = true;
    setIsOpen(false);
    setSuggestions([]);
    onSelect?.(parts);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          className="input pr-9"
          placeholder="Start typing your street address..."
          disabled={disabled}
          autoComplete="off"
          data-test-id={`${testId}-input`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" data-test-id={`${testId}-loading`} />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
        </span>
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
          data-test-id={`${testId}-suggestions`}
        >
          {suggestions.map((place) => (
            <li key={place.place_id}>
              <button
                type="button"
                onClick={() => handlePick(place)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-start gap-2"
                data-test-id={`${testId}-suggestion-${place.place_id}`}
              >
                <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <span>{place.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
