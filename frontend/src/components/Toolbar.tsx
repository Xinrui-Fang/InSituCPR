// Toolbar.js
import React from "react";
import Button from "@mui/material/Button";

function Toolbar({ buttons }) {
  return (
    <div
      style={{
        height: "40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px",
        backgroundColor: "#f5f5f5", // Light gray background
        borderBottom: "1px solid #ddd", // Bottom border
        marginBottom: "2px", // Spacing below
      }}
    >
      {buttons.map((button, index) => (
        <Button
          key={index}
          variant="outlined"
          size="medium"
          onClick={button.onClick}
          sx={{
            backgroundColor: "white", // 背景颜色
          }}
          style={{ marginRight: "5px" }}
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
}

export default Toolbar;
