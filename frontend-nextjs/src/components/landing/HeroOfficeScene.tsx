import React from "react";
import { OfficeScene } from "@/components/OfficeScene";

const size = "clamp(28px, 4.5%, 42px)";

export const HeroOfficeScene: React.FC = () => (
  <OfficeScene
    className="w-full h-full rounded-xl select-none"
    focus="center center"
    occupants={[
      { character: "Alex", left: "30%", top: "75%", width: size },
      { character: "Bob", left: "75%", top: "30%", width: size },
    ]}
  />
);
