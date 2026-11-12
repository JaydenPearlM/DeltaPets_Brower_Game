import { useState } from "react";
import { getStarterPortrait } from "@/kith/registry/starterPortraits";
import { getKithnaPortrait } from "@/kith/registry/kithnaPortraits";

export function KithPortrait({
  speciesId,
  imageUrl,
  name,
}: {
  speciesId: string;
  imageUrl?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);

  const source = (
    imageUrl ||
    getStarterPortrait(speciesId) ||
    getKithnaPortrait(speciesId) ||
    getKithnaPortrait(name) ||
    getStarterPortrait(name)
  );

  return source && !failed ? (
    <img
      className="ww-portrait"
      src={source}
      alt={name}
      onError={() => setFailed(true)}
    />
  ) : (
    <span className="ww-art-pending">Portrait pending</span>
  );
}

