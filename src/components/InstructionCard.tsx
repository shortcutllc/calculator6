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
    <div className={`flex-shrink-0 w-80 md:w-96 bg-white rounded-2xl p-6 border-4 shadow-lg ${borderColorClass}`}>
      <div className="flex items-center mb-3">
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3 text-gray-500">
          {getIcon()}
        </div>
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
      </div>
      <p className="text-gray-600 text-sm min-h-[60px]">{description}</p>
    </div>
  );
};

export default InstructionCard;