const FormField = ({ label, children }) => (
  <div className="flex flex-col gap-1 mb-4">
    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

export default FormField;
