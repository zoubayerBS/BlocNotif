const INFO_TYPES = [
  'Protocole anesthésique',
  'Info',
  'Annonce',
  'Appel Astreinte',
];

export function isInfoType(type) {
  return INFO_TYPES.includes(type);
}

export function getResolveLabel(type) {
  return isInfoType(type) ? 'Pris en connaissance' : 'Résolu';
}

export function getResolveToast(type) {
  return isInfoType(type) ? 'Marqué comme pris en connaissance' : 'Notification résolue';
}
