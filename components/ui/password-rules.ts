export type PasswordRuleResult = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
};

export function validatePassword(password: string): PasswordRuleResult {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}
