import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AmbientBackground } from "@/components/ambient-background";
import { boot } from "./main.js";
import "./globals.css";
import "./style.css";

const bgRoot = document.getElementById("bg-root");
if (bgRoot) {
  createRoot(bgRoot).render(
    <StrictMode>
      <AmbientBackground />
    </StrictMode>,
  );
}

void boot();