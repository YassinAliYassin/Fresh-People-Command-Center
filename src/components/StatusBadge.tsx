import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const format = (s: string) => s.replace(/_/g, ' ');

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const cls = `fp-badge fp-badge--${status.toLowerCase()}`;
  return <span className={cls}>{format(status)}</span>;
};

export default StatusBadge;
