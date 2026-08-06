import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { isApiError, type ApiError } from '../errors/api-error.model';
import { errorInterceptor } from './error.interceptor';
import { offlineQueueInterceptor } from './offline-queue.interceptor';
import { SyncQueueService } from '../offline/sync-queue.service';

/**
 * Cubre el Flujo 4 en el punto donde se decide si el cambio del usuario se
 * guarda o se pierde.
 */
describe('offlineQueueInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let encolar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    encolar = vi.fn().mockResolvedValue({ id: 'outbox-1' });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([offlineQueueInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        { provide: SyncQueueService, useValue: { encolar } },
      ],
    });

    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  async function capturarError(promesa: Promise<unknown>): Promise<ApiError> {
    try {
      await promesa;
      throw new Error('se esperaba un error y no hubo ninguno');
    } catch (error) {
      if (!isApiError(error)) throw error;
      return error;
    }
  }

  it('encola la escritura y marca el error como `queued` al caer la red', async () => {
    const respuesta = firstValueFrom(http.post('/api/ventas/clientes/', { razon_social: 'ACME' }));
    const error = capturarError(respuesta);

    backend.expectOne('/api/ventas/clientes/').error(new ProgressEvent('error'), { status: 0 });

    const apiError = await error;

    // Sin esto el usuario vería "falló" y perdería el trabajo que sí se guardó.
    expect(apiError.queued).toBe(true);
    expect(encolar).toHaveBeenCalledOnce();
    expect(encolar.mock.calls[0]![0]).toMatchObject({
      entidad: 'clientes',
      operacion: 'crear',
      method: 'POST',
    });
  });

  it('no marca `queued` si el encolado falló: el cambio se perdió de verdad', async () => {
    encolar.mockRejectedValue(new Error('sin sesión'));

    const respuesta = firstValueFrom(http.post('/api/ventas/clientes/', {}));
    const error = capturarError(respuesta);

    backend.expectOne('/api/ventas/clientes/').error(new ProgressEvent('error'), { status: 0 });

    const apiError = await error;
    expect(apiError.queued).toBeUndefined();
    expect(apiError.kind).toBe('network');
  });

  it('deja pasar el 422 sin encolar: es una respuesta del servidor, no un fallo de red', async () => {
    const respuesta = firstValueFrom(http.post('/api/inventario/productos/', { sku: 'X' }));
    const error = capturarError(respuesta);

    backend
      .expectOne('/api/inventario/productos/')
      .flush(
        { detail: 'SKU ya existe en este tenant.', campo: 'sku' },
        { status: 422, statusText: 'Unprocessable' },
      );

    const apiError = await error;
    expect(apiError.kind).toBe('business');
    expect(apiError.field).toBe('sku');
    expect(apiError.queued).toBeUndefined();
    expect(encolar).not.toHaveBeenCalled();
  });

  it('no encola lecturas: un GET sin red no es trabajo que reproducir', async () => {
    const respuesta = firstValueFrom(http.get('/api/ventas/clientes/'));
    const error = capturarError(respuesta);

    backend.expectOne('/api/ventas/clientes/').error(new ProgressEvent('error'), { status: 0 });

    await error;
    expect(encolar).not.toHaveBeenCalled();
  });

  it('no encola peticiones fuera de los catálogos', async () => {
    const respuesta = firstValueFrom(http.post('/api/auth/login/', {}));
    const error = capturarError(respuesta);

    backend.expectOne('/api/auth/login/').error(new ProgressEvent('error'), { status: 0 });

    await error;
    expect(encolar).not.toHaveBeenCalled();
  });
});
