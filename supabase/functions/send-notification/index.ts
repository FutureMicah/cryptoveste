import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  type: "payment_approved" | "kyc_status" | "interview_scheduled" | "interview_confirmed";
  data: Record<string, any>;
}

const EMAIL_TEMPLATES = {
  payment_approved: (data: any) => ({
    subject: "🎉 Payment Confirmed - Welcome to BlackPAL!",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 32px; font-weight: bold; color: #D4AF37; }
          .success-badge { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 12px 24px; border-radius: 50px; display: inline-block; margin: 20px 0; font-weight: 600; }
          .content { background: #111111; border-radius: 16px; padding: 32px; border: 1px solid #222; }
          .amount { font-size: 36px; font-weight: bold; color: #D4AF37; text-align: center; margin: 20px 0; }
          .detail { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #222; }
          .detail-label { color: #888; }
          .detail-value { color: #fff; font-weight: 500; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
          .cta { display: inline-block; background: linear-gradient(135deg, #D4AF37, #B8860B); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">BlackPAL</div>
            <div class="success-badge">✓ Payment Verified</div>
          </div>
          <div class="content">
            <h2 style="text-align: center; margin-bottom: 24px;">Your payment has been confirmed!</h2>
            <div class="amount">${data.cryptocurrency ? data.cryptocurrency : '$'}${data.amount}</div>
            ${data.transactionHash ? `
            <div class="detail">
              <span class="detail-label">Transaction ID</span>
              <span class="detail-value" style="font-family: monospace; font-size: 12px;">${data.transactionHash?.slice(0, 20)}...</span>
            </div>
            ` : ''}
            <div class="detail">
              <span class="detail-label">Status</span>
              <span class="detail-value" style="color: #10B981;">Completed</span>
            </div>
            <div style="text-align: center; margin-top: 32px;">
              <p>You now have full access to the BlackPAL platform. Start exploring your dashboard!</p>
              <a href="https://blackpal.app/dashboard" class="cta">Go to Dashboard →</a>
            </div>
          </div>
          <div class="footer">
            <p>© 2024 BlackPAL. All rights reserved.</p>
            <p style="color: #444;">This is an automated message. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  kyc_status: (data: any) => ({
    subject: data.status === "approved" 
      ? "✅ KYC Verification Approved - BlackPAL"
      : data.status === "rejected"
      ? "⚠️ KYC Verification Update - BlackPAL"
      : "📋 KYC Status Update - BlackPAL",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 32px; font-weight: bold; color: #D4AF37; }
          .status-badge { padding: 12px 24px; border-radius: 50px; display: inline-block; margin: 20px 0; font-weight: 600; }
          .status-approved { background: linear-gradient(135deg, #10B981, #059669); color: white; }
          .status-rejected { background: linear-gradient(135deg, #EF4444, #DC2626); color: white; }
          .status-pending { background: linear-gradient(135deg, #F59E0B, #D97706); color: white; }
          .content { background: #111111; border-radius: 16px; padding: 32px; border: 1px solid #222; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">BlackPAL</div>
            <div class="status-badge status-${data.status}">${data.status === 'approved' ? '✓ Approved' : data.status === 'rejected' ? '✗ Action Required' : '⏳ Pending'}</div>
          </div>
          <div class="content">
            <h2 style="text-align: center;">KYC Verification ${data.status === 'approved' ? 'Complete' : 'Update'}</h2>
            <p style="text-align: center; color: #aaa; margin: 20px 0;">
              ${data.status === 'approved' 
                ? 'Congratulations! Your identity verification has been approved. You now have full investor access.'
                : data.status === 'rejected'
                ? `Your document "${data.documentType}" requires attention. Reason: ${data.reason || 'Please resubmit with clearer documentation.'}`
                : 'Your documents are being reviewed by our compliance team.'}
            </p>
          </div>
          <div class="footer">
            <p>© 2024 BlackPAL. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  interview_scheduled: (data: any) => ({
    subject: "📅 Interview Scheduled - BlackPAL",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 32px; font-weight: bold; color: #D4AF37; }
          .content { background: #111111; border-radius: 16px; padding: 32px; border: 1px solid #222; }
          .date-box { background: #D4AF37; color: #000; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .date-box .day { font-size: 48px; font-weight: bold; }
          .date-box .month { font-size: 18px; text-transform: uppercase; }
          .detail { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #222; }
          .detail-label { color: #888; }
          .detail-value { color: #fff; font-weight: 500; }
          .cta { display: inline-block; background: linear-gradient(135deg, #3B82F6, #2563EB); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">BlackPAL</div>
          </div>
          <div class="content">
            <h2 style="text-align: center;">Your Compliance Interview is Scheduled</h2>
            <div class="date-box">
              <div class="day">${new Date(data.scheduledAt).getDate()}</div>
              <div class="month">${new Date(data.scheduledAt).toLocaleString('en', { month: 'long', year: 'numeric' })}</div>
              <div style="margin-top: 8px;">${new Date(data.scheduledAt).toLocaleString('en', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</div>
            </div>
            <div class="detail">
              <span class="detail-label">Duration</span>
              <span class="detail-value">${data.duration || 30} minutes</span>
            </div>
            ${data.meetingLink ? `
            <div style="text-align: center; margin-top: 24px;">
              <a href="${data.meetingLink}" class="cta">Join Meeting →</a>
            </div>
            ` : ''}
            <p style="color: #888; font-size: 14px; text-align: center; margin-top: 20px;">
              Please ensure you have a stable internet connection and a quiet environment for the interview.
            </p>
          </div>
          <div class="footer">
            <p>© 2024 BlackPAL. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  interview_confirmed: (data: any) => ({
    subject: "✅ Interview Completed - BlackPAL",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 32px; font-weight: bold; color: #D4AF37; }
          .success-badge { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 12px 24px; border-radius: 50px; display: inline-block; margin: 20px 0; font-weight: 600; }
          .content { background: #111111; border-radius: 16px; padding: 32px; border: 1px solid #222; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">BlackPAL</div>
            <div class="success-badge">✓ Interview Complete</div>
          </div>
          <div class="content">
            <h2 style="text-align: center;">Compliance Interview Completed</h2>
            <p style="text-align: center; color: #aaa; margin: 20px 0;">
              ${data.approved 
                ? 'Congratulations! Your interview has been approved. Your investor account is now fully activated.'
                : 'Thank you for completing your interview. Our team is reviewing the results and will contact you shortly.'}
            </p>
          </div>
          <div class="footer">
            <p>© 2024 BlackPAL. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { userId, type, data }: NotificationRequest = await req.json();

    // Get user email from auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData?.user?.email) {
      throw new Error("User email not found");
    }

    const template = EMAIL_TEMPLATES[type](data);

    const emailResponse = await resend.emails.send({
      from: "BlackPAL <notifications@blackpal.app>",
      to: [userData.user.email],
      subject: template.subject,
      html: template.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});