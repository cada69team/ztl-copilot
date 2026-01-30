import { OLYMPIC_SCHEDULES } from "../lib/olympic-schedule";

// Permanent city ZTL schedules (weekdays, standard hours)
const PERMANENT_ZTL_SCHEDULES: Record<string, { activeDays: number[]; startHour: number; endHour: number }> = {
  "Area C": {
    activeDays: [1, 2, 3, 4, 5], // Mon-Fri
    startHour: 7,
    endHour: 19, // 7:30-18:30, we buffer slightly
  },
  "ZTL Centrale": {
    activeDays: [1, 2, 3, 4, 5],
    startHour: 8,
    endHour: 20,
  },
  "Città Alta": {
    activeDays: [1, 2, 3, 4, 5],
    startHour: 8,
    endHour: 19,
  },
  "Città Murata": {
    activeDays: [1, 2, 3, 4, 5],
    startHour: 8,
    endHour: 19,
  },
  "Centro": {
    activeDays: [1, 2, 3, 4, 5],
    startHour: 8,
    endHour: 19,
  },
};

export function isZoneActive(zoneName: string): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hour = now.getHours();
  const currentMonth = now.getMonth(); // 0 = January
  const currentDate = now.getDate();

  // Check for permanent city ZTLs first
  const permanentSchedule = PERMANENT_ZTL_SCHEDULES[zoneName];
  if (permanentSchedule) {
    const isWeekday = permanentSchedule.activeDays.includes(dayOfWeek);
    const isWithinHours = hour >= permanentSchedule.startHour && hour < permanentSchedule.endHour;

    return isWeekday && isWithinHours;
  }

  // During Olympics (February 2026), check Olympic schedules
  if (currentMonth === 1 && now.getFullYear() === 2026) {
    const olympicSchedule = OLYMPIC_SCHEDULES[zoneName];
    if (olympicSchedule) {
      const isActiveDay = olympicSchedule.activeDays.includes(currentDate);
      const isWithinHours = hour >= olympicSchedule.startHour && hour < olympicSchedule.endHour;

      return isActiveDay && isWithinHours;
    }
  }

  // Default: assume zone is active (fail-safe for unknown zones)
  // This protects tourists from entering zones we don't have data for
  return true;
}
