// Tracking helpers for user behavior and metrics.
// Development-safe logging only, no sensitive user data.

export const analyticsService = {
  trackProviderView(providerId: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] Provider viewed: ${providerId}`);
    }
  },

  trackWhatsAppClick(providerId: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] WhatsApp clicked for provider: ${providerId}`);
    }
  },

  trackPhoneClick(providerId: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] Phone clicked for provider: ${providerId}`);
    }
  },

  trackRequestCreated(category: string, district: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] Request created: ${category} in ${district}`);
    }
  },

  trackProviderApplicationSubmitted(category: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] Provider application submitted for: ${category}`);
    }
  },

  trackFilterUsed(filterType: string, value: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] Filter used - ${filterType}: ${value}`);
    }
  },

  trackVoiceCommandUsed(command: string, success: boolean) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] Voice command used - '${command}' (Success: ${success})`);
    }
  }
};
