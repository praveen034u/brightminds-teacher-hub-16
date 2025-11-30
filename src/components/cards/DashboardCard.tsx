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
}

export const DashboardCard = ({ title, children, action }: DashboardCardProps) => {
  return (
    <Card className="shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 bg-white rounded-2xl overflow-hidden group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6 px-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
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
