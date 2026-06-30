import { defineAbilitiesFor } from '../src/lib/abilities.js';

export async function getUserFromContext(ctx) {
  const userId = ctx.auth.getUserId();
  if (!userId) throw new Error('Non authentifié');
  const user = await ctx.db.get(userId);
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

const VALID_ROLES = ['technicien', 'medecin anesthesiste', 'surveillant bloc', 'instrumentiste'];

export function validateRole(role) {
  if (!VALID_ROLES.includes(role)) {
    throw new Error('Rôle invalide');
  }
}
