// Relative day label for the Recent-practice teaser ("Today" / "Yesterday" / weekday /
// date). Keyed off the device's LOCAL calendar day so the label matches what the player
// perceives — an 8pm session is "Today" for them even if that instant is already tomorrow
// in UTC. Callers pass the instant as a Date (e.g. new Date(session.startedAt)).

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Midnight of the date's local calendar day, in epoch ms. */
function localMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function relativeDay(then: Date, now: Date): string {
  const diffDays = Math.round((localMidnight(now) - localMidnight(then)) / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 6) return WEEKDAYS[then.getDay()];
  return `${then.getDate()} ${MONTHS[then.getMonth()]}`;
}
