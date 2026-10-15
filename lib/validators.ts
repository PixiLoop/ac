export const isRequired = (v?: string | any[]) =>
  v !== undefined &&
  v !== null &&
  (Array.isArray(v) ? v.length > 0 : String(v).trim().length > 0);

export const minLength = (v: string, len: number) =>
  String(v).trim().length >= len;

export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isStrongPassword = (p: string) =>
  p.length >= 8 &&
  /[A-Z]/.test(p) &&
  /[a-z]/.test(p) &&
  /\d/.test(p);
