import { createContext, useContext, useState, useCallback } from "react";

export const SelectedContext = createContext({
  selected: [],
  addSelected: () => {},
  removeSelected: () => {},
  clearSelected: () => {},
  getFirstSelected: () => null,
  getSelectedForSubmit: () => null,
  setSubmitCallback: () => {},
  triggerSubmit: () => {},
  formValues: { queryId: '', videoId: '', answer: '' },
  updateFormValue: () => {},
});

export default function SelectedProvider({ children }) {
  const [selected, setSelected] = useState([]);
  const [submitCallback, setSubmitCallback] = useState(null);
  const [formValues, setFormValues] = useState({ queryId: '', videoId: '', answer: '' });

  const addSelected = useCallback((frameId) => {
    setSelected(prev => {
      if (!prev.includes(frameId)) {
        if (prev.length > 0) {
          const existingVideoId = prev[0].split('#')[0];
          const newVideoId = frameId.split('#')[0];

          if (existingVideoId !== newVideoId) {
            return prev;
          }
        }

        return [...prev, frameId];
      }
      return prev;
    });
  }, []);

  const removeSelected = useCallback((frameId) => {
    setSelected(prev => prev.filter(id => id !== frameId));
  }, []);

  const clearSelected = useCallback(() => {
    setSelected([]);
  }, []);

  const getFirstSelected = useCallback(() => {
    return selected.length > 0 ? selected[0] : null;
  }, [selected]);

  const getSelectedForSubmit = useCallback(() => {
    return selected.length > 0 ? selected[0] : null;
  }, [selected]);

  const triggerSubmit = useCallback(() => {
    if (submitCallback) {
      submitCallback();
    }
  }, [submitCallback]);

  const updateFormValue = useCallback((field, value) => {
    setFormValues(prev => {
      // Prevent unnecessary updates if value hasn't changed
      if (prev[field] === value) {
        return prev;
      }
      return { ...prev, [field]: value };
    });
  }, []);

  return (
    <SelectedContext.Provider
      value={{
        selected,
        addSelected,
        removeSelected,
        clearSelected,
        getFirstSelected,
        getSelectedForSubmit,
        setSubmitCallback,
        triggerSubmit,
        formValues,
        updateFormValue,
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