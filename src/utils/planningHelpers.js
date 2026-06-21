import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog,
} from 'lucide-react';

export const COST_COLORS = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-rose-400',
};

export const SEVERITY_COLORS = [
  null,
  'bg-emerald-500',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-rose-600',
];

// WMO weather codes -> icon, per https://open-meteo.com/en/docs
export function weatherIcon(code) {
  if (code === 0) return Sun;
  if ([1, 2, 3].includes(code)) return Cloud;
  if ([45, 48].includes(code)) return CloudFog;
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 99) return CloudLightning;
  return Cloud;
}

export function aqiCategory(aqi) {
  if (aqi == null) return null;
  if (aqi <= 50) return { label: 'Good', color: 'text-emerald-400' };
  if (aqi <= 100) return { label: 'Moderate', color: 'text-amber-400' };
  if (aqi <= 150) return { label: 'Unhealthy (SG)', color: 'text-orange-400' };
  if (aqi <= 200) return { label: 'Unhealthy', color: 'text-rose-400' };
  return { label: 'Very Unhealthy', color: 'text-purple-400' };
}

export function severityLabel(severity) {
  if (severity >= 4) return { label: 'High', color: 'text-rose-400' };
  if (severity === 3) return { label: 'Moderate', color: 'text-amber-400' };
  return { label: 'Low', color: 'text-emerald-400' };
}

export function getHeatRisk(climate) {
  if (!climate) return null;
  const risk = climate.risks?.find(r => /heat/i.test(r.title));
  if (risk) return severityLabel(risk.severity);
  if (climate.score >= 70) return { label: 'Low', color: 'text-emerald-400' };
  if (climate.score >= 50) return { label: 'Moderate', color: 'text-amber-400' };
  return { label: 'High', color: 'text-rose-400' };
}

export function getFloodRisk(climate) {
  if (!climate) return null;
  const risk = climate.risks?.find(r => /flood|stormwater|runoff/i.test(r.title));
  return risk ? severityLabel(risk.severity) : { label: 'Low', color: 'text-emerald-400' };
}

export function isBerkeleyLocation(location) {
  const text = `${location?.displayName || ''} ${location?.formattedAddress || ''}`.toLowerCase();
  return text.includes('berkeley');
}

export function getRecommendationCategory(rec) {
  if (rec.id?.startsWith('cr')) return 'climate';
  if (rec.id?.startsWith('ar')) return 'accessibility';
  return 'housing';
}
