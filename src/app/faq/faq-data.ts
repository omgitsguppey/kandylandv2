export type FAQEntry = {
  readonly q: string;
  readonly a: string;
};

export type FAQSection = {
  readonly category: string;
  readonly questions: readonly FAQEntry[];
};

export type HowItWorksStep = {
  readonly id: "join" | "gumdrops" | "unwrap" | "library" | "experiences";
  readonly label: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly callouts: readonly string[];
  readonly metricValue: string;
  readonly metricLabel: string;
};

export const HOW_IT_WORKS_STEPS: readonly HowItWorksStep[] = [
  {
    id: "join",
    label: "Join",
    eyebrow: "Step 1",
    title: "Create your free profile on mobile",
    description:
      "Start with a free KandyDrops account so your stash, rewards, and unwrapped library stay synced across every visit.",
    callouts: ["18+ only", "Mobile first", "Free to start"],
    metricValue: "Free",
    metricLabel: "to join",
  },
  {
    id: "gumdrops",
    label: "Get Gum Drops",
    eyebrow: "Step 2",
    title: "Get Gum Drops before the drop disappears",
    description:
      "Use your wallet to load up on Gum Drops, then return to Experiences to keep your streak moving and collect extra rewards.",
    callouts: ["Wallet bundles", "Daily rewards", "Fast checkout"],
    metricValue: "10 GD",
    metricLabel: "Day 1 start",
  },
  {
    id: "unwrap",
    label: "Unwrap",
    eyebrow: "Step 3",
    title: "Unwrap live KandyDrops while they are active",
    description:
      "Browse the active drop, check the timer, file count, and creator tags, then unwrap it before the live window closes.",
    callouts: ["Live timers", "+Files", "Creator tags"],
    metricValue: "Live",
    metricLabel: "while active",
  },
  {
    id: "library",
    label: "Keep Access",
    eyebrow: "Step 4",
    title: "Keep your unwrapped Kandy in your library",
    description:
      "If you unwrap while a KandyDrop is live, it stays in your dashboard library even after it expires from the public Drops page.",
    callouts: ["Library access", "Mobile viewing", "Repeat anytime"],
    metricValue: "Keeps",
    metricLabel: "after expiry",
  },
  {
    id: "experiences",
    label: "Return Daily",
    eyebrow: "Step 5",
    title: "Return daily in Experiences",
    description:
      "Use the Experiences tab to build your streak, earn extra Gum Drops, and stay ready for the next live KandyDrop.",
    callouts: ["Daily streaks", "Extra Gum Drops", "Mobile reminders"],
    metricValue: "7 Day",
    metricLabel: "reward ladder",
  },
];

export const FAQ_SECTIONS: readonly FAQSection[] = [
  {
    category: "Start Here",
    questions: [
      {
        q: "What is KandyDrops?",
        a: "KandyDrops is a mobile-friendly platform for limited-time creator drops, daily reward Experiences, and a personal library of the KandyDrops you already unwrapped.",
      },
      {
        q: "Do I need an account before I can start?",
        a: "You can browse as a guest, but you need a free account to collect Gum Drops, unwrap live KandyDrops, save your library, and build your Experiences streak.",
      },
      {
        q: "Do I have to be 18+ to use KandyDrops?",
        a: "Yes. You must be 18 or older to create an account or use KandyDrops.",
      },
    ],
  },
  {
    category: "Gum Drops & Live KandyDrops",
    questions: [
      {
        q: "How do I get Gum Drops to unwrap KandyDrops?",
        a: "You can load up on Gum Drops from the Wallet and then use them to unwrap live KandyDrops. Experiences can also help you earn extra Gum Drops over time.",
      },
      {
        q: "Do my Gum Drops expire?",
        a: "No. Gum Drops stay in your account until you use them, as long as your account remains active.",
      },
      {
        q: "When does a KandyDrop appear on the Drops page?",
        a: "A KandyDrop only appears publicly once it goes live. Scheduled drops stay hidden until their live window begins.",
      },
      {
        q: "How do I unwrap a KandyDrop?",
        a: "Open a live KandyDrop, check the file count and timer, then spend Gum Drops to unwrap it while it is still active.",
      },
      {
        q: "What happens when a KandyDrop expires?",
        a: "Expired KandyDrops disappear from the public Drops page if you never unwrapped them. Some may return in future queue rotations, but that is never guaranteed.",
      },
      {
        q: "What do tags like Sweet, Spicy, and RAW mean?",
        a: "Those tags help set expectations before you unwrap. They tell you the flavor or intensity of the KandyDrop without revealing the files themselves.",
      },
    ],
  },
  {
    category: "Library & Mobile Viewing",
    questions: [
      {
        q: "If I unwrap before a KandyDrop expires, do I keep access in my library?",
        a: "Yes. If you unwrap a KandyDrop while it is live, it stays available in your dashboard library even after it expires from the public Drops page.",
      },
      {
        q: "Where do I find the KandyDrops I already unwrapped?",
        a: "Your unwrapped KandyDrops stay in your dashboard library, where you can reopen them whenever you want.",
      },
      {
        q: "Can I watch my unwrapped KandyDrops on my phone?",
        a: "Yes. KandyDrops is built to work smoothly on phones, tablets, and desktop so your library stays accessible wherever you watch.",
      },
      {
        q: "Can I download or share what I unwrap?",
        a: "No. Unwrapped KandyDrops stay tied to your account and are meant to be viewed inside the platform.",
      },
    ],
  },
  {
    category: "Experiences & Support",
    questions: [
      {
        q: "What can I do in the Experiences tab each day?",
        a: "Experiences is where you return daily to keep your streak moving, collect reward momentum, and stay ready for the next live KandyDrop.",
      },
      {
        q: "How do daily rewards work?",
        a: "Check in every day to keep your streak active and unlock the next Gum Drops reward in the ladder.",
      },
      {
        q: "How do I reset my password?",
        a: "Open the auth sheet, tap the forgot-password flow, and we will email you a secure reset link.",
      },
      {
        q: "How do refunds, support, or account help work?",
        a: "If you need help with purchases, account access, or something feels off, contact support@kandydrops.com and we will review it with you.",
      },
    ],
  },
];
