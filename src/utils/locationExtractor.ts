// Location extraction utilities for WeatherGPT "Any Location" vs "GPS" intelligence

export const STOPWORDS = new Set([
  "here", "my location", "current location", "there", "outside", "today", "tomorrow",
  "tonight", "yesterday", "now", "right now", "morning", "afternoon", "evening", "night",
  "weekend", "week", "home", "work", "school", "office", "car", "bike", "bicycle",
  "umbrella", "clothes", "clothing", "jacket", "coat", "shoes", "cricket", "football",
  "sports", "running", "jogging", "walking", "cycling", "safe", "weather", "forecast",
  "temp", "temperature", "rain", "rainy", "sunny", "cloudy", "wind", "windy", "storm",
  "radar", "friday", "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday",
  "what is", "will it", "can i", "tell me", "show me", "help"
]);

export function isExplicitGpsRequest(raw: string): boolean {
  const q = raw.trim().toLowerCase();
  const triggers = [
    /\bmy location\b/i,
    /\bcurrent location\b/i,
    /\bhere\b/i,
    /\bwhere i am\b/i,
    /\bmy weather\b/i,
    /\blocal weather\b/i,
    /\baround here\b/i,
    /\bback to (?:my )?location\b/i,
    /\bswitch to (?:my )?location\b/i,
    /\bswitch back to (?:my )?location\b/i,
    /\bmy location now\b/i,
    /\bgps location\b/i,
    /\buse gps\b/i,
    /\buse my location\b/i,
    /\bmy city\b/i,
    /\bmy area\b/i,
    /\bnear me\b/i,
    /\bis it safe outside\b/i,
    /\bcan i go outside\b/i,
    /\bwill it rain here\b/i,
  ];
  return triggers.some((t) => t.test(q));
}

export function cleanCandidate(str: string): string {
  let s = str.trim().replace(/^[\s,?.!"']+|[\s,?.!"']+$/g, "");
  // remove trailing time qualifiers
  s = s.replace(
    /\s+(?:tomorrow|today|tonight|this\s+week|this\s+weekend|yesterday|now|currently|right\s+now|friday|saturday|sunday|monday|tuesday|wednesday|thursday)\b.*$/i,
    ""
  );
  // remove leading prepositions/articles
  s = s.replace(/^(?:the|a|an|in|at|for|to|of|near|around)\s+/i, "");
  return s.trim().replace(/^[\s,?.!"']+|[\s,?.!"']+$/g, "");
}

export function extractCandidateLocation(raw: string): string | null {
  const q = raw.trim();

  // Pattern 1: nearby places in <Place> (e.g. "nearest mall in Hyderabad", "hospitals in Vizag", "shelters in Chennai")
  const nearbyMatch = q.match(
    /\b(?:nearest|nearby|best|safe|find|show)?\s*(?:malls?|hospitals?|shelters?|parks?|clinics?|places?|doctors?|hotels?|restaurants?)\s+(?:in|at|near|around)\s+([^,?.!]+)/i
  );
  if (nearbyMatch && nearbyMatch[1]) {
    const c = cleanCandidate(nearbyMatch[1]);
    if (c && !STOPWORDS.has(c.toLowerCase())) return c;
  }

  // Pattern 2: "in/for/at/around/near/to/of <Place>" e.g. "Weather in Delhi", "Will it rain in Chennai tomorrow?", "Temperature in Mumbai"
  const inMatch = q.match(
    /\b(?:in|for|at|around|near|of|to)\s+([a-zA-Z\u00C0-\u024F\s.'-]+?)(?:\s+(?:tomorrow|today|tonight|yesterday|this\s+week|this\s+weekend|on\s+[a-zA-Z]+|now|currently|\?|$)|$|[?!.,])/i
  );
  if (inMatch && inMatch[1]) {
    const c = cleanCandidate(inMatch[1]);
    if (c && !STOPWORDS.has(c.toLowerCase()) && !/^(?:the\s+)?(?:morning|evening|afternoon|night|future|past|weekend|week)\b/i.test(c)) {
      return c;
    }
  }

  // Pattern 3: "<Place> weather / forecast / temperature / etc." e.g. "Hyderabad weather", "Vizag forecast", "New York weather"
  const suffixMatch = q.match(
    /^([a-zA-Z\u00C0-\u024F\s.'-]+?)\s+(?:weather|forecast|temperature|temp|climate|rain|radar|conditions|outlook)/i
  );
  if (suffixMatch && suffixMatch[1]) {
    const c = cleanCandidate(suffixMatch[1]);
    if (c && !STOPWORDS.has(c.toLowerCase()) && !/^(?:what|how|why|when|is|can|will|should|tell|show|my)\b/i.test(c)) {
      return c;
    }
  }

  // Pattern 4: "weather / forecast / temp in <Place>"
  const prefixMatch = q.match(
    /(?:weather|forecast|temperature|temp|rain|radar|conditions)\s+(?:in|for|at|of)?\s*([a-zA-Z\u00C0-\u024F\s.'-]+)/i
  );
  if (prefixMatch && prefixMatch[1]) {
    const c = cleanCandidate(prefixMatch[1]);
    if (c && !STOPWORDS.has(c.toLowerCase()) && !/^(?:what|how|why|when|is|can|will|should|tell|show|my)\b/i.test(c)) {
      return c;
    }
  }

  // Pattern 5: standalone place name (1 to 4 words)
  const words = q.split(/\s+/);
  if (words.length >= 1 && words.length <= 4) {
    const c = cleanCandidate(q);
    if (
      c &&
      c.length >= 2 &&
      !STOPWORDS.has(c.toLowerCase()) &&
      !/^(?:what|how|why|when|is|can|will|should|tell|show|hello|hi|hey|my|and|or|so|do|does|are|were|am)\b/i.test(c)
    ) {
      return c;
    }
  }

  return null;
}
