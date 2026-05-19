export const whatsappHelper = {
  /**
   * Generates a dynamic WhatsApp URL for a given provider, service category, and district.
   * Format: "Merhaba, Fuwu üzerinden ulaşıyorum. [District] için [Service] hizmeti almak istiyorum."
   */
  generateLeadUrl(phone: string, category?: string, district?: string): string {
    // Basic phone sanitization (remove non-digits)
    const sanitizedPhone = phone.replace(/\D/g, "");
    
    let message = "Merhaba, Fuwu üzerinden ulaşıyorum.";
    if (category && district) {
      message += ` ${district} için ${category} hizmeti almak istiyorum.`;
    } else if (category) {
      message += ` ${category} hizmeti almak istiyorum.`;
    }

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${sanitizedPhone}?text=${encodedMessage}`;
  }
};
