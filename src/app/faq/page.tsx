import { Metadata } from 'next';
import { ChevronDown } from 'lucide-react';

export const metadata: Metadata = {
    title: 'FAQ | KandyDrops',
    description: 'Frequently Asked Questions about KandyDrops.',
};

const faqs = [
    {
        category: "Getting Started",
        questions: [
            {
                q: "What is KandyDrops?",
                a: "KandyDrops is an exclusive digital content platform where creators drop limited-edition photos, videos, and interactive experiences directly to their fans."
            },
            {
                q: "How do I become a Creator?",
                a: "Creator accounts are currently invite-only or require a vetted application. If you have an established audience and want to start dropping content, please reach out to our team at creator@kandydrops.com."
            },
            {
                q: "Do I have to be 18+ to use KandyDrops?",
                a: "Yes. Due to the nature of our exclusive digital content, all users and creators must be at least 18 years of age to register an account."
            }
        ]
    },
    {
        category: "Gum Drops & Purchasing",
        questions: [
            {
                q: "What are Gum Drops?",
                a: "Gum Drops are our platform's virtual currency. You use them to unwrap exclusive drops from your favorite creators and unlock premium experiences."
            },
            {
                q: "How do I get Gum Drops?",
                a: "You can securely purchase Gum Drop bundles directly from the Wallet tab in your dashboard. We use encrypted third-party payment gateways like PayPal to process transactions securely."
            },
            {
                q: "Do my Gum Drops expire?",
                a: "No! Once purchased, Gum Drops remain in your wallet indefinitely as long as your account remains active."
            },
            {
                q: "Is my payment information safe?",
                a: "Absolutely. We do not store your raw credit card data on our servers. All transactions are routed through industry-leading, secure third-party payment gateways."
            },
            {
                q: "Can I get a refund on Gum Drops or Unwraps?",
                a: "All Gum Drop purchases and content unwraps are final. If you encounter a catastrophic bug during a transaction, please contact support for a review."
            },
            {
                q: "I bought Drops but my balance hasn't updated. What do I do?",
                a: "Sometimes payment gateways take a moment to confirm the transaction. Refresh your dashboard page. If your balance still hasn't updated after a few minutes, reach out to support@kandydrops.com."
            }
        ]
    },
    {
        category: "Unwrapping & Content",
        questions: [
            {
                q: "If I unwrap a Drop, do I own it forever?",
                a: "It depends entirely on the Drop! Some drops are permanently added to your library forever, while others have a limited viewing window (e.g., 24 hours). Always check the timer on the Drop Card before unwrapping."
            },
            {
                q: "What do the tags like 'Sweet', 'Spicy', and 'RAW' mean?",
                a: "These are content style indicators set by the creator. They give you a hint of what flavor or intensity to expect before you spend your drops to unwrap it!"
            },
            {
                q: "What is the 'Experiences' tab?",
                a: "Experiences are premium lifestyle events, physical rewards, or one-on-one interactive streams that go beyond standard digital photos and videos."
            },
            {
                q: "Can I share my unlocked Drop with a friend?",
                a: "No. Drops are permanently tied to your personal account. Sharing your login credentials violates our Terms of Service and can result in an immediate hardware ban."
            },
            {
                q: "Can I view my unlocked Drops on a phone or tablet?",
                a: "Yes! Our entire platform and media viewer are fully optimized for beautifully smooth playback on all mobile devices and desktops."
            }
        ]
    },
    {
        category: "Security & Privacy",
        questions: [
            {
                q: "Can I download the videos or photos I unlock?",
                a: "No. To protect our creators' hard work, KandyDrops uses secure streaming infrastructure and strict anti-ripping technology. Downloading is entirely disabled."
            },
            {
                q: "What happens if I try to screenshot or screen-record?",
                a: "Our proprietary system actively detects standard keyboard and software captures. Your screen will blur instantly and a security violation will be logged against your hardware to protect the creator's content."
            },
            {
                q: "Why was my account banned?",
                a: "Accounts may be permanently banned for attempting to rip/steal content, initiating fraudulent payment chargebacks, or violating our Terms of Service."
            }
        ]
    },
    {
        category: "Account Support",
        questions: [
            {
                q: "How do I reset my password?",
                a: "Click 'Log In' on the home page and follow the 'Forgot Password' link to have a secure, time-sensitive reset link emailed directly to you."
            },
            {
                q: "How do I see my past purchases?",
                a: "You can view your complete transaction history (purchases and unwrap logs) straight from the 'Transaction History' section in your Wallet dashboard."
            },
            {
                q: "How do I delete my account?",
                a: "You can request full data deletion by emailing our support team at support@kandydrops.com from the email address associated with your account."
            },
            {
                q: "How do I contact support?",
                a: "You can email us anytime at support@kandydrops.com for technical help, billing inquiries, or bug reports."
            }
        ]
    }
];

export default function FAQPage() {
    return (
        <div className="min-h-screen bg-black pt-24 pb-20 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-brand-pink/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

            <div className="max-w-4xl mx-auto px-4 md:px-8 relative z-10">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 mb-4 tracking-tight">
                        Frequently Asked Questions
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Everything you need to know about unwrapping KandyDrops.
                    </p>
                </div>

                <div className="space-y-12">
                    {faqs.map((section, index) => (
                        <div key={index} className="space-y-4 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 100}ms` }}>
                            <h2 className="text-2xl font-bold text-brand-pink mb-6 flex items-center gap-2">
                                <span className="w-8 h-px bg-brand-pink/50"></span>
                                {section.category}
                            </h2>

                            <div className="grid gap-4">
                                {section.questions.map((faq, i) => (
                                    <details
                                        key={i}
                                        className="group glass-panel border border-white/5 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden"
                                    >
                                        <summary className="flex items-center justify-between p-5 md:p-6 cursor-pointer select-none">
                                            <h3 className="text-base md:text-lg font-bold text-white pr-4 leading-tight group-hover:text-brand-pink transition-colors">
                                                {faq.q}
                                            </h3>
                                            <div className="shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                                <ChevronDown className="w-5 h-5 text-gray-400 group-open:-rotate-180 transition-transform duration-300" />
                                            </div>
                                        </summary>
                                        <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0">
                                            <div className="w-full h-px bg-white/5 mb-4 hidden group-open:block" />
                                            <p className="text-sm md:text-base text-gray-400 leading-relaxed font-medium">
                                                {faq.a}
                                            </p>
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer CTA */}
                <div className="mt-20 text-center glass-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-pink/10 via-brand-purple/10 to-brand-cyan/10" />
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-white mb-2">Still have questions?</h3>
                        <p className="text-gray-400 mb-6 max-w-md mx-auto">
                            Can&apos;t find the answer you&apos;re looking for? Reach out to our customer support team for help.
                        </p>
                        <a
                            href="mailto:support@kandydrops.com"
                            className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                        >
                            Contact Support
                        </a>
                    </div>
                </div>
            </div>
        </div >
    );
}
