export const CROWN_LINK_TIME_ZONE = "America/New_York";
export const CROWN_LINK_TIME_LABEL = "ET";

export function getEasternToday(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CROWN_LINK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Could not determine the current Eastern date.");
  }

  return `${year}-${month}-${day}`;
}

export function formatEasternDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00Z`);

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatEasternTime(timeString: string) {
  const [hourString, minuteString = "00"] =
    timeString.split(":");

  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    return `${timeString} ${CROWN_LINK_TIME_LABEL}`;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix} ${CROWN_LINK_TIME_LABEL}`;
}

export function formatEasternDateTime(
  dateString: string,
  timeString: string
) {
  return `${formatEasternDate(dateString)} · ${formatEasternTime(
    timeString
  )}`;
}
