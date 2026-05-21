export type PeriodKey = "today" | "week" | "month" | "year";

const toDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const periodBounds = (period: PeriodKey, anchor = new Date()) => {
  const base = new Date(anchor);
  if (Number.isNaN(base.getTime())) {
    throw new Error("Invalid date");
  }

  if (period === "today") {
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    return { from: toDateInput(start), to: toDateInput(start), label: "Today" };
  }

  if (period === "week") {
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    const end = new Date(base);
    end.setHours(0, 0, 0, 0);
    return { from: toDateInput(start), to: toDateInput(end), label: "This week" };
  }

  if (period === "month") {
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base);
    end.setHours(0, 0, 0, 0);
    return { from: toDateInput(start), to: toDateInput(end), label: "This month" };
  }

  const start = new Date(base.getFullYear(), 0, 1);
  const end = new Date(base);
  end.setHours(0, 0, 0, 0);
  return { from: toDateInput(start), to: toDateInput(end), label: "This year" };
};
