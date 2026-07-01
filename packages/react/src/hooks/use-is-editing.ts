import { useVeneer } from './use-veneer.js';

//A small convenience hook that returns only whether edit mode is currently on.
//Use it in your own components to react to editing, for example to hide a
//section or show a banner while someone is editing.
export const useIsEditing = (): boolean => useVeneer().isEditing;
