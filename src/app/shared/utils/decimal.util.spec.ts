import { isNonNegative, parseDecimal, toDecimal } from './decimal.util';

describe('decimal.util', () => {
  it('no pierde precisión donde parseFloat sí la perdería', () => {
    // Este es el motivo entero de que el backend mande decimales como string.
    const suma = toDecimal('0.1').plus('0.2');
    expect(suma.toString()).toBe('0.3');
    expect(0.1 + 0.2).not.toBe(0.3);
  });

  it('serializa sin notación exponencial', () => {
    // Django rechazaría "1e-7"; tiene que salir "0.0000001".
    expect(toDecimal('0.0000001').toString()).toBe('0.0000001');
  });

  it('rechaza lo que no es un decimal', () => {
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('  ')).toBeNull();
  });

  it('normaliza espacios y ceros a la izquierda', () => {
    expect(parseDecimal(' 007.50 ')).toBe('7.5');
  });

  it('valida la regla "debe ser >= 0" del backend antes de mandar la petición', () => {
    expect(isNonNegative('0')).toBe(true);
    expect(isNonNegative('13500.10')).toBe(true);
    expect(isNonNegative('-1')).toBe(false);
    expect(isNonNegative('abc')).toBe(false);
  });
});
