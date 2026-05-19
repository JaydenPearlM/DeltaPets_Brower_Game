// frontend/web/src/components/Devlog/DevLogLauncher.tsx

import React, { useState } from "react";
import { DevLogWindow } from "./DevLogWindow";

export const DevLogLauncher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="dev-log-button" onClick={() => setIsOpen(true)}>
        Development Log
      </button>
      <DevLogWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
