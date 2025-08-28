import { createContext, useContext, useState } from "react";

export const SelectedContext = createContext({
  selected: [],
  addSelected: () => {},
  removeSelected: () => {},
  clearSelected: () => {},
  getFirstSelected: () => null,
  getSelectedForSubmit: () => null,
});

export default function SelectedProvider({ children }) {
  const [selected, setSelected] = useState([]);

  const addSelected = (frameId) => {
    setSelected(prev => {
      if (!prev.includes(frameId)) {
        return [...prev, frameId];
      }
      return prev;
    });
  };

  const removeSelected = (frameId) => {
    setSelected(prev => prev.filter(id => id !== frameId));
  };

  const clearSelected = () => {
    setSelected([]);
  };

  const getFirstSelected = () => {
    return selected.length > 0 ? selected[0] : null;
  };

  const getSelectedForSubmit = () => {
    return selected.length > 0 ? selected[0] : null;
  };

  return (
    <SelectedContext.Provider
      value={{
        selected,
        addSelected,
        removeSelected,
        clearSelected,
        getFirstSelected,
        getSelectedForSubmit,
      }}
    >
      {children}
    </SelectedContext.Provider>
  );
}

export function useSelected() {
  const context = useContext(SelectedContext);
  if (!context) {
    throw new Error('useSelected must be used within a SelectedProvider');
  }
  return context;
}