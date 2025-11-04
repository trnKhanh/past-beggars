import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now();
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after 2 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2000);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        message,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
      });
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, showConfirm }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function Toast({ message, type, onClose }) {
  const bgColor = {
    success: "bg-green-100 hover:bg-green-200",
    error: "bg-red-100 hover:bg-red-200",
    warning: "bg-yellow-100 hover:bg-yellow-200",
    info: "bg-sky-100 hover:bg-sky-200",
  }[type] || "bg-gray-100 hover:bg-gray-200";

  return (
    <div
      className={`${bgColor} border-2 border-black rounded-xl shadow-lg min-w-[300px] max-w-[500px] animate-slide-in cursor-pointer`}
      onClick={onClose}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex-1 whitespace-pre-wrap break-words text-gray-900 text-lg">{message}</div>
        <button
          onClick={onClose}
          className="text-gray-900 hover:text-gray-600 font-bold text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-white rounded-lg shadow-2xl min-w-[400px] max-w-[500px] animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Submission</h3>
          <p className="text-gray-700 mb-6">{message}</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onConfirm}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 rounded-xl border-2 border-black text-lg px-4 py-1 bg-sky-100 hover:bg-sky-200 active:bg-sky-300"
            >
              Submit
            </button>
            <button
              onClick={onCancel}
              onKeyDown={handleKeyDown}
              className="flex-1 rounded-xl border-2 border-black text-lg px-4 py-1 bg-red-100 hover:bg-red-200 active:bg-red-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}