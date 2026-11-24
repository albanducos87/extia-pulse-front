const pad = (n: number) => String(n).padStart(2, '0');

/** Date -> backend LocalDateTime string ('YYYY-MM-DDTHH:mm:00'), in local time. */
export function toLocalDateTime(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  );
}

/** Backend LocalDateTime ('YYYY-MM-DDTHH:mm:ss') -> datetime-local input value ('YYYY-MM-DDTHH:mm'). */
export function toInputDate(value: string | null): string {
  return value ? value.slice(0, 16) : '';
}

/** datetime-local input value ('YYYY-MM-DDTHH:mm') -> backend LocalDateTime ('YYYY-MM-DDTHH:mm:ss'). */
export function fromInputDate(value: string | null | undefined): string | null {
  return value ? `${value.slice(0, 16)}:00` : null;
}
