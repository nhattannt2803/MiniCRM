import { create } from 'zustand';

export type EntityType = 'CONTACT' | 'COMPANY';

interface SettingsState {
  defaultEntityType: EntityType;
  setDefaultEntityType: (type: EntityType) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  defaultEntityType: (localStorage.getItem('defaultEntityType') as EntityType) || 'CONTACT',
  setDefaultEntityType: (type: EntityType) => {
    localStorage.setItem('defaultEntityType', type);
    set({ defaultEntityType: type });
  },
}));
