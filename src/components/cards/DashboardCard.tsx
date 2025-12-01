import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  children: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  variant?: 'default' | 'purple' | 'blue' | 'green' | 'orange' | 'teal' | 'indigo';
}

export const DashboardCard = ({ title, children, action, variant = 'default' }: DashboardCardProps) => {
  // Define color schemes for different variants
  const colorSchemes = {
    default: {
      header: 'bg-gradient-to-r from-gray-50 via-gray-50 to-white',
      border: 'border-gray-100',
      title: 'bg-gradient-to-r from-gray-800 to-gray-600',
    },
    purple: {
      header: 'bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50',
      border: 'border-purple-100',
      title: 'bg-gradient-to-r from-purple-700 to-indigo-600',
    },
    blue: {
      header: 'bg-gradient-to-r from-blue-50 via-cyan-50 to-sky-50',
      border: 'border-blue-100',
      title: 'bg-gradient-to-r from-blue-700 to-cyan-600',
    },
    green: {
      header: 'bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50',
      border: 'border-emerald-100',
      title: 'bg-gradient-to-r from-emerald-700 to-teal-600',
    },
    orange: {
      header: 'bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50',
      border: 'border-orange-100',
      title: 'bg-gradient-to-r from-orange-700 to-amber-600',
    },
    teal: {
      header: 'bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50',
      border: 'border-teal-100',
      title: 'bg-gradient-to-r from-teal-700 to-cyan-600',
    },
    indigo: {
      header: 'bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50',
      border: 'border-indigo-100',
      title: 'bg-gradient-to-r from-indigo-700 to-purple-600',
    },
  };

  const scheme = colorSchemes[variant];

  return (
    <Card className="shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 bg-white rounded-2xl overflow-hidden group">
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-4 pt-6 px-6 ${scheme.header} border-b ${scheme.border}`}>
        <CardTitle className={`text-xl font-bold ${scheme.title} bg-clip-text text-transparent`}>
          {title}
        </CardTitle>
        {action && (
          <Button
            variant={action.variant || 'default'}
            size="sm"
            onClick={action.onClick}
            className="shadow-md hover:shadow-lg transition-all duration-300 rounded-xl"
          >
            {action.label}
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-6 pb-6 px-6">{children}</CardContent>
    </Card>
  );
};
