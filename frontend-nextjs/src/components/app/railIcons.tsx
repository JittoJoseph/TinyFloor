"use client";

import { Chats, Floor, Gear, Meetings, Office, People, SignOut } from "@/components/ui/icons";

/**
 * The rail's icons, from the app's one pack (components/ui/icons). The rail
 * draws them with a heavier stroke where you are (see AppShell's Icon).
 */
export const RailIcons = {
  floor: <Floor />,
  chat: <Chats />,
  people: <People />,
  meetings: <Meetings />,
  office: <Office />,
  settings: <Gear />,
  leave: <SignOut className="rtl:-scale-x-100" />,
};
