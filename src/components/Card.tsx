import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Card = React.memo(function Card({ children, className = '', style }: CardProps) {
  return (
    <div
      className={`bg-secondary border border-theme/70 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
});

export default Card;
