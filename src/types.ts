// Plain types shared by the scheduling math. Deliberately tiny and
// domain-agnostic so any bot can map its subscriber row onto them.

/** The few subscriber fields the scheduling math actually needs. */
export interface DeliverySchedule {
  /** IANA timezone name, e.g. "Africa/Cairo". Drives the local day/time. */
  timezone: string;
  /** Hour of the daily send in the subscriber's local time (0-23). */
  deliveryHour: number;
  /** Minute of the daily send in the subscriber's local time (0-59). */
  deliveryMinute: number;
  /**
   * 7-bit mask of the days the subscriber wants a send on. Bit 0 is Monday
   * and bit 6 is Sunday (ISO weekday order). See days.ts.
   */
  activeDays: number;
}

/** The subscriber's local calendar context at a given instant. */
export interface LocalContext {
  /** Local date as "YYYY-MM-DD". Safe to compare as a string. */
  date: string;
  /** ISO weekday: Monday is 1 ... Sunday is 7. */
  isoWeekday: number;
  /** Minutes since local midnight (0-1439). */
  minutesSinceMidnight: number;
}
