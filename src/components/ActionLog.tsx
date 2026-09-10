type Props = {
  logs: string[];
};

function ActionLog({ logs }: Props) {

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto"
      }}
    >

      {logs.length === 0 ? (

        <p>
          Nenhuma ação registrada.
        </p>

      ) : (

        logs.map((log, index) => (

          <p
            key={index}
            style={{
              margin: "5px 0"
            }}
          >
            {log}
          </p>

        ))

      )}

    </div>
  );
}

export default ActionLog;