import { createRoot } from "react-dom/client";
import ResonanceEvolutionPreview from "./ResonanceEvolutionPreview";

// Vite-only entry; avoids authentication and gameplay providers during visual review.
const root = document.getElementById("root");
if (import.meta.env.DEV && root) createRoot(root).render(<ResonanceEvolutionPreview />);
