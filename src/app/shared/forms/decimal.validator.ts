import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { isNonNegative, isValidDecimal, toDecimal } from '../utils/decimal.util';

/**
 * Valida los campos decimales **sin convertirlos a `number`**.
 *
 * Un `Validators.min(0)` sobre un control de texto obliga a Angular a hacer una
 * coerción numérica, y es justo lo que este proyecto evita: los importes viajan
 * como string para no perder precisión. Estos validadores delegan en Big.
 */

/** Decimal válido y ≥ 0. Vacío se considera válido: eso lo dice `required`. */
export function decimalNoNegativo(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '').trim();
  if (valor === '') return null;
  return isNonNegative(valor) ? null : { decimal: true };
}

/** Decimal válido, de cualquier signo. Para los ajustes, que pueden restar. */
export function decimal(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '').trim();
  if (valor === '') return null;
  return isValidDecimal(valor) ? null : { decimal: true };
}

/**
 * Decimal válido y distinto de cero.
 *
 * Es la regla de la cantidad de un ajuste: puede sumar o restar, pero un ajuste
 * de cero no significa nada y el backend lo rechaza con 422.
 */
export function decimalNoCero(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '').trim();
  if (valor === '') return null;
  if (!isValidDecimal(valor)) return { decimal: true };
  // Con Big y no con `Number`: la comparación tiene que ser exacta, igual que
  // la que hará el backend sobre el Decimal.
  return toDecimal(valor).eq(0) ? { cero: true } : null;
}
