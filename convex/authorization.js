import { defineAbilitiesFor } from '../src/lib/abilities.js';

export async function getUserFromContext(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Non authentifié');
  const user = await ctx.db.get(identity.subject);
  if (!user) throw new Error('Utilisateur introuvable');
  return user;
}

export function checkAbility(user, action, subject) {
  const ability = defineAbilitiesFor(user.role);
  if (!ability.can(action, subject)) {
    throw new Error('Non autorisé');
  }
  return ability;
}

const VALID_ROLES = [
  'technicien',
  'medecin anesthesiste',
  'surveillant bloc',
  'instrumentiste',
  'superuser',
];

// Rôle réservé : jamais attribuable par inscription ni par un non-superuser
export function isReservedRole(role) {
  return role === 'superuser';
}

export function validateRole(role) {
  if (!VALID_ROLES.includes(role)) {
    throw new Error('Rôle invalide');
  }
}
