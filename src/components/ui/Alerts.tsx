import { CheckCircle2, AlertCircle, XCircle, Info } from "lucide-react";

interface AlertProps {
  title?: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  className?: string;
}

export function Alert({ title, message, type = "info", className = "" }: AlertProps) {
  const styles = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: <CheckCircle2 className="text-green-500" size={20} />,
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: <XCircle className="text-red-500" size={20} />,
    },
    warning: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "text-orange-800",
      icon: <AlertCircle className="text-orange-500" size={20} />,
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      icon: <Info className="text-blue-500" size={20} />,
    },
  };

  const current = styles[type];

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${current.bg} ${current.border} ${className}`}>
      <div className="flex-shrink-0 mt-0.5">{current.icon}</div>
      <div>
        {title && <h4 className={`font-semibold mb-1 ${current.text}`}>{title}</h4>}
        <p className={`text-sm ${current.text} opacity-90`}>{message}</p>
      </div>
    </div>
  );
}
