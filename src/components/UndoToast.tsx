import { useState, useEffect, useRef } from "react";

interface UndoToastProps {
  message: string;
  duration?: number;
  onUndo: () => void;
  onExpire: () => void;
}

const UndoToast = ({ message, duration = 5000, onUndo, onExpire }: UndoToastProps) => {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      onExpire();
    }, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, onExpire]);

  const handleUndo = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    onUndo();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div
        className="flex items-center gap-4 px-5 py-3 rounded-lg"
        style={{
          background: "#1C1810",
          border: "0.5px solid rgba(196,151,58,0.3)",
          borderRadius: "8px",
        }}
      >
        <span
          className="font-['EB_Garamond'] text-[13px]"
          style={{ color: "#A89878" }}
        >
          {message}
        </span>
        <button
          onClick={handleUndo}
          className="font-['EB_Garamond'] text-[13px] font-semibold transition-colors hover:opacity-80"
          style={{ color: "#C4973A" }}
        >
          Undo
        </button>
      </div>
    </div>
  );
};

export default UndoToast;
