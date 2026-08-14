/**
 * Decodifica el payload de un JWT **sin verificar la firma**.
 *
 * Esto es seguro y deliberado: el cliente solo lee el token para saber a qué
 * tenant pertenece y armar el contexto de UI. Quien valida firma y vigencia de
 * verdad es el backend en cada request. Nunca tomes una decisión de seguridad
 * real basándote solo en esto.
 */
export function decodeJwt(token) {
  const parsed = decodeClaims(token);
  if (!parsed) return null;
  const { sub, tid, exp } = parsed;
  if (typeof sub !== 'string' || typeof tid !== 'string') return null;
  if (typeof exp !== 'number') return null;
  return { sub, tid, exp };
}
/**
 * Claims crudos, sin interpretar. Existe porque hay **dos** formas de token en
 * la aplicación: el de tenant lleva `tid` y el del portal de plataforma no
 * (lleva `typ: 'sysadmin'` y `jti`). `decodeJwt` exige `tid`, así que devolvería
 * `null` para un token de SysAdmin perfectamente válido.
 *
 * Cada superficie valida sus propios claims sobre esto; lo único compartido es
 * el troceado y el Base64URL, que es lo que no tiene sentido duplicar.
 */
export function decodeClaims(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payload = parts[1];
  if (!payload) return null;
  try {
    const parsed = JSON.parse(decodeBase64Url(payload));
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}
/**
 * `exp` viene en segundos desde epoch (no en milisegundos, como Date.now()).
 * El margen evita mandar un token que expira en pleno vuelo de la request.
 */
export function isExpired(payload, skewSeconds = 30) {
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
}
export function expiresAt(payload) {
  return new Date(payload.exp * 1000);
}
function decodeBase64Url(input) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  // atob da bytes crudos; el payload puede traer acentos en UTF-8, así que hay
  // que redecodificarlo o "Muñoz" llega roto.
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
