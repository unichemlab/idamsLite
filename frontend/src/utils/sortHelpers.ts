// src/utils/sortHelpers.ts

export type SortOrder = 'asc' | 'desc';

/**
 * Sort array of objects by a string property
 */
export const sortByString = <T>(
  data: T[],
  key: keyof T,
  order: SortOrder = 'desc'
): T[] => {
  return [...data].sort((a, b) => {
    const aValue = String(a[key]);
    const bValue = String(b[key]);
    
    if (order === 'desc') {
      return bValue.localeCompare(aValue);
    }
    return aValue.localeCompare(bValue);
  });
};

/**
 * Sort array of objects by a numeric property
 */
export const sortByNumber = <T>(
  data: T[],
  key: keyof T,
  order: SortOrder = 'desc'
): T[] => {
  return [...data].sort((a, b) => {
    const aValue = Number(a[key]);
    const bValue = Number(b[key]);
    
    if (order === 'desc') {
      return bValue - aValue;
    }
    return aValue - bValue;
  });
};

/**
 * Generic sort function that auto-detects type
 */
export const sortData = <T>(
  data: T[],
  key: keyof T,
  order: SortOrder = 'desc'
): T[] => {
  if (!data || data.length === 0) return data;
  
  const firstValue = data[0][key];
  
  // Check if numeric
  if (typeof firstValue === 'number' || !isNaN(Number(firstValue))) {
    return sortByNumber(data, key, order);
  }
  
  // Default to string sort
  return sortByString(data, key, order);
};