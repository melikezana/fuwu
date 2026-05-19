// Development-safe logging foundation for notification events.
// No sensitive keys or external paid APIs used here.

export const notificationService = {
  notifyProviderApplication(providerName: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Notification] New provider application submitted: ${providerName}`);
    }
    // Future integration: Supabase edge functions / SendGrid / Twilio
  },

  notifyProviderApproved(providerId: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Notification] Provider approved: ${providerId}`);
    }
  },

  notifyServiceRequestCreated(requestId: string, category: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Notification] New service request created: [${category}] ${requestId}`);
    }
  },

  notifyRequestStatusChanged(requestId: string, status: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Notification] Request ${requestId} status changed to: ${status}`);
    }
  }
};
