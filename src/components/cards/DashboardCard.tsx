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
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-0 bg-gradient-to-br from-card to-background">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
        {action && (
          <Button
            variant={action.variant || 'default'}
            size="sm"
            onClick={action.onClick}
            className="shadow-sm"
          >
            {action.label}
          </Button>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};
