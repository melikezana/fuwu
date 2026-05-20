export function StatusBadge({ 
  status, 
  tone = "neutral" 
}: { 
  status: string; 
  tone?: "neutral" | "success" | "warning" | "error" | "info";
}) {
  const tones = {
    neutral: "bg-gray-100 text-gray-800 border-gray-200",
    success: "bg-[var(--trust-green-soft)] text-[var(--trust-green)] border-[rgba(23,116,95,0.2)]",
    warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
    error: "bg-red-50 text-red-800 border-red-200",
    info: "bg-blue-50 text-blue-800 border-blue-200"
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${tones[tone]}`}>
      {status}
    </span>
  );
}
