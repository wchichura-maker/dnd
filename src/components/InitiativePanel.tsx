import type { Combatant } from "../game/entities/Combatant";

type Props = {
  combatants: Combatant[];
  currentTurnIndex: number;
};

function InitiativePanel({
  combatants,
  currentTurnIndex
}: Props) {

  return (
    <div>

      <h3>
        ORDEM DE COMBATE
      </h3>

      {combatants.map(
        (combatant, index) => {

          const active =
            index === currentTurnIndex;

          return (
            <div
              key={combatant.id}
              style={{
                padding: "6px 0",

                fontWeight:
                  active
                    ? "bold"
                    : "normal"
              }}
            >

              {combatant.name}

              {" — "}

              {combatant.initiative}

              {active && "  ← TURNO"}

            </div>
          );

        }
      )}

    </div>
  );
}

export default InitiativePanel;