import React, { useState } from "react";
import { ApplianceList } from "../components/appliances/ApplianceList";
import { AiVisionScannerModal } from "../components/vision/AiVisionScannerModal";

export const AppliancesPage: React.FC = () => {
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);

  return (
    <>
      <ApplianceList onOpenAiScanner={() => setIsAiScannerOpen(true)} />
      <AiVisionScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
      />
    </>
  );
};
