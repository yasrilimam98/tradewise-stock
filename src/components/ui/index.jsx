import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Minus,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// Reusable Card Component - Black & White Theme
export const Card = ({ children, className = '', hover = false }) => (
  <div className={`
    relative overflow-hidden rounded-2xl 
    bg-[#111] border border-gray-800
    ${hover ? 'hover:border-gray-600 transition-all duration-300 cursor-pointer' : ''}
    ${className}
  `}>
    {children}
  </div>
);

// Button Component - Black & White Theme
export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  className = '', 
  disabled = false,
  loading = false,
  icon = null,
  type = 'button',
  ...props 
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-semibold rounded-xl
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-white/20
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5'
  };

  const variantClasses = {
    primary: 'bg-white text-black hover:bg-gray-200',
    secondary: 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700',
    success: 'bg-green-600 text-white hover:bg-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-500',
    ghost: 'bg-transparent text-gray-400 hover:bg-gray-800 hover:text-white',
    outline: 'bg-transparent border border-gray-600 text-white hover:bg-gray-800'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  );
};

// Status Badge Component - Black & White Theme
export const StatusBadge = ({ status, size = 'md' }) => {
  const statusConfig = {
    Win: { color: 'bg-green-600 text-white', icon: CheckCircle2 },
    TP1: { color: 'bg-green-600 text-white', icon: CheckCircle2 },
    TP2: { color: 'bg-green-600 text-white', icon: CheckCircle2 },
    Loss: { color: 'bg-red-600 text-white', icon: XCircle },
    CL: { color: 'bg-red-600 text-white', icon: XCircle },
    Open: { color: 'bg-gray-600 text-white', icon: Clock },
    Breakeven: { color: 'bg-gray-500 text-white', icon: Minus },
    Ongoing: { color: 'bg-gray-600 text-white', icon: Clock },
    Finished: { color: 'bg-gray-500 text-white', icon: CheckCircle2 }
  };

  const config = statusConfig[status] || statusConfig.Open;
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${config.color} ${sizeClasses}`}>
      <Icon size={size === 'sm' ? 12 : 14} />
      {status}
    </span>
  );
};

// ROI Display Component
export const ROIBadge = ({ value, size = 'md' }) => {
  const numValue = parseFloat(value) || 0;
  const isPositive = numValue > 0;
  const isNegative = numValue < 0;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  return (
    <div className={`
      font-bold flex items-center gap-1
      ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-500'}
      ${sizeClasses[size]}
    `}>
      {isPositive && <TrendingUp size={size === 'sm' ? 14 : size === 'md' ? 18 : 24} />}
      {isNegative && <TrendingDown size={size === 'sm' ? 14 : size === 'md' ? 18 : 24} />}
      <span>{isPositive ? '+' : ''}{value}%</span>
    </div>
  );
};

// Stylish Input Field Component
export const Input = React.forwardRef(({ 
  label, 
  name, 
  icon: Icon,
  error,
  className = '',
  containerClassName = '',
  ...props 
}, ref) => (
  <div className={containerClassName}>
    {label && (
      <label htmlFor={name} className="block text-sm font-medium text-white mb-2">
        {label}
      </label>
    )}
    <div className="relative group">
      {Icon && <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" />}
      <input
        id={name}
        name={name}
        ref={ref}
        className={`
          w-full py-3.5 bg-black text-white
          border-2 border-gray-800 rounded-xl
          transition-all duration-300
          focus:outline-none focus:border-gray-500 focus:shadow-[0_0_0_4px_rgba(255,255,255,0.05)]
          hover:border-gray-700
          placeholder:text-gray-600
          disabled:opacity-50 disabled:cursor-not-allowed
          ${Icon ? 'pl-12 pr-4' : 'px-4'}
          ${error ? 'border-red-500 focus:border-red-400' : ''}
          ${className}
        `}
        {...props}
      />
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
    </div>
    {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
  </div>
));

Input.displayName = 'Input';

// Stylish Select Field Component
export const Select = ({ 
  label, 
  name, 
  options = [],
  className = '',
  containerClassName = '',
  ...props 
}) => (
  <div className={containerClassName}>
    {label && (
      <label htmlFor={name} className="block text-sm font-medium text-white mb-2">
        {label}
      </label>
    )}
    <div className="relative group">
      <select
        id={name}
        name={name}
        className={`
          w-full px-4 py-3.5 bg-black text-white
          border-2 border-gray-800 rounded-xl
          transition-all duration-300
          focus:outline-none focus:border-gray-500 focus:shadow-[0_0_0_4px_rgba(255,255,255,0.05)]
          hover:border-gray-700
          cursor-pointer appearance-none
          ${className}
        `}
        {...props}
      >
        {options.map(opt => (
          <option 
            key={typeof opt === 'object' ? opt.value : opt} 
            value={typeof opt === 'object' ? opt.value : opt}
            className="bg-black text-white"
          >
            {typeof opt === 'object' ? opt.label : opt}
          </option>
        ))}
      </select>
      {/* Custom arrow */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
    </div>
  </div>
);

// Stylish Textarea Component
export const Textarea = ({ 
  label, 
  name,
  className = '',
  containerClassName = '',
  ...props 
}) => (
  <div className={containerClassName}>
    {label && (
      <label htmlFor={name} className="block text-sm font-medium text-white mb-2">
        {label}
      </label>
    )}
    <div className="relative group">
      <textarea
        id={name}
        name={name}
        className={`
          w-full px-4 py-3.5 bg-black text-white
          border-2 border-gray-800 rounded-xl
          transition-all duration-300
          focus:outline-none focus:border-gray-500 focus:shadow-[0_0_0_4px_rgba(255,255,255,0.05)]
          hover:border-gray-700
          placeholder:text-gray-600
          resize-none min-h-[120px]
          ${className}
        `}
        {...props}
      />
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
    </div>
  </div>
);

// Loading Spinner
export const LoadingSpinner = ({ size = 'md', message = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative">
        <div className={`${sizeClasses[size]} border-4 border-gray-800 rounded-full`} />
        <div className={`absolute inset-0 ${sizeClasses[size]} border-4 border-transparent border-t-white rounded-full animate-spin`} />
      </div>
      {message && <p className="text-sm text-gray-400">{message}</p>}
    </div>
  );
};

// Empty State Component
export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action 
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {Icon && (
      <div className="w-20 h-20 rounded-2xl bg-gray-900 border border-gray-800
                      flex items-center justify-center mb-6">
        <Icon size={36} className="text-gray-600" />
      </div>
    )}
    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
    <p className="text-gray-500 max-w-sm mb-6">{description}</p>
    {action}
  </div>
);

// Divider Component
export const Divider = ({ label }) => (
  <div className="relative my-6">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-800" />
    </div>
    {label && (
      <div className="relative flex justify-center">
        <span className="px-4 bg-[#0a0a0a] text-sm text-gray-500">
          {label}
        </span>
      </div>
    )}
  </div>
);

// Avatar Component
export const Avatar = ({ name, size = 'md', className = '' }) => {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };

  return (
    <div className={`
      ${sizeClasses[size]} rounded-full 
      bg-white text-black
      flex items-center justify-center font-bold
      ${className}
    `}>
      {initials}
    </div>
  );
};

const uiComponents = {
  Card,
  Button,
  StatusBadge,
  ROIBadge,
  Input,
  Select,
  Textarea,
  LoadingSpinner,
  EmptyState,
  Divider,
  Avatar
};

export default uiComponents;
