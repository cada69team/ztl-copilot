export type OlympicZoneSchedule = {
  city: string;
  activeDays: number[]; // Day of February 2026
  startHour: number;    // 24h format
  endHour: number;
};

export const OLYMPIC_SCHEDULES: Record<string, OlympicZoneSchedule> = {
  "Bormio Zone 1": {
    city: "Bormio",
    activeDays: [6, 7, 9, 11, 14, 16, 19, 21],
    startHour: 7,
    endHour: 16,
  },
  "Livigno Zone 1": {
    city: "Livigno",
    activeDays: Array.from({ length: 19 }, (_, i) => i + 4), // Feb 4 to Feb 22
    startHour: 6,
    endHour: 24,
  },
  "Antholz Core": {
    city: "Antholz",
    activeDays: [11, 12, 14, 15, 17, 18, 19, 22],
    startHour: 8,
    endHour: 15,
  },
  "Cortina Zone 1": {
    city: "Cortina d'Ampezzo",
    activeDays: [8, 10, 12, 15, 18], // Main Alpine Tofane days
    startHour: 6,
    endHour: 17,
  }
};