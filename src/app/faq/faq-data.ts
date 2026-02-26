export type FAQEntry = {
  q: string;
  a: string;
};

export type FAQSection = {
  category: string;
  questions: FAQEntry[];
};

export const FAQ_SECTIONS: readonly FAQSection[] = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What is KandyDrops?",
        a: "KandyDrops is an exclusive digital content platform where creators drop limited-edition photos, videos, and interactive experiences directly to their fans.",
      },
      {
        q: "How do I become a Creator?",
        a: "Creator accounts are currently invite-only or require a vetted application. If you have an established audience and want to start dropping content, please reach out to our team at creator@kandydrops.com.",
      },
      {
        q: "Do I have to be 18+ to use KandyDrops?",
        a: "Yes. Due to the nature of our exclusive digital content, all users and creators must be at least 18 years of age to register an account.",
      },
    ],
  },
  {
    category: "Gum Drops & Purchasing",
    questions: [
      {
        q: "What are Gum Drops?",
        a: "Gum Drops are our platform's virtual currency. You use them to unwrap exclusive drops from your favorite creators and unlock premium experiences.",
      },
      {
        q: "How do I get Gum Drops?",
        a: "You can securely purchase Gum Drop bundles directly from the Wallet tab in your dashboard. We use encrypted third-party payment gateways like PayPal to process transactions securely.",
      },
      {
        q: "Do my Gum Drops expire?",
        a: "No! Once purchased, Gum Drops remain in your wallet indefinitely as long as your account remains active.",
      },
      {
        q: "Is my payment information safe?",
        a: "Absolutely. We do not store your raw credit card data on our servers. All transactions are routed through industry-leading, secure third-party payment gateways.",
      },
      {
        q: "Can I get a refund on Gum Drops or Unwraps?",
        a: "All Gum Drop purchases and content unwraps are final. If you encounter a catastrophic bug during a transaction, please contact support for a review.",
      },
      {
        q: "I bought Drops but my balance hasn't updated. What do I do?",
        a: "Sometimes payment gateways take a moment to confirm the transaction. Refresh your dashboard page. If your balance still hasn't updated after a few minutes, reach out to support@kandydrops.com.",
      },
    ],
  },
  {
    category: "Unwrapping & Content",
    questions: [
      {
        q: "If I unwrap a Drop, do I own it forever?",
        a: "It depends entirely on the Drop! Some drops are permanently added to your library forever, while others have a limited viewing window (e.g., 24 hours). Always check the timer on the Drop Card before unwrapping.",
      },
      {
        q: "What do the tags like 'Sweet', 'Spicy', and 'RAW' mean?",
        a: "These are content style indicators set by the creator. They give you a hint of what flavor or intensity to expect before you spend your drops to unwrap it!",
      },
      {
        q: "What is the 'Experiences' tab?",
        a: "Experiences are premium lifestyle events, physical rewards, or one-on-one interactive streams that go beyond standard digital photos and videos.",
      },
      {
        q: "Can I share my unlocked Drop with a friend?",
        a: "No. Drops are permanently tied to your personal account. Sharing your login credentials violates our Terms of Service and can result in an immediate hardware ban.",
      },
      {
        q: "Can I view my unlocked Drops on a phone or tablet?",
        a: "Yes! Our entire platform and media viewer are fully optimized for beautifully smooth playback on all mobile devices and desktops.",
      },
    ],
  },
  {
    category: "Security & Privacy",
    questions: [
      {
        q: "Can I download the videos or photos I unlock?",
        a: "No. To protect our creators' hard work, KandyDrops uses secure streaming infrastructure and strict anti-ripping technology. Downloading is entirely disabled.",
      },
      {
        q: "What happens if I try to screenshot or screen-record?",
        a: "Our proprietary system actively detects standard keyboard and software captures. Your screen will blur instantly and a security violation will be logged against your hardware to protect the creator's content.",
      },
      {
        q: "How is file safety enforced for creator content?",
        a: "Creator files are never exposed through direct public filesystem paths from our app servers. Access is mediated by authenticated platform controls, and security events are audited to prevent ripping attempts.",
      },
      {
        q: "How are Gum Drop balances protected from exploitation?",
        a: "Balance changes are validated and recorded server-side with atomic updates and auditable transaction logs to prevent race-condition abuse or client-side tampering.",
      },
      {
        q: "Why was my account banned?",
        a: "Accounts may be permanently banned for attempting to rip/steal content, initiating fraudulent payment chargebacks, or violating our Terms of Service.",
      },
    ],
  },
  {
    category: "Account Support",
    questions: [
      {
        q: "How do I reset my password?",
        a: "Click 'Log In' on the home page and follow the 'Forgot Password' link to have a secure, time-sensitive reset link emailed directly to you.",
      },
      {
        q: "How do I see my past purchases?",
        a: "You can view your complete transaction history (purchases and unwrap logs) straight from the 'Transaction History' section in your Wallet dashboard.",
      },
      {
        q: "How do I delete my account?",
        a: "You can request full data deletion by emailing our support team at support@kandydrops.com from the email address associated with your account.",
      },
    ],
  },
];
