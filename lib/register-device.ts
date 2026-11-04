/** Device / till registration stored in the browser (Phase 5). */

export const REGISTER_ID_KEY = "edimart-register-id";
export const REGISTER_CODE_KEY = "edimart-register-code";
export const TILL_REGISTERED_KEY = "edimart-till-registered";

export const DEFAULT_REGISTER_CODE = "REGISTER-1";

export const getStoredRegisterId = (): string | null => {
  try {
    return localStorage.getItem(REGISTER_ID_KEY);
  } catch {
    return null;
  }
};

export const getStoredRegisterCode = (): string => {
  try {
    return localStorage.getItem(REGISTER_CODE_KEY) ?? DEFAULT_REGISTER_CODE;
  } catch {
    return DEFAULT_REGISTER_CODE;
  }
};

export const isTillRegistered = (): boolean => {
  try {
    return localStorage.getItem(TILL_REGISTERED_KEY) === "1" && !!localStorage.getItem(REGISTER_ID_KEY);
  } catch {
    return false;
  }
};

export const setTillRegistration = (opts: {
  registered: boolean;
  registerId?: string | null;
  registerCode?: string | null;
}): void => {
  try {
    if (!opts.registered) {
      localStorage.removeItem(TILL_REGISTERED_KEY);
      return;
    }
    localStorage.setItem(TILL_REGISTERED_KEY, "1");
    if (opts.registerId) localStorage.setItem(REGISTER_ID_KEY, opts.registerId);
    if (opts.registerCode) localStorage.setItem(REGISTER_CODE_KEY, opts.registerCode);
  } catch {
    /* ignore */
  }
};

export const setStoredRegister = (registerId: string, registerCode?: string): void => {
  try {
    localStorage.setItem(REGISTER_ID_KEY, registerId);
    if (registerCode) localStorage.setItem(REGISTER_CODE_KEY, registerCode);
  } catch {
    /* ignore */
  }
};

/** Headers to attach when talking to shift / checkout routes. */
export const registerHeaders = (): Record<string, string> => {
  const id = getStoredRegisterId();
  return id ? { "x-register-id": id } : {};
};
