import { useId } from 'react';
import { X } from 'lucide-react';

const sizeClasses = {
  xs: 'h-6 px-2 text-xs',
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export const Spinner = ({ className = '', size = 'md' }) => (
  <div className={`flex items-center justify-center ${className}`} role="status" aria-label="Loading">
    <svg className={`animate-spin text-current ${sizeClasses[size] || sizeClasses.md}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  </div>
);

export const Card = ({ children, className = '', onClick, noPadding = false }) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    className={`bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] ${noPadding ? '' : 'p-5'} transition-all duration-150 ${onClick ? 'cursor-pointer hover:bg-[var(--bg-secondary)]' : ''} ${className}`}
  >
    {children}
  </div>
);

export const SectionCard = ({ title, subtitle, action, children, className = '', noPadding = false }) => (
  <div className={`bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden ${className}`}>
    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        {subtitle && <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
    <div className={noPadding ? '' : 'p-5'}>{children}</div>
  </div>
);

export const PageHeader = ({ title, subtitle, actions, badge }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">{title}</h1>
        {badge}
      </div>
      {subtitle && <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

export const Button = ({ children, onClick, variant = 'primary', size = 'md', loading = false, disabled = false, className = '', icon: Icon, iconRight: IconRight, type = 'button' }) => {
  const isDisabled = disabled || loading;
  const variantClasses = {
    primary: 'bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]',
    secondary: 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-base)]',
    danger: 'bg-[var(--danger)] text-white hover:bg-[var(--danger-dark)]',
    outline: 'bg-transparent border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] || variantClasses.primary} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading ? <Spinner className="text-current" size={size} /> : null}
      {!loading && Icon ? <Icon className={`h-4 w-4 ${loading ? 'opacity-0' : ''}`} aria-hidden="true" /> : null}
      {children}
      {!loading && IconRight ? <IconRight className="h-4 w-4" aria-hidden="true" /> : null}
    </button>
  );
};

export const Input = ({
  label,
  placeholder,
  value,
  onChange,
  error,
  hint,
  required = false,
  disabled = false,
  className = '',
  icon: Icon,
  name,
  autoComplete,
  type = 'text',
  min,
  max,
  step,
}) => {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-[var(--text-secondary)]">
          {label}
          {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-4 w-4 text-[var(--text-tertiary)]" />
          </div>
        )}
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
          aria-invalid={!!error}
          className={`w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] transition duration-150 ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2 ${disabled ? 'opacity-60 cursor-not-allowed' : 'focus:border-[var(--brand)] focus:outline-none'}`}
        />
      </div>
      {error ? <span className="text-xs text-[var(--danger)] font-medium">{error}</span> : hint ? <span className="text-xs text-[var(--text-tertiary)]">{hint}</span> : null}
    </div>
  );
};

export const Textarea = ({ label, placeholder, value, onChange, error, required = false, disabled = false, rows = 3, className = '' }) => {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-[var(--text-secondary)]">
          {label}
          {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
        </label>
      )}
      <textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        rows={rows}
        className={`w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] px-3 py-2 transition duration-150 focus:border-[var(--brand)] focus:outline-none ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      />
      {error ? <span className="text-xs text-[var(--danger)] font-medium">{error}</span> : null}
    </div>
  );
};

export const Select = ({ label, value, onChange, options = [], error, required = false, disabled = false, className = '', placeholder }) => {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-[var(--text-secondary)]">
          {label}
          {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] px-3 py-2 transition duration-150 focus:border-[var(--brand)] focus:outline-none ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-[var(--danger)] font-medium">{error}</span> : null}
    </div>
  );
};

export const Badge = ({ type = 'default', text }) => {
  const palette = {
    active: 'bg-emerald-100 text-emerald-700',
    pending_approval: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-rose-100 text-rose-700',
    delivered: 'bg-slate-100 text-slate-700',
    default: 'bg-slate-100 text-slate-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${palette[type] || palette.default}`}>
      {text || type.replace('_', ' ').toUpperCase()}
    </span>
  );
};

export const EmptyState = ({ title, description, icon: Icon, actionButton }) => (
  <div className="rounded-3xl border border-slate-200 bg-[var(--bg-base)] p-8 text-center">
    {Icon && <Icon className="mx-auto mb-4 h-10 w-10 text-[var(--text-secondary)]" aria-hidden="true" />}
    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{title}</h3>
    <p className="text-sm text-[var(--text-secondary)] mb-4">{description}</p>
    {actionButton}
  </div>
);

export const Modal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 pr-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export const SkeletonTable = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
      {[...Array(rows)].map((_, rIdx) => (
        <div key={rIdx} className="flex gap-4 border-b border-slate-100 py-3">
          {[...Array(cols)].map((_, cIdx) => (
            <div key={cIdx} className="h-4 bg-slate-200 rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const SkeletonCard = () => (
  <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 space-y-4 animate-pulse w-full">
    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
    <div className="h-24 bg-slate-200 rounded w-full"></div>
  </div>
);

export const ConfirmationDialog = ({ open, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-base)] border border-[var(--border)] p-6 shadow-2xl flex flex-col gap-4 animate-scale-in">
        <h2 className="text-md font-bold text-[var(--text-primary)]">{title}</h2>
        <p className="text-sm text-[var(--text-secondary)]">{message}</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onCancel}>{cancelText}</Button>
          <Button variant={variant} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
};
