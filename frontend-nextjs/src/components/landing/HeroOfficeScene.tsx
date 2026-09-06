import React from "react";
import { OfficeScene } from "@/components/OfficeScene";

const size = "max(4cqw, 6cqh, 22px)";

export const HeroOfficeScene: React.FC = () => (
  <OfficeScene
    className="w-full h-full rounded-xl select-none"
    focus="center center"
    occupants={[
      { character: "Alex", left: "30%", top: "78%", width: size },
      { character: "Bob", left: "75%", top: "33%", width: size },
    ]}
  />
);
