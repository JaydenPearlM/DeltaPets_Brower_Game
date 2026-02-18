import { fmt } from "../secretHaven.utils";

type Props = {
  pet: any;
  busy: string | null;
  cd: { feed: number; clean: number; bond: number };
  doAction: (action: "feed" | "clean" | "bond") => void;
};

export function PetCarePanel({ pet, busy, cd, doAction }: Props) {
  return (
    <div className="panelBlock">
      <div className="panelBlock__title">Pet Care</div>
      <div className="panelBlock__body">
        <div className="stats">
          <div className="stat">
            <div className="stat__k">Hunger</div>
            <div className="stat__v">{pet.hunger}</div>
          </div>
          <div className="stat">
            <div className="stat__k">Clean</div>
            <div className="stat__v">{pet.cleanliness}</div>
          </div>
          <div className="stat">
            <div className="stat__k">Happy</div>
            <div className="stat__v">{pet.happiness}</div>
          </div>
          <div className="stat">
            <div className="stat__k">Bond</div>
            <div className="stat__v">{pet.bond ?? 0}</div>
          </div>
        </div>

        <div className="actions">
          <button
            className="actionBtn"
            disabled={!!busy || pet.is_runaway || cd.feed > 0}
            onClick={() => doAction("feed")}
          >
            Feed {cd.feed > 0 ? `(${fmt(cd.feed)})` : ""}
          </button>

          <button
            className="actionBtn"
            disabled={!!busy || pet.is_runaway || cd.clean > 0}
            onClick={() => doAction("clean")}
          >
            Clean {cd.clean > 0 ? `(${fmt(cd.clean)})` : ""}
          </button>

          <button
            className="actionBtn"
            disabled={!!busy || pet.is_runaway || cd.bond > 0}
            onClick={() => doAction("bond")}
          >
            Sit / Bond {cd.bond > 0 ? `(${fmt(cd.bond)})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
