import type { Turn } from "../game/types/Turn";

type TurnPanelProps = {
  turn: Turn;
  characterName: string;
  onEndTurn: () => void;
  onAttack: () => void;
  isPlayerTurn: boolean;
};

function TurnPanel({
  turn,
  characterName,
  onEndTurn,
  onAttack,
  isPlayerTurn
}: TurnPanelProps) {
  const {
    action,
    moveAction,
    freeActions,
    fiveFootStepAvailable,
    movement
  } = turn.resources;

  return (
    <div
      style={{
        marginTop: "20px",
        padding: "15px",
        border: "1px solid #333"
      }}
    >
      <h3>
        TURNO
      </h3>

      <p>
        Personagem: {characterName}
      </p>

      <p>
        Ação padrão:{" "}
        {action
          ? "Disponível"
          : "Usada"}
      </p>

      <p>
        Ação de movimento:{" "}
        {moveAction
          ? "Disponível"
          : "Usada"}
      </p>

      <p>
        Ações livres:{" "}
        {freeActions
          ? "Disponíveis"
          : "Usadas"}
      </p>

      <p>
        Movimento restante:{" "}
        {movement}
      </p>

      <p>
        Passo de ajuste:{" "}
        {fiveFootStepAvailable
          ? "Disponível"
          : "Usado"}
      </p>

      {isPlayerTurn && (
        <button
          onClick={onAttack}
          disabled={!action}
          style={{
            background: "transparent",
            color: "inherit",
            border: "1px solid currentColor",
            padding: "8px 14px",
            marginRight: "8px",
            cursor: action
              ? "pointer"
              : "not-allowed"
          }}
        >
          ATACAR
        </button>
      )}

      <button
        onClick={onEndTurn}
        disabled={!isPlayerTurn}
        style={{
          background: "transparent",
          color: "inherit",
          border: "1px solid currentColor",
          padding: "8px 14px",
          cursor: isPlayerTurn
            ? "pointer"
            : "not-allowed",
          opacity: isPlayerTurn
            ? 1
            : 0.5
        }}
      >
        FINALIZAR TURNO
      </button>
    </div>
  );
}

export default TurnPanel;