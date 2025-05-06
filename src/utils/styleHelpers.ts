export const getServiceBorderClass = (serviceType: string): string => {
  const type = serviceType?.toLowerCase() || '';
  switch (type) {
    case 'massage':
      return 'border-l-[5px] border-l-shortcut-teal';
    case 'nails':
      return 'border-l-[5px] border-l-shortcut-pink';
    case 'hair':
      return 'border-l-[5px] border-l-shortcut-service-yellow';
    case 'facial':
      return 'border-l-[5px] border-l-shortcut-pink';
    case 'headshot':
    case 'headshots':
      return 'border-l-[5px] border-l-shortcut-coral';
    case 'mindfulness':
      return 'border-l-[5px] border-l-shortcut-blue';
    case 'nutrition':
      return 'border-l-[5px] border-l-shortcut-teal';
    default:
      return 'border-l-[5px] border-l-gray-300';
  }
};