import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api/baseClient";
import { getStarterPortrait } from "@/kith/registry/starterPortraits";
import { getKithnaPortrait } from "@/kith/registry/kithnaPortraits";
import "./PetPlayTest.css";

type TestPet = {
  id: string;
  name?: string | null;
  nickname?: string | null;
  species?: string | null;
  portrait_url?: string | null;
  sprite_url?: string | null;
  image_url?: string | null;
};

type CareCurrentResponse = {
  pet?: TestPet | null;
};

type ToyPosition = {
  x: number;
  y: number;
};

function getPetImage(pet: TestPet) {
  return (
    getStarterPortrait(pet.species) ||
    getKithnaPortrait(pet.species) ||
    getKithnaPortrait(pet.name) ||
    pet.portrait_url ||
    pet.sprite_url ||
    pet.image_url ||
    getStarterPortrait(pet.name) ||
    null
  );
}

export default function PetPlayTest() {
  const navigate = useNavigate();

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const petRef = useRef<HTMLImageElement | null>(null);

  const [pet, setPet] = useState<TestPet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dragging, setDragging] = useState(false);
  const [toyPosition, setToyPosition] = useState<ToyPosition>({
    x: 70,
    y: 70,
  });

  useEffect(() => {
    let cancelled = false;

    void apiFetch<CareCurrentResponse>("/api/care/current")
      .then((response) => {
        if (cancelled) return;

        setPet(response.pet ?? null);
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the active Kith.",
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!import.meta.env.DEV) {
    return <Navigate to="/pet" replace />;
  }

  const petImage = pet ? getPetImage(pet) : null;
  const petName = pet?.nickname?.trim() || pet?.name?.trim() || "Kith";

  function animateTowardToy(x: number, y: number) {
    const arena = arenaRef.current;
    const petElement = petRef.current;

    if (!arena || !petElement) return;

    const arenaRect = arena.getBoundingClientRect();

    const centerX = arenaRect.width / 2;
    const centerY = arenaRect.height * 0.68;

    const deltaX = x - centerX;
    const deltaY = y - centerY;

    const moveX = Math.max(-24, Math.min(24, deltaX * 0.08));
    const moveY = Math.max(-10, Math.min(8, deltaY * 0.035));
    const rotate = Math.max(-6, Math.min(6, deltaX * 0.02));

    petElement.animate(
      [
        {
          transform: "translate(0, 0) rotate(0deg) scale(1)",
        },
        {
          transform: `translate(${moveX}px, ${moveY}px) rotate(${rotate}deg) scale(1.025)`,
        },
      ],
      {
        duration: 180,
        easing: "ease-out",
        fill: "forwards",
      },
    );
  }

  function updateToyPosition(event: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;

    const arena = arenaRef.current;
    if (!arena) return;

    const bounds = arena.getBoundingClientRect();

    const x = Math.max(
      20,
      Math.min(bounds.width - 20, event.clientX - bounds.left),
    );
    const y = Math.max(
      20,
      Math.min(bounds.height - 20, event.clientY - bounds.top),
    );

    setToyPosition({ x, y });
    animateTowardToy(x, y);
  }

  function stopDragging() {
    setDragging(false);

    petRef.current?.animate(
      [
        {
          transform: petRef.current.style.transform || "translate(0, 0)",
        },
        {
          transform: "translate(0, 0) rotate(0deg) scale(1)",
        },
      ],
      {
        duration: 320,
        easing: "ease-out",
        fill: "forwards",
      },
    );
  }

  function testBall() {
    const petElement = petRef.current;
    if (!petElement) return;

    petElement.getAnimations().forEach((animation) => animation.cancel());

    petElement.animate(
      [
        {
          transform: "translate(0, 0) rotate(0deg) scale(1)",
        },
        {
          offset: 0.2,
          transform: "translate(-8px, 0) rotate(-3deg) scale(0.98)",
        },
        {
          offset: 0.42,
          transform: "translate(24px, -22px) rotate(5deg) scale(1.04)",
        },
        {
          offset: 0.62,
          transform: "translate(42px, -8px) rotate(2deg) scale(1.02)",
        },
        {
          offset: 0.8,
          transform: "translate(18px, 0) rotate(-2deg) scale(1)",
        },
        {
          transform: "translate(0, 0) rotate(0deg) scale(1)",
        },
      ],
      {
        duration: 1100,
        easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
    );
  }

  return (
    <main className="petPlayTest">
      <header className="petPlayTestHeader">
        <div>
          <div className="petPlayTestEyebrow">DEV PROTOTYPE</div>
          <h1>Pet Play Animation Test</h1>
          <p>
            Visual test only. This does not change care stats, inventory,
            cooldowns, or your real Pet room.
          </p>
        </div>

        <button
          type="button"
          className="petPlayTestBack"
          onClick={() => navigate("/pet")}
        >
          Back to Pets
        </button>
      </header>

      {loading ? <p>Loading active Kith...</p> : null}

      {error ? <p className="petPlayTestError">{error}</p> : null}

      {!loading && !error && !pet ? (
        <p>No active Kith is available for the test.</p>
      ) : null}

      {pet && petImage ? (
        <>
          <section
            ref={arenaRef}
            className="petPlayArena"
            onPointerMove={updateToyPosition}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onPointerLeave={stopDragging}
          >
            <div className="petPlayArenaLabel">
              Drag the string toy around {petName}
            </div>

            <div
              className="petPlayToy"
              style={{
                left: `${toyPosition.x}px`,
                top: `${toyPosition.y}px`,
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragging(true);
              }}
              aria-label="String toy"
              role="button"
              tabIndex={0}
            >
              <div className="petPlayToyHandle" />
              <div className="petPlayToyString" />
              <div className="petPlayToyFeather">✦</div>
            </div>

            <div className="petPlayPetStage">
              <img
                ref={petRef}
                className="petPlayPet"
                src={petImage}
                alt={petName}
                draggable={false}
              />
            </div>
          </section>

          <section className="petPlayControls">
            <button type="button" onClick={testBall}>
              Test Ball Reaction
            </button>

            <p>
              Nothing here is saved. Refreshing the page resets the prototype.
            </p>
          </section>
        </>
      ) : null}
    </main>
  );
}
