interface IEmailOptions {
  userName: string;
  title: string;
  body: string;
  otpCode?: string;
  buttonText?: string;
  buttonLink?: string;
}

export const getEmailTemplate = ({
  userName,
  title,
  body,
  otpCode,
  buttonText,
  buttonLink,
}: IEmailOptions): string => {

  const logoUrl = "https://res.cloudinary.com/da1uxchgo/image/upload/v1777790051/Gemini_Generated_Image_wss4dywss4dywss4-removebg-preview_1_lyuwch.png";

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 0; color: #ffffff; }
        .container { max-width: 600px; margin: 20px auto; background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px 20px; text-align: center; }
        
    
        .logo { width: 80px; height: auto; margin-bottom: 15px; }
        
        .header h1 { margin: 0; font-size: 24px; letter-spacing: 3px; color: #ffffff; text-transform: uppercase; font-weight: 800; }
        .content { padding: 40px 30px; text-align: center; line-height: 1.6; }
        .content h2 { color: #60a5fa; margin-bottom: 20px; font-size: 22px; }
        .content p { color: #cbd5e1; font-size: 16px; margin-bottom: 20px; }
        .otp-box { background-color: #334155; padding: 15px 25px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #60a5fa; margin: 20px 0; border: 1px solid #3b82f6; display: inline-block; }
        .btn { background-color: #3b82f6; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin: 20px 0; }
        .footer { background-color: #0f172a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
        .accent-text { color: #8b5cf6; font-weight: 600; }
        .quote { margin-top: 30px; font-style: italic; font-size: 14px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
          
            <img src="${logoUrl}" alt="Currently Logo" class="logo">
            <h1>CURRENTLY</h1>
            <p style="margin-top: 5px; opacity: 0.9; color: #ffffff; font-size: 14px;">One Ripple at a time.</p>
        </div>
        <div class="content">
            <h2>${title}</h2>
            <p>Hello <span class="accent-text">${userName}</span>,</p>
            <p>${body}</p>
            
            ${otpCode ? `<div class="otp-box">${otpCode}</div>` : ""}

            ${
              buttonText && buttonLink
                ? `<a href="${buttonLink}" class="btn">${buttonText}</a>`
                : ""
            }

            <div class="quote">
                "Don't feel the weight of the entire task — only the next small step."
            </div>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Currently App. All rights reserved.</p>
            <p>Designed for focused students everywhere.</p>
        </div>
    </div>
</body>
</html>
    `;
};