import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickActionCardProps {
  title: string;
  icon: LucideIcon;
  to?: string;
  onClick?: () => void;
  color?: string;
}

export const QuickActionCard = ({ title, icon: Icon, to, onClick, color = 'primary' }: QuickActionCardProps) => {
  const colorClasses = {
    primary: 'from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 text-primary',
    secondary: 'from-secondary/20 to-secondary/10 hover:from-secondary/30 hover:to-secondary/20 text-secondary',
    accent: 'from-accent/20 to-accent/10 hover:from-accent/30 hover:to-accent/20 text-accent',
  };

  const content = (
    <div className="p-6 flex flex-col items-center justify-center gap-3">
      <div className="p-4 rounded-full bg-card/80 shadow-sm">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-sm font-semibold text-center">{title}</h3>
    </div>
  );

  const className = `cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.primary} border-0`;

  if (to) {
    return (
      <Link to={to}>
        <Card className={className}>
          {content}
        </Card>
      </Link>
    );
  }

  return (
    <Card onClick={onClick} className={className}>
      {content}
    </Card>
  );
};
