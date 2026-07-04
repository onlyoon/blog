import "../styles/global.css";
import React from 'react';

interface MaxWidthWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const MaxWidthWrapper: React.FC<MaxWidthWrapperProps> = ({ children, className }) => {
  return (
    <div className={`h-full mx-auto w-full max-w-7xl px-2.5 md:px-20 ${className || ''}`}>
      {children}
    </div>
  );
};

export default MaxWidthWrapper;