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

/**
 * Get a combined display name for multiple service types.
 * e.g., ['massage', 'nails'] → "Massage & Nails"
 * e.g., ['massage', 'nails', 'facial'] → "Massage, Nails & Facials"
 */
export const getMultiServiceDisplayName = (serviceTypes: ServiceType[]): string => {
  if (serviceTypes.length === 0) return 'Service';
  if (serviceTypes.length === 1) return getServiceDisplayName(serviceTypes[0]);

  const names = serviceTypes.map(t => getServiceDisplayName(t));
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
};

/**
 * Get the phone mockup image path for a service type.
 * Falls back to a generic phone image if no service-specific one exists.
 */
export const getPhoneImagePath = (serviceType: ServiceType): string => {
  const phoneMap: Record<ServiceType, string> = {
    'massage': '/QR Code Sign/Phone/massage.png',
    'hair-beauty': '/QR Code Sign/Phone/hair-beauty.png',
    'headshot': '/QR Code Sign/Phone/headshot.png',
    'nails': '/QR Code Sign/Phone/nails.png',
    'mindfulness': '/QR Code Sign/Phone/mindfulness.png',
    'facial': '/QR Code Sign/Phone/facial.png'
  };
  return phoneMap[serviceType] || phoneMap.massage;
};

/**
 * Map a proposal service type string to a QR code sign ServiceType.
 * Proposal services use different naming conventions than QR sign types.
 */
export const mapProposalServiceToQRType = (proposalType: string): ServiceType => {
  const map: Record<string, ServiceType> = {
    'massage': 'massage',
    'chair': 'massage',
    'chair-massage': 'massage',
    'table-massage': 'massage',
    'hair': 'hair-beauty',
    'blowout': 'hair-beauty',
    'grooming': 'hair-beauty',
    'headshots': 'headshot',
    'nails': 'nails',
    'nails-hand-massage': 'nails',
    'manicure': 'nails',
    'facials': 'facial',
    'facial': 'facial',
    'mindfulness': 'mindfulness',
    'mindfulness-cle': 'mindfulness',
  };
  return map[proposalType] || 'massage';
};
