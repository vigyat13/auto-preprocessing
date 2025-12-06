import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, description, action }) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {(title || description || action) && (
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start">
            <div>
                {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
                {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;