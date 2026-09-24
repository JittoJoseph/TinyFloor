"use client";

import { MapTrifoldIcon } from "@phosphor-icons/react/dist/csr/MapTrifold";
import { ChatsCircleIcon } from "@phosphor-icons/react/dist/csr/ChatsCircle";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import { BuildingsIcon } from "@phosphor-icons/react/dist/csr/Buildings";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { SignOutIcon } from "@phosphor-icons/react/dist/csr/SignOut";
import { HouseIcon } from "@phosphor-icons/react/dist/csr/House";
import { UserCircleIcon } from "@phosphor-icons/react/dist/csr/UserCircle";
import { DoorOpenIcon } from "@phosphor-icons/react/dist/csr/DoorOpen";

/**
 * The rail's icons: Phosphor, imported one file each so only these ship.
 * The rail draws them outlined, and filled where you are (see AppShell's Icon).
 */
export const RailIcons = {
  floor: <MapTrifoldIcon />,
  chat: <ChatsCircleIcon />,
  people: <UsersThreeIcon />,
  office: <BuildingsIcon />,
  settings: <GearSixIcon />,
  leave: <SignOutIcon className="rtl:-scale-x-100" />,
  home: <HouseIcon />,
  account: <UserCircleIcon />,
  lobby: <DoorOpenIcon className="rtl:-scale-x-100" />,
};
