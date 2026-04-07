export default function PrimaryButton({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`
        bg-emerald-600 hover:bg-emerald-700
        text-white font-semibold
        px-6 py-3 rounded-full
        shadow-md hover:shadow-lg
        transition-all duration-200
        ${className}
      `}
    >
      {children}
    </button>
  );
}