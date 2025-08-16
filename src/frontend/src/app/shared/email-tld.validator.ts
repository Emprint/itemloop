import { AbstractControl, ValidationErrors } from '@angular/forms';

export function emailTldValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  // Basic email regex with TLD requirement
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  return emailRegex.test(value) ? null : { email: true };
}
