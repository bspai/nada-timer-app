// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEMPLATES_KEY = 'nada_templates';

export type Template = {
  id: string;
  minutes: number;
  soundId: string;
  label: string;
  name?: string;
};

export const saveTemplate = async (
  minutes: number,
  soundId: string,
  name: string,
  id?: string,
): Promise<Template[]> => {
  try {
    const existing = await getTemplates();
    const trimmedName = name.trim();
    const fallbackName = trimmedName.length > 0 ? trimmedName : 'My ritual';
    const label = fallbackName;
    
    if (id) {
      // Update existing template
      const updated = existing.map((template) =>
        template.id === id
          ? { ...template, minutes, soundId, label, name: fallbackName }
          : template
      );
      await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
      return updated;
    } else {
      // Create new template
      const newTemplate: Template = {
        id: Date.now().toString(),
        minutes,
        soundId,
        label,
        name: fallbackName,
      };
      const updated = [...existing, newTemplate];
      await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
      return updated;
    }
  } catch (e) {
    console.error("Error saving template", e);
    return [];
  }
};

export const deleteTemplate = async (id: string): Promise<Template[]> => {
  try {
    const existing = await getTemplates();
    const updated = existing.filter((template) => template.id !== id);
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Error deleting template", e);
    return [];
  }
};

export const getTemplates = async (): Promise<Template[]> => {
  try {
    const data = await AsyncStorage.getItem(TEMPLATES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};