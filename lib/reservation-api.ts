import { parseApiMessage } from "@/lib/toast";

export const patchReservation = async (
  id: string,
  body: { quantity?: string; customerName?: string; expiresAt?: string | null },
): Promise<{ ok: boolean; data: unknown; status: number }> => {
  let res = await fetch(`/api/proxy/reservations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 404) {
    const text = await res.clone().text().catch(() => "");
    if (text.includes("Cannot PATCH")) {
      res = await fetch(`/api/proxy/reservations/${id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
  }

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data, status: res.status };
};

export const reservationErrorMessage = (data: unknown, fallback: string) =>
  parseApiMessage(data, fallback);
