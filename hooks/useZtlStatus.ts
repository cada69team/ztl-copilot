import { OLYMPIC_SCHEDULES } from "../lib/olympic-schedule";

export function isZoneActive(zoneName: string): boolean {
  const now = new Date();
  
  // Ensure we are in February 2026 for Olympic logic
  if (now.getMonth() !== 1 || now.getFullYear() !== 2026) {
    // Fallback: Standard City ZTLs (Milan/Turin) are usually active weekdays 07:30-19:30
    return true; 
  }

  const day = now.getDate();
  const hour = now.getHours();
  const schedule = OLYMPIC_SCHEDULES[zoneName];

  if (!schedule) return true; // Default to active for safety if zone unknown

  return schedule.activeDays.includes(day) && 
         hour >= schedule.startHour && 
         hour < schedule.endHour;
}