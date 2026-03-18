import type { Metadata } from "next";

import ExperiencesClient from "./ExperiencesClient";

export const metadata: Metadata = {
    title: "Experiences",
    description: "Check in, complete daily missions, and stay ready for the next live KandyDrops unwrap.",
    alternates: {
        canonical: "/experiences",
    },
};

export default function ExperiencesPage() {
    return <ExperiencesClient />;
}
