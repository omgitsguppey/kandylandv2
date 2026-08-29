import type { Metadata } from "next";

import { KandyFaqExperience } from "@/components/creative-tim/kandydrops/experiences/KandyFaqExperience";
import { FAQClient } from "./FAQClient";
import { FAQ_SECTIONS, HOW_IT_WORKS_STEPS } from "./faq-data";

export const metadata: Metadata = {
  title: "FAQ",
  description: "The mobile guide to KandyDrops, including Gum Drops, live drops, library access, and daily rewards.",
  alternates: {
    canonical: "/faq",
  },
};

export default function FAQPage() {
  return (
    <KandyFaqExperience>
        <FAQClient sections={FAQ_SECTIONS} steps={HOW_IT_WORKS_STEPS} />
    </KandyFaqExperience>
  );
}
