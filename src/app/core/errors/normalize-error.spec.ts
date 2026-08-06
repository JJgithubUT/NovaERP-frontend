import { HttpErrorResponse } from '@angular/common/http';
import { normalizeError } from './normalize-error';

/**
 * Estos tests fijan el contrato del Flujo 5. Si el backend homologa algún día
 * sus dos dialectos de error, deben seguir pasando: `normalize-error` tiene que
 * aguantar ambos formatos durante la transición.
 */
describe('normalizeError', () => {
  it('lee el `mensaje` de los errores de auth', () => {
    const error = normalizeError(
      new HttpErrorResponse({
        status: 401,
        url: '/api/auth/login/',
        error: { mensaje: 'Credenciales incorrectas' },
      }),
    );

    expect(error.kind).toBe('auth');
    expect(error.message).toBe('Credenciales incorrectas');
  });

  it('lee el `detail` del resto de endpoints', () => {
    const error = normalizeError(
      new HttpErrorResponse({ status: 404, error: { detail: 'No encontrado' } }),
    );

    expect(error.kind).toBe('not_found');
    expect(error.message).toBe('No encontrado');
  });

  it('expone `campo` para que el formulario marque el control exacto', () => {
    const error = normalizeError(
      new HttpErrorResponse({
        status: 422,
        error: { detail: 'SKU ya existe en este tenant.', campo: 'sku' },
      }),
    );

    expect(error.kind).toBe('business');
    expect(error.field).toBe('sku');
  });

  it('conserva los datos extra de las reglas de negocio', () => {
    const error = normalizeError(
      new HttpErrorResponse({
        status: 422,
        error: {
          detail: 'Cliente con saldo pendiente en CxC; no puede darse de baja.',
          saldo_pendiente: '1234.56',
        },
      }),
    );

    // El saldo llega como decimal string y la UI debe poder mostrarlo.
    expect(error.extra['saldo_pendiente']).toBe('1234.56');
  });

  it('trata el status 0 como fallo de red, no como error del servidor', () => {
    const error = normalizeError(
      new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }),
    );

    expect(error.kind).toBe('network');
    expect(error.message).toContain('conexión');
  });

  it('sobrevive a un cuerpo que no es JSON', () => {
    const error = normalizeError(
      new HttpErrorResponse({ status: 502, error: '<html>Bad Gateway</html>' }),
    );

    expect(error.kind).toBe('server');
    expect(error.message).toBeTruthy();
  });

  it('no vuelve a envolver un error ya normalizado', () => {
    const original = normalizeError(
      new HttpErrorResponse({ status: 422, error: { detail: 'x', campo: 'sku' } }),
    );
    const otraVez = normalizeError(original);

    expect(otraVez.field).toBe('sku');
    expect(otraVez.message).toBe('x');
  });
});
