// Headshot Gallery System Types

export interface HeadshotEvent {
  id: string;
  event_name: string;
  event_date: string;
  total_employees: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface EmployeeGallery {
  id: string;
  event_id: string;
  employee_name: string;
  email: string;
  phone?: string;
  unique_token: string;
  status: 'pending' | 'photos_uploaded' | 'selection_made' | 'retouching' | 'completed' | 'expired';
  selected_photo_id?: string;
  created_at: string;
  updated_at: string;
  photos?: GalleryPhoto[];
  event?: HeadshotEvent;
}

export interface GalleryPhoto {
  id: string;
  gallery_id: string;
  photo_url: string;
  photo_name?: string;
  is_selected: boolean;
  is_final: boolean;
  uploaded_at: string;
}

export interface HeadshotNotification {
  id: string;
  gallery_id: string;
  type: 'gallery_ready' | 'selection_confirmed' | 'final_ready';
  sent_at: string;
  status: 'sent' | 'delivered' | 'failed';
  email_address: string;
  message_content?: string;
}

export interface CSVEmployeeData {
  name: string;
  email: string;
  phone?: string;
}

export interface HeadshotEventStats {
  total_employees: number;
  photos_uploaded: number;
  selections_made: number;
  retouching_in_progress: number;
  completed: number;
}

export interface PhotoUploadProgress {
  employeeId: string;
  employeeName: string;
  totalPhotos: number;
  uploadedPhotos: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface GalleryAccessData {
  gallery: EmployeeGallery;
  photos: GalleryPhoto[];
  event: HeadshotEvent;
}
