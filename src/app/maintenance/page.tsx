import { Wrench } from "lucide-react";

import { KandyStateSurface } from "@/components/creative-tim/kandydrops/states/KandyStateSurface";

export default function MaintenancePage() {
  return (
    <KandyStateSurface
      tone="violet"
      eyebrow="Scheduled maintenance"
      title="KandyDrops is upgrading!"
      description="KandyDrops is upgrading! We’ll be back soon. Your KandyDrops and GumDrops are safe!"
      icon={Wrench}
    >
      <p className="text-sm font-semibold text-white/52">
        Please check back shortly.
      </p>
    </KandyStateSurface>
  );
}
