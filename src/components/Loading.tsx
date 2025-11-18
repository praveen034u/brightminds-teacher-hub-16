import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner = ({ size = 'md', text, className }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
};

interface LoadingPageProps {
  text?: string;
}

export const LoadingPage = ({ text = 'Loading...' }: LoadingPageProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
};

interface LoadingCardProps {
  className?: string;
  height?: string;
}

export const LoadingCard = ({ className, height = 'h-32' }: LoadingCardProps) => {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${height} ${className}`}>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
        <div className="h-3 bg-gray-300 rounded w-5/6"></div>
      </div>
    </div>
  );
};

interface LoadingTableProps {
  rows?: number;
  columns?: number;
}

export const LoadingTable = ({ rows = 5, columns = 4 }: LoadingTableProps) => {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-100 rounded">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 rounded"></div>
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-4 gap-4 mb-2 p-4 border-b border-gray-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  );
};