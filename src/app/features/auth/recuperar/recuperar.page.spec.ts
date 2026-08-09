import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CoreApi } from '../../../api/services/core.api';
import { createApiError } from '../../../core/errors/api-error.model';
import { RecuperarPage } from './recuperar.page';

/** El mensaje genérico del backend (RN02): idéntico exista el correo o no. */
const MSG = 'Si el correo existe en nuestro sistema, recibira instrucciones.';

interface Interno {
  form: {
    getRawValue: () => { tenant_slug: string; correo: string };
    patchValue: (v: Partial<{ tenant_slug: string; correo: string }>) => void;
    invalid: boolean;
  };
  enviar: () => Promise<void>;
  enviado: () => string | null;
  reiniciar: () => void;
}

/**
 * Solicitud de restablecimiento (RF-18).
 *
 * Lo que estas pruebas protegen no es el formulario, es la regla de privacidad:
 * la pantalla **no puede** decir nada distinto según si el correo existe. El
 * backend responde siempre lo mismo y aquí se muestra su mensaje literal; si
 * alguien lo sustituye por un «te enviamos un correo», la interfaz empieza a
 * afirmar algo que el servidor no ha confirmado.
 */
describe('RecuperarPage', () => {
  let fixture: ComponentFixture<RecuperarPage>;
  let interno: Interno;
  let solicitar: ReturnType<typeof vi.fn>;

  function montar(tenant = ''): void {
    solicitar = vi.fn().mockResolvedValue({ mensaje: MSG });

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: '**', children: [] }]),
        { provide: CoreApi, useValue: { solicitarRestablecimiento: solicitar } },
      ],
    });

    fixture = TestBed.createComponent(RecuperarPage);
    fixture.componentRef.setInput('tenant', tenant);
    fixture.detectChanges();
    interno = fixture.componentInstance as unknown as Interno;
  }

  /**
   * jsdom no implementa `innerText` (depende del renderizado), así que se usa
   * `textContent` con los espacios normalizados: el template los reparte en
   * varias líneas y un espacio literal en el patrón no encajaría.
   */
  const texto = () =>
    ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

  it('arranca con el formulario vacío', () => {
    montar();

    expect(interno.form.getRawValue()).toEqual({ tenant_slug: '', correo: '' });
    expect(interno.enviado()).toBeNull();
  });

  it('siembra la organización que llega del login por la query', () => {
    // Se lee en ngOnInit: los `input()` no están disponibles en el constructor.
    montar('acme');

    expect(interno.form.getRawValue().tenant_slug).toBe('acme');
  });

  it('recorta los espacios al salir del campo', () => {
    // `Validators.email` rechaza un correo con espacios alrededor, así que sin
    // esto un correo pegado del portapapeles deja el botón deshabilitado.
    montar();
    interno.form.patchValue({ tenant_slug: '  acme  ', correo: '  ana@acme.com  ' });

    for (const id of ['#tenant_slug', '#correo']) {
      fixture.nativeElement.querySelector(id).dispatchEvent(new FocusEvent('blur'));
    }

    expect(interno.form.getRawValue()).toEqual({ tenant_slug: 'acme', correo: 'ana@acme.com' });
    expect(interno.form.invalid).toBe(false);
  });

  it('manda la organización en minúsculas', async () => {
    montar();
    interno.form.patchValue({ tenant_slug: 'ACME', correo: 'ana@acme.com' });

    await interno.enviar();

    expect(solicitar).toHaveBeenCalledWith({ tenant_slug: 'acme', correo: 'ana@acme.com' });
  });

  it('no envía sin organización', async () => {
    montar();
    interno.form.patchValue({ tenant_slug: '', correo: 'ana@acme.com' });

    await interno.enviar();

    expect(solicitar).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del servidor palabra por palabra', async () => {
    montar();
    interno.form.patchValue({ tenant_slug: 'acme', correo: 'ana@acme.com' });

    await interno.enviar();
    await fixture.whenStable();

    expect(interno.enviado()).toBe(MSG);
    expect(texto()).toContain(MSG);
  });

  it('no afirma que el correo exista ni que se haya enviado nada', async () => {
    montar();
    interno.form.patchValue({ tenant_slug: 'acme', correo: 'ana@acme.com' });

    await interno.enviar();
    await fixture.whenStable();

    // Un «te hemos enviado un correo» confirmaría la existencia de la cuenta,
    // que es justo lo que el backend se cuida de no revelar.
    expect(texto()).not.toMatch(/te (hemos )?enviad/i);
    expect(texto()).not.toMatch(/enviamos/i);
  });

  it('avisa de la vigencia de una hora y del cierre de sesiones', async () => {
    montar();
    interno.form.patchValue({ tenant_slug: 'acme', correo: 'ana@acme.com' });

    await interno.enviar();
    await fixture.whenStable();

    expect(texto()).toContain('1 hora');
    expect(texto()).toMatch(/cerrar[aá]n todas tus sesiones/i);
  });

  it('deja volver al formulario conservando la organización', async () => {
    montar();
    interno.form.patchValue({ tenant_slug: 'acme', correo: 'ana@acme.com' });
    await interno.enviar();
    await fixture.whenStable();

    interno.reiniciar();
    await fixture.whenStable();

    expect(interno.enviado()).toBeNull();
    expect(interno.form.getRawValue()).toEqual({ tenant_slug: 'acme', correo: '' });
  });

  it('muestra el error si la petición falla, sin dar por enviado', async () => {
    montar();
    solicitar.mockRejectedValue(
      createApiError({ kind: 'network', status: 0, message: 'Sin conexión.', extra: {} }),
    );
    interno.form.patchValue({ tenant_slug: 'acme', correo: 'ana@acme.com' });

    await interno.enviar();
    await fixture.whenStable();

    expect(interno.enviado()).toBeNull();
    expect(texto()).toContain('Sin conexión.');
  });
});
