import type { JwtPayload } from '../../api/models';

/**
 * Decodifica el payload de un JWT **sin verificar la firma**.
 *
 * Esto es seguro y deliberado: el cliente solo lee el token para saber a qué
 * tenant pertenece y armar el contexto de UI. Quien valida firma y vigencia de
 * verdad es el backend en cada request. Nunca tomes una decisión de seguridad
 * real basándote solo en esto.
 */
export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const payload = parts[1];
  if (!payload) return null;

  try {
    const json = decodeBase64Url(payload);
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { usuario_id, tenant_slug, exp } = parsed as Record<string, unknown>;
    if (typeof usuario_id !== 'string' || typeof tenant_slug !== 'string') return null;
    if (typeof exp !== 'number') return null;

    return { usuario_id, tenant_slug, exp };
  } catch {
    return null;
  }
}

/**
 * `exp` viene en segundos desde epoch (no en milisegundos, como Date.now()).
 * El margen evita mandar un token que expira en pleno vuelo de la request.
 */
export function isExpired(payload: JwtPayload, skewSeconds = 30): boolean {
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
}

export function expiresAt(payload: JwtPayload): Date {
  return new Date(payload.exp * 1000);
}

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);

  // atob da bytes crudos; el payload puede traer acentos en UTF-8, así que hay
  // que redecodificarlo o "Muñoz" llega roto.
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
