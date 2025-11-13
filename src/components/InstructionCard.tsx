import React from 'react';
import { Eye, Edit, Save } from 'lucide-react';

interface InstructionCardProps {
  title: string;
  description: string;
  icon: 'review' | 'edit' | 'confirm';
  borderColorClass: string;
}

const InstructionCard: React.FC<InstructionCardProps> = ({
  title,
  description,
  icon,
  borderColorClass
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'review':
        return <Eye size={18} />;
      case 'edit':
        return <Edit size={18} />;
      case 'confirm':
        return <Save size={18} />;
    }
  };

  return (
    <div className={`card-medium border-2 ${borderColorClass}`}>
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-shortcut-teal bg-opacity-20 rounded-full flex items-center justify-center mr-3 text-shortcut-navy-blue">
          {getIcon()}
        </div>
        <h3 className="text-lg font-extrabold text-shortcut-blue">{title}</h3>
      </div>
      <p className="text-base text-text-dark leading-relaxed font-medium">{description}</p>
    </div>
  );
};

export default InstructionCard;