import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Initialize Twilio client with your credentials
const accountSid = process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID;
const authToken = process.env.NEXT_PUBLIC_TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER;

export async function POST(request: Request) {
    try {
        // Check if Twilio credentials are configured
        if (!accountSid || !authToken || !twilioPhoneNumber) {
            console.error('Twilio credentials not configured');
            return NextResponse.json(
                { error: 'Twilio credentials not configured' },
                { status: 500 }
            );
        }

        // Parse request body
        const { to, message } = await request.json();

        // Validate phone number and message
        if (!to || !message) {
            return NextResponse.json(
                { error: 'Phone number and message are required' },
                { status: 400 }
            );
        }

        // Format phone number to E.164 format if needed
        let formattedNumber = to;
        if (!to.startsWith('+')) {
            // Assuming Bosnia and Herzegovina country code (+387)
            formattedNumber = to.startsWith('0')
                ? '+387' + to.substring(1).replace(/\s+/g, '')
                : '+387' + to.replace(/\s+/g, '');
        }

        // Initialize Twilio client
        const client = twilio(accountSid, authToken);

        // Send SMS
        const result = await client.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: formattedNumber
        });

        console.log('SMS sent successfully:', result.sid);

        return NextResponse.json({ success: true, messageId: result.sid });
    } catch (error) {
        console.error('Error sending SMS:', error);
        return NextResponse.json(
            { error: 'Failed to send SMS', details: error },
            { status: 500 }
        );
    }
}