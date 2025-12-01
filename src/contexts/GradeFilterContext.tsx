import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GradeFilterContextType {
  selectedGrades: string[];
  setSelectedGrades: (grades: string[]) => void;
  availableGrades: string[];
  setAvailableGrades: (grades: string[]) => void;
  toggleGrade: (grade: string) => void;
  clearAllGrades: () => void;
  isGradeSelected: (grade: string) => boolean;
}

const GradeFilterContext = createContext<GradeFilterContextType | undefined>(undefined);

export const GradeFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);

  const toggleGrade = (grade: string) => {
    if (selectedGrades.includes(grade)) {
      setSelectedGrades(prev => prev.filter(g => g !== grade));
    } else {
      setSelectedGrades(prev => [...prev, grade]);
    }
  };

  const clearAllGrades = () => {
    setSelectedGrades([]);
  };

  const isGradeSelected = (grade: string) => {
    return selectedGrades.includes(grade);
  };

  return (
    <GradeFilterContext.Provider
      value={{
        selectedGrades,
        setSelectedGrades,
        availableGrades,
        setAvailableGrades,
        toggleGrade,
        clearAllGrades,
        isGradeSelected,
      }}
    >
      {children}
    </GradeFilterContext.Provider>
  );
};

export const useGradeFilter = () => {
  const context = useContext(GradeFilterContext);
  if (context === undefined) {
    throw new Error('useGradeFilter must be used within a GradeFilterProvider');
  }
  return context;
};
