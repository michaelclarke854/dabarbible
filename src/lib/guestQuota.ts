// Single source of truth for the guest allowance (per browser, never resets).
export const GUEST_LIMIT = 3;
export const GUEST_STORAGE_KEY = "dabar-questions-used";
export const getGuestQuestionsUsed = (): number => {
  try { return parseInt(localStorage.getItem(GUEST_STORAGE_KEY) || "0", 10) || 0; } catch { return 0; }
};
