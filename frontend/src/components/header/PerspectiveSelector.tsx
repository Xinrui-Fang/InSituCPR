import AvatarComponent from "./AvatarComponent";

import Button from "@mui/material/Button";

interface PerspectiveSelectorProps {
  avatars: [string, string][];
  setAvatars: React.Dispatch<React.SetStateAction<[string, string, string][]>>;
}

export default function PerspectiveSelector({
  avatars,
  setAvatars,
}: PerspectiveSelectorProps): JSX.Element {
  console.log(avatars);
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: "10px",
          left: "0.5%",
          position: "absolute",
        }}
      >
        <Button size="small" color="success" style={{ pointerEvents: "none" }}>
          Note Panel
        </Button>
      </div>
      <div
        style={{
          display: "flex",
          gap: "10px",
          left: "25%",
          position: "absolute",
        }}
      >
        {avatars.map(([name, discipline, color], index) => (
          <AvatarComponent
            key={index}
            index={index}
            name={name}
            discipline={discipline}
            color={color}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          gap: "10px",
          left: "80.5%",
          position: "absolute",
        }}
      >
        <Button size="small" color="success" style={{ pointerEvents: "none" }}>
          Q&A Panel
        </Button>
      </div>
    </>
  );
}
