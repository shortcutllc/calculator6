# Headshot Gallery System - Implementation Plan

## 🎯 **Refined Technical Strategy**

### **Simplified Architecture: Supabase + SendGrid**
- **Database**: Supabase (existing)
- **File Storage**: Supabase Storage (existing)
- **Email**: SendGrid (existing)
- **Image Format**: JPEG (standard for corporate headshots)
- **Retouching Timeline**: 3-5 business days

## 📊 **Updated Database Schema**

```sql
-- Headshot Events
headshot_events (
  id, event_name, event_date, total_employees, status, created_at
)

-- Employee Galleries  
employee_galleries (
  id, event_id, employee_name, email, phone, 
  unique_token, status, created_at, updated_at
)

-- Gallery Photos
gallery_photos (
  id, gallery_id, photo_url, is_selected, is_final, uploaded_at
)

-- Notifications
notifications (
  id, gallery_id, type, sent_at, status
)
```

## 🔄 **Simplified Workflow**

### **Phase 1: Admin Setup**
1. **Event Creation**: Create headshot event
2. **CSV Upload**: Import employee list (name, email, phone)
3. **Photo Upload**: Upload 1-5 photos per employee
4. **Auto-Generation**: System creates unique tokens and folders
5. **Email Notification**: SendGrid sends gallery links

### **Phase 2: Employee Selection**
1. **Secure Access**: Employees click unique link
2. **Photo Review**: Clean gallery interface
3. **Selection**: One-click photo selection
4. **Confirmation**: SendGrid confirmation email

### **Phase 3: Final Delivery**
1. **Retouching Queue**: Selected photos go to internal workflow
2. **Final Upload**: Upload retouched photo (3-5 business days)
3. **Notification**: SendGrid sends download link
4. **Download**: High-res JPEG available

## 🎨 **UI/UX Design (Matching Existing Site)**

### **Admin Dashboard Integration**
- **New Tab**: "Headshot Galleries" in existing admin panel
- **Consistent Styling**: Match existing design system
- **Familiar Interface**: Use existing components and patterns

### **Employee Gallery Page**
- **Branded Header**: Match existing site branding
- **Responsive Grid**: Mobile-friendly photo display
- **Selection Interface**: Clean, obvious selection buttons
- **Status Updates**: Clear progress indicators

## ⚡ **Implementation Timeline (1-2 Weeks)**

### **Week 1: Core Development**
- **Days 1-2**: Database setup, admin interface
- **Days 3-4**: Photo upload system, CSV import
- **Days 5-7**: Employee gallery interface, selection logic

### **Week 2: Integration & Launch**
- **Days 8-10**: SendGrid integration, email templates
- **Days 11-12**: Mobile optimization, testing
- **Days 13-14**: Final testing, deployment

## 💰 **Cost Analysis (Using Existing Services)**

### **Additional Costs**
- **Supabase Storage**: ~$0.021/GB/month (for high-res JPEGs)
- **SendGrid**: Existing plan covers it
- **Total Additional**: ~$10-30/month depending on photo volume

### **Per Event Cost**
- **25 employees**: ~$0.40-1.20 per employee
- **100 employees**: ~$0.10-0.30 per employee

## 🔧 **Technical Implementation**

### **Key Components Needed**
1. **HeadshotEventManager**: Admin interface for event management
2. **CSVUploader**: Import employee data from CSV
3. **PhotoUploader**: Bulk photo upload with progress tracking
4. **EmployeeGallery**: Public gallery for photo selection
5. **SendGridService**: Email notification system

### **File Storage Strategy**
- **Format**: JPEG (standard for corporate headshots)
- **Resolution**: High-res (typically 3000x4000px or similar)
- **Storage**: Supabase Storage with organized folder structure
- **Access**: Secure, time-limited URLs for employee access

## 📧 **Email Templates (SendGrid)**

### **Gallery Ready Email**
```
Subject: Your Headshot Photos Are Ready for Review

Hi [Employee Name],

Your headshot photos from [Event Name] are ready for review!

Click here to view and select your preferred photo: [Gallery Link]

This link will expire in 30 days.

Best regards,
Shortcut Team
```

### **Selection Confirmed Email**
```
Subject: Photo Selection Confirmed

Hi [Employee Name],

Thank you for selecting your preferred headshot photo. 

Your photo is now being retouched and will be ready in 3-5 business days. You'll receive another email with your final retouched photo.

Best regards,
Shortcut Team
```

### **Final Photo Ready Email**
```
Subject: Your Retouched Headshot Is Ready!

Hi [Employee Name],

Your retouched headshot is ready for download!

Click here to download your final photo: [Download Link]

This link will expire in 30 days.

Best regards,
Shortcut Team
```

## 🚀 **MVP Features (Week 1-2)**

### **Must-Have**
- ✅ Event creation and CSV import
- ✅ Photo upload and organization
- ✅ Employee gallery with selection
- ✅ SendGrid email notifications
- ✅ Final photo delivery
- ✅ Mobile-responsive design

### **Future Enhancements**
- 📱 SMS notifications (if needed)
- 📊 Analytics and reporting
- 🎨 Photo editing tools
- Batch export features

## 📋 **Requirements Summary**

### **Volume & Performance**
- **Scale**: 1-3 events/month × 25-100 employees = 25-300 galleries/month
- **High Resolution**: JPEG format for corporate headshots
- **Timeline**: 1-2 weeks implementation

### **Process Flow**
1. Headshot event completes
2. Create folders for each employee with 1-5 photos
3. Notify employees when sample photos are available
4. Employees select 1 final photo for editing
5. Remove sample photos and provide 1 final retouched photo
6. Notify employees when final photo is ready

### **Technical Stack**
- **Frontend**: React (existing)
- **Backend**: Supabase (existing)
- **Storage**: Supabase Storage (existing)
- **Email**: SendGrid (existing)
- **Authentication**: Supabase Auth (existing)

### **CSV Format Expected**
- **Columns**: name, email, phone
- **Format**: Standard CSV with headers

### **Photo Naming Convention**
- **Format**: `{employee_name}_{photo_number}.jpg`
- **Example**: `john_doe_1.jpg`, `john_doe_2.jpg`

### **Gallery Expiry**
- **Timeline**: 30 days from creation
- **Security**: Unique tokens for access

### **Admin Access**
- **Location**: New tab in existing admin dashboard
- **Integration**: Seamless with current design system
