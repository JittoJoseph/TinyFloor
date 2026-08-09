"use client";

import React from "react";
import styles from "./HeroOfficeScene.module.css";

export const HeroOfficeScene: React.FC = () => {
  return (
    <div className="w-full h-full relative overflow-hidden select-none cursor-default bg-[#1f2937] rounded-xl">
      <div className={styles.sceneContainer}>
        <div className={styles.officeBackground} />

        <div
          className={`${styles.avatar} ${styles.avatarAlex}`}
          style={{ left: "30%", top: "75%" }}
        />

        <div
          className={`${styles.avatar} ${styles.avatarBob}`}
          style={{ left: "75%", top: "30%" }}
        />
      </div>
    </div>
  );
};
