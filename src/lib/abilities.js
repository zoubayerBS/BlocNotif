import { AbilityBuilder, createMongoAbility } from '@casl/ability';

// Panseurs et instrumentistes ont exactement les mêmes droits
const roomStaffRights = {
  User: ['read'],
  Notification: ['create', 'read', 'acknowledge', 'resolve'],
  Permutation: ['create', 'read'],
  Absence: ['create', 'read'],
  Room: ['read'],
};

const roleActions = {
  'superuser': {
    User: ['manage'],
    Notification: ['manage'],
    Permutation: ['manage'],
    Absence: ['manage'],
    Room: ['manage'],
    Settings: ['manage'],
    Database: ['manage'],
  },
  'surveillant bloc': {
    User: ['manage'],
    Notification: ['manage'],
    Permutation: ['manage'],
    Absence: ['manage'],
    Room: ['manage'],
    Settings: ['manage'],
  },
  'technicien': {
    User: ['read'],
    Notification: ['create', 'read', 'acknowledge', 'resolve'],
    Permutation: ['create', 'read'],
    Absence: ['create', 'read'],
    Room: ['read'],
  },
  'medecin anesthesiste': {
    User: ['read'],
    Notification: ['create', 'read', 'acknowledge', 'resolve'],
    Permutation: ['create', 'read'],
    Absence: ['create', 'read'],
    Room: ['read'],
  },
  'instrumentiste': roomStaffRights,
  'panseur': roomStaffRights,
};

export function defineAbilitiesFor(role) {
  const { can, build } = new AbilityBuilder(createMongoAbility);

  const permissions = roleActions[role];
  if (permissions) {
    for (const [subject, actions] of Object.entries(permissions)) {
      for (const action of actions) {
        can(action, subject);
      }
    }
  }

  return build();
}
