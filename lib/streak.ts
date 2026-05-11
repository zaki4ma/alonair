const MS_PER_DAY = 24 * 60 * 60 * 1000;

function localDayNumber(date: Date): number {
  return Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / MS_PER_DAY
  );
}

export function calculateStreakDays(dates: Date[], now = new Date()): number {
  const checkedDays = new Set(dates.map(localDayNumber));
  const today = localDayNumber(now);

  if (!checkedDays.has(today)) return 0;

  let streak = 0;
  for (let day = today; checkedDays.has(day); day -= 1) {
    streak += 1;
  }

  return streak;
}
