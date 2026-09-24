import { ResonanceEvolutionProvider } from "@/features/resonanceEvolution/ResonanceEvolutionProvider";
import { AuthProvider } from "./AuthProvider";
import { GameProvider } from "./GameProvider";
import { UIProvider } from "./UIProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GameProvider>
        <ResonanceEvolutionProvider>
          <UIProvider>{children}</UIProvider>
        </ResonanceEvolutionProvider>
      </GameProvider>
    </AuthProvider>
  );
}
