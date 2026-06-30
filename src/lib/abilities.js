import { AbilityBuilder, createMongoAbility } from '@casl/ability';

const roleActions = {
  'surveillant bloc': {
    User: ['manage'],
    Notification: ['manage'],
    Permutation: ['manage'],
    Room: ['manage'],
  },
  'technicien': {
    User: ['read'],
    Notification: ['create', 'read', 'acknowledge', 'resolve'],
    Permutation: ['create', 'read'],
    Room: ['read'],
  },
  'medecin anesthesiste': {
    User: ['read'],
    Notification: ['create', 'read', 'acknowledge', 'resolve'],
    Permutation: ['create', 'read'],
    Room: ['read'],
  },
  'instrumentiste': {
    User: ['read'],
    Notification: ['create', 'read', 'acknowledge', 'resolve'],
    Permutation: ['create', 'read'],
    Room: ['read'],
  },
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
