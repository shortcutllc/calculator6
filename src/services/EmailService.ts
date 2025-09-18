import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(import.meta.env.VITE_SENDGRID_API_KEY || '');

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  static async sendGalleryReadyEmail(
    employeeName: string,
    employeeEmail: string,
    galleryUrl: string,
    eventName: string
  ): Promise<void> {
    const template = this.getGalleryReadyTemplate(employeeName, galleryUrl, eventName);
    
    try {
      await sgMail.send({
        to: employeeEmail,
        from: {
          email: import.meta.env.VITE_FROM_EMAIL || 'noreply@yourcompany.com',
          name: 'Headshot Gallery'
        },
        subject: template.subject,
        html: template.html,
        text: template.text
      });
    } catch (error) {
      console.error('Error sending gallery ready email:', error);
      throw error;
    }
  }

  static async sendFinalPhotoReadyEmail(
    employeeName: string,
    employeeEmail: string,
    galleryUrl: string,
    eventName: string
  ): Promise<void> {
    const template = this.getFinalPhotoReadyTemplate(employeeName, galleryUrl, eventName);
    
    try {
      await sgMail.send({
        to: employeeEmail,
        from: {
          email: import.meta.env.VITE_FROM_EMAIL || 'noreply@yourcompany.com',
          name: 'Headshot Gallery'
        },
        subject: template.subject,
        html: template.html,
        text: template.text
      });
    } catch (error) {
      console.error('Error sending final photo ready email:', error);
      throw error;
    }
  }

  private static getGalleryReadyTemplate(
    employeeName: string,
    galleryUrl: string,
    eventName: string
  ): EmailTemplate {
    const subject = `Your headshot photos are ready for selection - ${eventName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Headshot Photos Are Ready</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .button:hover { background: #45a049; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📸 Your Headshot Photos Are Ready!</h1>
            <p>Event: ${eventName}</p>
          </div>
          <div class="content">
            <h2>Hello ${employeeName}!</h2>
            <p>Great news! Your headshot photos from the <strong>${eventName}</strong> event are now ready for you to review and select your favorite.</p>
            
            <p>Please follow these steps:</p>
            <ol>
              <li>Click the button below to view your photos</li>
              <li>Review all the photos we captured</li>
              <li>Select the one you'd like us to retouch</li>
              <li>Confirm your selection</li>
            </ol>
            
            <p>Once you make your selection, we'll begin retouching your chosen photo and notify you when it's ready for download.</p>
            
            <div style="text-align: center;">
              <a href="${galleryUrl}" class="button">View Your Photos</a>
            </div>
            
            <p><strong>Important:</strong> Please make your selection within 7 days to ensure we can process your retouched photo in a timely manner.</p>
          </div>
          <div class="footer">
            <p>If you have any questions, please contact us.</p>
            <p>This link is unique to you - please do not share it with others.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Your Headshot Photos Are Ready!
      
      Hello ${employeeName}!
      
      Great news! Your headshot photos from the ${eventName} event are now ready for you to review and select your favorite.
      
      Please follow these steps:
      1. Visit your gallery: ${galleryUrl}
      2. Review all the photos we captured
      3. Select the one you'd like us to retouch
      4. Confirm your selection
      
      Once you make your selection, we'll begin retouching your chosen photo and notify you when it's ready for download.
      
      Important: Please make your selection within 7 days to ensure we can process your retouched photo in a timely manner.
      
      If you have any questions, please contact us.
      This link is unique to you - please do not share it with others.
    `;

    return { to: '', subject, html, text };
  }

  private static getFinalPhotoReadyTemplate(
    employeeName: string,
    galleryUrl: string,
    eventName: string
  ): EmailTemplate {
    const subject = `Your retouched headshot is ready for download - ${eventName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Retouched Headshot Is Ready</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .button:hover { background: #1976D2; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .highlight { background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Your Retouched Headshot Is Ready!</h1>
            <p>Event: ${eventName}</p>
          </div>
          <div class="content">
            <h2>Hello ${employeeName}!</h2>
            <p>Excellent news! Your retouched headshot from the <strong>${eventName}</strong> event is now ready for download.</p>
            
            <div class="highlight">
              <p><strong>✨ Your professional headshot has been retouched and is ready for use!</strong></p>
            </div>
            
            <p>Please follow these steps to download your photo:</p>
            <ol>
              <li>Click the button below to access your gallery</li>
              <li>Look for your final retouched photo (it will be clearly marked)</li>
              <li>Click the download button to save it to your device</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${galleryUrl}" class="button">Download Your Photo</a>
            </div>
            
            <p><strong>Photo Details:</strong></p>
            <ul>
              <li>High-resolution JPEG format</li>
              <li>Professional retouching completed</li>
              <li>Ready for professional use</li>
            </ul>
            
            <p>Thank you for participating in our headshot event! We hope you love your new professional photo.</p>
          </div>
          <div class="footer">
            <p>If you have any questions or need assistance, please contact us.</p>
            <p>This link is unique to you - please do not share it with others.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Your Retouched Headshot Is Ready!
      
      Hello ${employeeName}!
      
      Excellent news! Your retouched headshot from the ${eventName} event is now ready for download.
      
      ✨ Your professional headshot has been retouched and is ready for use!
      
      Please follow these steps to download your photo:
      1. Visit your gallery: ${galleryUrl}
      2. Look for your final retouched photo (it will be clearly marked)
      3. Click the download button to save it to your device
      
      Photo Details:
      - High-resolution JPEG format
      - Professional retouching completed
      - Ready for professional use
      
      Thank you for participating in our headshot event! We hope you love your new professional photo.
      
      If you have any questions or need assistance, please contact us.
      This link is unique to you - please do not share it with others.
    `;

    return { to: '', subject, html, text };
  }

  // Test email functionality
  static async sendTestEmail(to: string): Promise<void> {
    try {
      await sgMail.send({
        to,
        from: {
          email: import.meta.env.VITE_FROM_EMAIL || 'noreply@yourcompany.com',
          name: 'Headshot Gallery'
        },
        subject: 'Test Email - Headshot Gallery System',
        html: '<p>This is a test email from the Headshot Gallery system.</p>',
        text: 'This is a test email from the Headshot Gallery system.'
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      throw error;
    }
  }
}
