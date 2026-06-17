/**
 * Textbee Gateway Integration Service
 * Textbee allows sending SMS from a connected Android device using its API gateway.
 */
const sendSMS = async (phoneNumber, message) => {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  if (!apiKey || !deviceId) {
    console.warn('Textbee API credentials not found. SMS logging to console:');
    console.log(`[MOCK SMS to ${phoneNumber}]: ${message}`);
    return { success: true, mock: true };
  }

  try {
    const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        recipients: [phoneNumber],
        message: message
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to dispatch SMS through Textbee');
    }

    console.log(`Textbee SMS dispatched successfully to ${phoneNumber}`);
    return { success: true, data };
  } catch (error) {
    console.error(`Textbee Service Error dispatching to ${phoneNumber}:`, error.message);
    // Fallback log for development stability
    console.log(`[SMS FALLBACK to ${phoneNumber}]: ${message}`);
    return { success: false, error: error.message };
  }
};

module.exports = { sendSMS };
