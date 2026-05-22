import { toast } from "sonner";

export const parseApiMessage = (data: unknown, fallback: string): string => {
  if (!data || typeof data !== "object") return fallback;
  const msg = (data as { message?: unknown }).message;
  if (typeof msg === "string") return msg;
  if (Array.isArray(msg)) return msg.filter((m) => typeof m === "string").join(", ") || fallback;
  return fallback;
};

export const toastError = (message: string) => {
  toast.error(message);
};

export const toastSuccess = (message: string) => {
  toast.success(message);
};

export const toastFromResponse = async (res: Response, fallback: string) => {
  const data = await res.json().catch(() => ({}));
  toastError(parseApiMessage(data, fallback));
  return data;
};
