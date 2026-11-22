// Compatibilidad temporal con el formato antiguo. No es cifrado de servidor.
// No lee Firestore ni envia datos. Las credenciales R1 usan su modulo independiente.
const SUFFIX = '_GestionMercenariosSecureKey2026!_';
export const RETIRED_PASSWORD = '🔒 [CONTRASEÑA DESTRUIDA POR SEGURIDAD]';

export function encryptPassword(value) {
  if (typeof value !== 'string') throw new Error('La contraseña debe ser texto.');
  if (!value) return '';
  try { return btoa(encodeURIComponent(value) + SUFFIX); }
  catch { throw new Error('No se pudo preparar la contraseña. No se ha guardado la misión.'); }
}

export function decryptPassword(value) {
  if (typeof value !== 'string' || !value) return '';
  if (value === RETIRED_PASSWORD) return value;
  try {
    const decoded = atob(value);
    // Solo se interpreta el formato historico exacto y una sola capa.
    if (btoa(decoded) !== value || !decoded.endsWith(SUFFIX)) return value;
    const encoded = decoded.slice(0, -SUFFIX.length);
    const plain = decodeURIComponent(encoded);
    if (!plain || encodeURIComponent(plain) !== encoded) return value;
    return plain;
  } catch { return value; }
}

export function legacyPasswordPatch(input, existingMission = null) {
  if (typeof input !== 'string') throw new Error('La contraseña debe ser texto.');
  if (existingMission && input === decryptPassword(existingMission.accountPass)) return {};
  if (existingMission?.status === 'Completada') {
    throw new Error('La misión está completada. No se puede cambiar su contraseña desde este formulario.');
  }
  if (input === RETIRED_PASSWORD) {
    throw new Error('El marcador de contraseña retirada no es una contraseña nueva.');
  }
  return { accountPass: encryptPassword(input) };
}
