import React from 'react';
import { Button, ButtonProps } from 'antd';

export interface PrimaryButtonProps extends ButtonProps {}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  className = '',
  type = 'primary',
  ...props
}) => {
  return (
    <Button
      type={type}
      className={`bg-[#173b85] hover:bg-[#1f4598] text-white font-bold text-xs rounded-lg h-8 px-4 border-none shadow-sm flex items-center gap-1 ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
};

export default PrimaryButton;
