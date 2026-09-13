export function waterReminderDue(hour: number, minute: number, startTime: string, endTime: string, intervalMinutes: number) {
  const parse = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const current = hour * 60 + minute;
  const start = parse(startTime);
  const end = parse(endTime);
  return current >= start && current <= end && (current - start) % intervalMinutes === 0;
}
