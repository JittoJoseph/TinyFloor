"use client";

import { MapTrifoldIcon } from "@phosphor-icons/react/dist/csr/MapTrifold";
import { ChatsCircleIcon } from "@phosphor-icons/react/dist/csr/ChatsCircle";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import { BuildingsIcon } from "@phosphor-icons/react/dist/csr/Buildings";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";

/**
 * The rail's icons: Phosphor, imported one file each so only these five ship.
 * The rail draws them outlined, and filled where you are (see AppShell's Icon).
 */
export const RailIcons = {
  floor: <MapTrifoldIcon />,
  chat: <ChatsCircleIcon />,
  people: <UsersThreeIcon />,
  office: <BuildingsIcon />,
  settings: <GearSixIcon />,
};
