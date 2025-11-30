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
  const colorConfig = {
    primary: {
      gradient: 'from-purple-50 via-indigo-50 to-blue-50',
      iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      iconColor: 'text-white',
      textColor: 'text-purple-700',
      hoverGlow: 'hover:shadow-purple-200',
    },
    secondary: {
      gradient: 'from-amber-50 via-orange-50 to-yellow-50',
      iconBg: 'bg-gradient-to-br from-orange-500 to-yellow-600',
      iconColor: 'text-white',
      textColor: 'text-orange-700',
      hoverGlow: 'hover:shadow-orange-200',
    },
    accent: {
      gradient: 'from-emerald-50 via-teal-50 to-cyan-50',
      iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600',
      iconColor: 'text-white',
      textColor: 'text-teal-700',
      hoverGlow: 'hover:shadow-teal-200',
    },
  };

  const config = colorConfig[color as keyof typeof colorConfig] || colorConfig.primary;

  const content = (
    <div className="p-6 flex flex-col items-center justify-center gap-4 min-h-[140px]">
      <div className={`p-4 rounded-2xl ${config.iconBg} shadow-lg transform transition-transform group-hover:scale-110 duration-300`}>
        <Icon className={`h-8 w-8 ${config.iconColor}`} strokeWidth={2} />
      </div>
      <h3 className={`text-sm font-semibold text-center ${config.textColor} leading-tight`}>
        {title}
      </h3>
    </div>
  );

  const className = `group cursor-pointer transition-all duration-300 hover:shadow-xl ${config.hoverGlow} hover:-translate-y-2 bg-gradient-to-br ${config.gradient} border border-gray-100 rounded-2xl overflow-hidden`;

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
