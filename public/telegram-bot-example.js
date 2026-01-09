/**
 * BlackPAL Telegram Stars Payment Bot
 * 
 * This is example code for your Telegram bot to handle Stars payments.
 * You need to run this on your own server with Node.js.
 * 
 * Setup instructions:
 * 1. Install dependencies: npm install node-telegram-bot-api
 * 2. Replace BOT_TOKEN with your actual bot token from @BotFather
 * 3. Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project's values
 * 4. Run with: node telegram-bot-example.js
 */

const TelegramBot = require('node-telegram-bot-api');

// Configuration - REPLACE THESE WITH YOUR ACTUAL VALUES
const BOT_TOKEN = 'YOUR_BOT_TOKEN_FROM_BOTFATHER';
const SUPABASE_URL = 'https://bxrzwxbmtbyzmxwlmodg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cnp3eGJtdGJ5em14d2xtb2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzMyNDksImV4cCI6MjA3NjkwOTI0OX0.0Ct-dWphYtwFjB-nHbg4vBYEGl46163sFrYuTJd3aCs';

// Group Links
const PRIVATE_GROUP_LINK = 'https://t.me/+J0p7oeR8r4k3Yjg0';
const FREE_CHANNEL_LINK = 'https://t.me/BLACKTRADEACADEMYfreechannel';
const SUPPORT_USERNAME = '@Futuremicah';

// Stars payment amount (in stars - 1 star ≈ $0.02, so 2500 stars ≈ $50)
const STARS_AMOUNT = 2500;

// Create bot instance
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 BlackPAL Bot is running...');

// Handle /start command
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const startParam = match[1]?.trim();
  
  // Check if this is a payment initiation from the web app
  if (startParam && startParam.startsWith('pay_')) {
    const paymentId = startParam.replace('pay_', '');
    
    // Store payment ID for this user
    await storeUserPaymentId(userId, paymentId);
    
    // Send payment button
    const welcomeMessage = `
🌟 *Welcome to BlackPAL Academy!*

You're about to complete your enrollment payment of *$50* using Telegram Stars.

Click the button below to proceed with payment:
    `;
    
    bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          {
            text: '⭐ Pay $50 with Telegram Stars',
            callback_data: `pay_stars_${paymentId}`
          }
        ]]
      }
    });
  } else {
    // Regular start command
    const welcomeMessage = `
👋 *Welcome to BlackPAL Academy Bot!*

I help you complete your enrollment payment and access our exclusive trading community.

*Commands:*
/pay - Start a new payment
/status - Check your payment status
/help - Get help and support

Need assistance? Contact ${SUPPORT_USERNAME}
    `;
    
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  }
});

// Handle /pay command
bot.onText(/\/pay/, async (msg) => {
  const chatId = msg.chat.id;
  
  const message = `
💳 *Payment Options*

To pay for your BlackPAL Academy enrollment:

1️⃣ Go to our website and start the signup process
2️⃣ Select "Telegram Stars" as your payment method
3️⃣ Click the button that brings you here
4️⃣ Complete the payment

Need to pay now? Contact ${SUPPORT_USERNAME} for assistance.
  `;
  
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Handle callback queries (button clicks)
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  
  if (data.startsWith('pay_stars_')) {
    const paymentId = data.replace('pay_stars_', '');
    
    try {
      // Send invoice for Stars payment
      await bot.sendInvoice(
        chatId,
        'BlackPAL Academy Enrollment',
        'Complete your enrollment to access exclusive trading signals, education, and our private community.',
        paymentId, // payload
        '', // provider_token (empty for Stars)
        'XTR', // currency (XTR for Telegram Stars)
        [{ label: 'Enrollment Fee', amount: STARS_AMOUNT }],
        {
          photo_url: 'https://bxrzwxbmtbyzmxwlmodg.supabase.co/storage/v1/object/public/assets/blackpal-logo.jpg',
          photo_width: 512,
          photo_height: 512,
          need_name: true,
          need_email: true
        }
      );
      
      bot.answerCallbackQuery(callbackQuery.id, { text: 'Invoice sent!' });
    } catch (error) {
      console.error('Invoice error:', error);
      bot.answerCallbackQuery(callbackQuery.id, { 
        text: 'Error creating invoice. Please try again.',
        show_alert: true 
      });
    }
  }
});

// Handle pre-checkout query (Stars payment validation)
bot.on('pre_checkout_query', async (query) => {
  // Always approve the checkout
  try {
    await bot.answerPreCheckoutQuery(query.id, true);
  } catch (error) {
    console.error('Pre-checkout error:', error);
    await bot.answerPreCheckoutQuery(query.id, false, 'Payment validation failed');
  }
});

// Handle successful payment
bot.on('message', async (msg) => {
  if (msg.successful_payment) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const payment = msg.successful_payment;
    const paymentId = payment.invoice_payload;
    
    console.log('✅ Payment received:', {
      userId,
      paymentId,
      amount: payment.total_amount,
      currency: payment.currency,
      chargeId: payment.telegram_payment_charge_id
    });
    
    try {
      // Call the edge function to confirm payment
      const response = await fetch(`${SUPABASE_URL}/functions/v1/telegram-payment-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          payment_id: paymentId,
          telegram_user_id: userId,
          stars_amount: payment.total_amount,
          telegram_payment_charge_id: payment.telegram_payment_charge_id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Send success message with group links
        const successMessage = `
🎉 *Payment Successful!*

Welcome to BlackPAL Academy, ${result.user_name}! 🎊

Your payment has been confirmed. Here are your exclusive access links:

📱 *Private Trading Group:*
${PRIVATE_GROUP_LINK}

📺 *Free Channel:*
${FREE_CHANNEL_LINK}

❓ *Need Help?*
Contact: ${SUPPORT_USERNAME}

👆 Click the links above to join our community!
        `;
        
        bot.sendMessage(chatId, successMessage, { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true 
        });
      } else {
        throw new Error(result.error || 'Payment confirmation failed');
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      
      // Still send a message to the user
      bot.sendMessage(chatId, `
✅ *Payment Received!*

Your payment is being processed. You'll receive your access links shortly.

If you don't receive them within 5 minutes, please contact ${SUPPORT_USERNAME}
      `, { parse_mode: 'Markdown' });
    }
  }
});

// Handle /status command
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, `
📊 *Check Your Payment Status*

To check your payment status, please visit our website or contact ${SUPPORT_USERNAME}
  `, { parse_mode: 'Markdown' });
});

// Handle /help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, `
❓ *Help & Support*

Having issues with:

💳 *Payments*
Contact ${SUPPORT_USERNAME} with your payment reference

🔐 *Account Access*
Make sure you've completed the signup on our website

📱 *Group Access*
After payment, you'll receive the private group link here

🐛 *Technical Issues*
Describe your issue to ${SUPPORT_USERNAME}

We're here to help! 🙌
  `, { parse_mode: 'Markdown' });
});

// Helper function to store user payment ID mapping
async function storeUserPaymentId(userId, paymentId) {
  // This could be stored in a database or simple file
  // For now, we'll pass it through the payment flow
  console.log(`Storing payment ${paymentId} for user ${userId}`);
}

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('✅ Bot is ready to accept payments!');
