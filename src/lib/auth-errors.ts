type AuthError = { status?: number; code?: string; message?: string }

// Plain-language messages for the failures a person can act on.
export function authErrorMessage(error: AuthError): string {
  if (error.status === 429) {
    return 'Too many attempts. Wait a minute, then try again.'
  }
  switch (error.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return "That email and password don’t match. Check both, or reset your password."
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'An account with that email already exists. Try signing in instead.'
    case 'INVALID_TOKEN':
      return 'This reset link has expired or was already used. Request a new one.'
    case 'PASSWORD_TOO_SHORT':
      return 'Your password needs at least 8 characters.'
  }
  return "We couldn’t complete that. Check your connection and try again."
}

export const EMAIL_PROBLEM = 'Enter an email address like name@example.com.'
export const PASSWORD_PROBLEM = 'Use at least 8 characters.'

export function isEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim())
}
