import { useNavigate } from "react-router-dom";
import ROUTES from "../../routes";

export default function PilotTriggerCard({ pilotData }) {
  const navigate = useNavigate();

  if (!pilotData) return null;

  const {
    title,
    description,
    duration,
    outcome
  } = pilotData;

  const handleStart = () => {
    navigate(ROUTES.PILOT_SETUP);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{title}</h2>

      <p style={styles.description}>{description}</p>

      <div style={styles.meta}>
        <div>⏱ {duration}</div>
        <div>🎯 {outcome}</div>
      </div>

      <button style={styles.button} onClick={handleStart}>
        Start workspace preview
      </button>
    </div>
  );
}

const styles = {
  container: {
    padding: "24px",
    borderRadius: "14px",
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    marginTop: "24px"
  },
  title: {
    fontSize: "20px",
    marginBottom: "10px"
  },
  description: {
    fontSize: "14px",
    marginBottom: "12px",
    color: "#444"
  },
  meta: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "16px"
  },
  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "black",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px"
  }
};
