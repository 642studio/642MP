import type { AppRole } from '../types/domain';

const ROLE_ACCESS: Record<AppRole, AppRole[]> = {
  admin: ['admin', 'direccion', 'community', 'produccion', 'fotografia', 'editor', 'readonly'],
  direccion: ['direccion', 'community', 'produccion', 'fotografia', 'editor', 'readonly'],
  community: ['community', 'editor', 'readonly'],
  produccion: ['produccion', 'fotografia', 'readonly'],
  fotografia: ['fotografia', 'readonly'],
  editor: ['editor', 'readonly'],
  readonly: ['readonly'],
};

export const canAccess = (currentRole: AppRole, targetRole: AppRole) =>
  ROLE_ACCESS[currentRole]?.includes(targetRole) ?? false;

export const canEditCampaign = (role: AppRole) =>
  ['admin', 'direccion', 'community', 'editor'].includes(role);

export const canEditProduction = (role: AppRole) =>
  ['admin', 'direccion', 'produccion', 'fotografia'].includes(role);

export const canManageRider = (role: AppRole) =>
  ['admin', 'direccion', 'community', 'produccion', 'fotografia'].includes(role);
