import React from "react";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { styled } from "@mui/material/styles";

interface BasicSwitchesProps {
  handleHighlight: () => void; // Receive handleHighlight Func
}

const BlackLabel = styled(FormControlLabel)(({ theme }) => ({
  "& .MuiFormControlLabel-label": {
    color: "#000000", // Font color
  },
}));

const BasicSwitches: React.FC<BasicSwitchesProps> = ({ handleHighlight }) => {
  const [isChecked, setIsChecked] = React.useState(false);

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(event.target.checked);

    // Enable highlight
    if (event.target.checked) {
      handleHighlight();
    }
  };

  return (
    <FormGroup>
      {/* <BlackLabel
        control={<Switch checked={isChecked} onChange={handleSwitchChange} />}
        label="Proactive Highlight"
      /> */}
    </FormGroup>
  );
};

export default BasicSwitches;
