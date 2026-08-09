import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CoreApi } from '../../../api/services/core.api';
import { createApiError } from '../../../core/errors/api-error.model';
import { RestablecerPage } from './restablecer.page';

const MSG_OK = 'Contrasena restablecida. Inicie sesion de nuevo.';

interface Interno {
  form: {
    getRawValue: () => { token: string; password: string; confirmacion: string };
    patchValue: (v: Partial<{ token: string; password: string; confirmacion: string }>) => void;
  };
  enviar: () => Promise<void>;
  listo: () => string | null;
}

/**
 * Canje del enlace de restablecimiento (RF-18).
 *
 * Además del camino feliz, se fija que el aviso de que **se cerrarán todas las
 * sesiones** esté visible ANTES de enviar: es la consecuencia que sorprende, y
 * descubrirla al quedarse fuera del móvil es la peor manera de aprenderla.
 */
describe('RestablecerPage', () => {
  let fixture: ComponentFixture<RestablecerPage>;
  let interno: Interno;
  let restablecer: ReturnType<typeof vi.fn>;

  function montar(token = ''): void {
    restablecer = vi.fn().mockResolvedValue({ mensaje: MSG_OK });

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: '**', children: [] }]),
        { provide: CoreApi, useValue: { restablecerPassword: restablecer } },
      ],
    });

    fixture = TestBed.createComponent(RestablecerPage);
    fixture.componentRef.setInput('token', token);
    fixture.detectChanges();
    interno = fixture.componentInstance as unknown as Interno;
  }

  /** `innerText` no existe en jsdom; `textContent` con espacios normalizados sí. */
  const texto = () =>
    ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

  it('avisa del cierre de sesiones antes de enviar, no después', () => {
    montar('tok-123');

    expect(texto()).toMatch(/cerrar[aá]n\s+todas\s+tus\s+sesiones/i);
    expect(interno.listo()).toBeNull();
  });

  it('oculta el campo del código cuando llega en el enlace', () => {
    montar('tok-123');

    expect(fixture.nativeElement.querySelector('#token')).toBeNull();
  });

  it('pide el código a mano cuando no viene en el enlace', () => {
    montar('');

    expect(fixture.nativeElement.querySelector('#token')).not.toBeNull();
  });

  it('manda el token del enlace y la contraseña', async () => {
    montar('tok-123');
    interno.form.patchValue({ password: 'unaClaveLarga1', confirmacion: 'unaClaveLarga1' });

    await interno.enviar();

    expect(restablecer).toHaveBeenCalledWith({ token: 'tok-123', password: 'unaClaveLarga1' });
  });

  it('usa el código escrito a mano si no hay enlace', async () => {
    montar('');
    interno.form.patchValue({
      token: ' tok-manual ',
      password: 'unaClaveLarga1',
      confirmacion: 'unaClaveLarga1',
    });

    await interno.enviar();

    expect(restablecer).toHaveBeenCalledWith({ token: 'tok-manual', password: 'unaClaveLarga1' });
  });

  it('no envía si las dos contraseñas no coinciden', async () => {
    montar('tok-123');
    interno.form.patchValue({ password: 'unaClaveLarga1', confirmacion: 'otraDistinta2' });

    await interno.enviar();

    expect(restablecer).not.toHaveBeenCalled();
  });

  it('no envía sin token', async () => {
    montar('');
    interno.form.patchValue({ password: 'unaClaveLarga1', confirmacion: 'unaClaveLarga1' });

    await interno.enviar();

    expect(restablecer).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del servidor al terminar', async () => {
    montar('tok-123');
    interno.form.patchValue({ password: 'unaClaveLarga1', confirmacion: 'unaClaveLarga1' });

    await interno.enviar();
    await fixture.whenStable();

    expect(interno.listo()).toBe(MSG_OK);
    expect(texto()).toContain(MSG_OK);
  });

  it('enseña el 422 del token caducado y deja pedir otro enlace', async () => {
    // Token inválido y token caducado dan el mismo error a propósito del
    // backend: distinguirlos diría si el enlace existió.
    montar('tok-viejo');
    restablecer.mockRejectedValue(
      createApiError({
        kind: 'business',
        status: 422,
        message: 'El enlace de restablecimiento es invalido o expiro.',
        field: 'token',
        extra: {},
      }),
    );
    interno.form.patchValue({ password: 'unaClaveLarga1', confirmacion: 'unaClaveLarga1' });

    await interno.enviar();
    await fixture.whenStable();

    expect(interno.listo()).toBeNull();
    expect(texto()).toContain('El enlace de restablecimiento es invalido o expiro.');
    expect(texto()).toMatch(/pide otro/i);
  });

  it('marca el campo cuando el 422 señala la contraseña', async () => {
    // La política vive en la configuración del tenant y no se puede leer sin
    // sesión: el mínimo real lo dice el backend, no esta pantalla.
    montar('tok-123');
    restablecer.mockRejectedValue(
      createApiError({
        kind: 'business',
        status: 422,
        message: 'La contrasena debe tener al menos 12 caracteres.',
        field: 'password',
        extra: {},
      }),
    );
    interno.form.patchValue({ password: 'corta', confirmacion: 'corta' });

    await interno.enviar();
    await fixture.whenStable();

    expect(texto()).toContain('La contrasena debe tener al menos 12 caracteres.');
  });
});
