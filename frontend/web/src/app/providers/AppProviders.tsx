import { AuthProvider } from "./AuthProvider";
import { GameProvider } from "./GameProvider";
import { UIProvider } from "./UIProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GameProvider>
        <UIProvider>{children}</UIProvider>
      </GameProvider>
    </AuthProvider>
  );
}
