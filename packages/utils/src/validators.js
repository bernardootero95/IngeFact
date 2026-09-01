const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_REGEX.test(value);
}

/**
 * Misma regla que ResetPasswordRequest.validar_password en el backend
 * (src/domain/auth.py) -- min 8 caracteres, con letras y numeros.
 */
export function isStrongPassword(value) {
  if (!value || value.length < 8) return false;
  return /[a-zA-Z]/.test(value) && /[0-9]/.test(value);
}
