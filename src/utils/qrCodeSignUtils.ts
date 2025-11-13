import type { ServiceType } from '../types/qrCodeSign';

export const getServiceIconPath = (serviceType: ServiceType): string => {
  const iconMap: Record<ServiceType, string> = {
    'massage': '/QR Code Sign/Icons/Massage icon.png',
    'hair-beauty': '/QR Code Sign/Icons/Hair & Beauty Icon.png',
    'headshot': '/QR Code Sign/Icons/Headshot icon.png',
    'nails': '/QR Code Sign/Icons/nails icon.png',
    'mindfulness': '/QR Code Sign/Icons/Mindfulness icon.png',
    'facial': '/QR Code Sign/Icons/Facials icon.png'
  };
  return iconMap[serviceType] || iconMap.massage;
};

export const getServiceImagePath = (serviceType: ServiceType): string => {
  const imageMap: Record<ServiceType, string> = {
    'massage': '/QR Code Sign/Service Images/Massage.png',
    'hair-beauty': '/QR Code Sign/Service Images/Hair & Beauty.png',
    'headshot': '/QR Code Sign/Service Images/Headshots.png',
    'nails': '/QR Code Sign/Service Images/Nails.png',
    'mindfulness': '/QR Code Sign/Service Images/Mindfulness.png',
    'facial': '/QR Code Sign/Service Images/Facials.png'
  };
  return imageMap[serviceType] || imageMap.massage;
};

export const getServiceDisplayName = (serviceType: ServiceType): string => {
  const displayNames: Record<ServiceType, string> = {
    'massage': 'Massage',
    'hair-beauty': 'Hair + Beauty',
    'headshot': 'Headshots',
    'nails': 'Nails',
    'mindfulness': 'Mindfulness',
    'facial': 'Facials'
  };
  return displayNames[serviceType] || 'Service';
};


