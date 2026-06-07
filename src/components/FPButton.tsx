import React from 'react';

interface FPButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
  className?: string;
}

const variantClass: Record<string, string> = {
  primary: 'fp-btn--primary',
  secondary: 'fp-btn--secondary',
  danger: 'fp-btn--danger',
};

export const FPButton: React.FC<FPButtonProps> = ({
  variant = 'secondary',
  children,
  onClick,
  disabled,
  type = 'button',
  style,
  className,
}) => {
  const cls = `fp-btn ${variantClass[variant]}${className ? ' ' + className : ''}`;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={cls}
    >
      {children}
    </button>
  );
};

export default FPButton;
