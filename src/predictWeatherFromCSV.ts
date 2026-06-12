import Papa from 'papaparse';
import { kajaaniCSVString } from './kajaani.js';
import { tallinnCSVString } from './tallinn.js';

export interface WeatherDay {
  date: string;
  temperature_2m_max: number;
  temperature_2m_min: number;
  precipitation_sum: number;
  sunshine_duration: number; // hours
}

export interface WeatherPrediction {
  temperature_2m_max: number;
  temperature_2m_min: number;
  precipitation_sum: number;
  sunshine_duration: number;
}

function parseCSVDateToISO(dateStr: string): string {
  // Converts '26.06.2020' to '2020-06-26'
  const [day, month, year] = dateStr.split('.');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function getDayOfYear(dateStr: string): number {
  const date = new Date(dateStr);
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function predictWeatherFromCSV(
  csv: string,
  targetDate: string,
): WeatherPrediction | null {
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  if (!parsed.data || parsed.data.length === 0) return null;

  // Try to find exact match for targetDate
  const exact = (parsed.data as any[]).find((row) => {
    const rowISODate = parseCSVDateToISO(row.date);
    return rowISODate === targetDate;
  });
  if (exact) {
    return {
      temperature_2m_max: Number(exact.temp_max),
      temperature_2m_min: Number(exact.temp_min),
      precipitation_sum: Number(exact.rain),
      sunshine_duration: Number(exact.sunshine_h),
    };
  }

  const targetDayOfYear = getDayOfYear(targetDate);
  const matchingDays = (parsed.data as any[]).filter((row) => {
    const rowISODate = parseCSVDateToISO(row.date);
    return getDayOfYear(rowISODate) === targetDayOfYear;
  });
  if (matchingDays.length === 0) return null;

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    temperature_2m_max: mean(matchingDays.map((d) => Number(d.temp_max))),
    temperature_2m_min: mean(matchingDays.map((d) => Number(d.tem_min))),
    precipitation_sum: mean(matchingDays.map((d) => Number(d.rain))),
    sunshine_duration: mean(matchingDays.map((d) => Number(d.sunshine_h))),
  };
}

export function predictWeatherForLocation(
  location: 'kajaani' | 'tallinn',
  targetDate: string,
): WeatherPrediction | null {
  // Use in-memory CSV strings instead of file I/O
  const csv = location === 'kajaani' ? kajaaniCSVString : tallinnCSVString;
  return predictWeatherFromCSV(csv, targetDate);
}
