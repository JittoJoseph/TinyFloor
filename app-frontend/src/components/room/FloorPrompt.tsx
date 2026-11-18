"use client";

import { useEffect, useState } from "react";
import { usePlace } from "@/components/app/place";
import { useAuth } from "@/contexts/AuthContext";
import { clearClaimed, setCanClaim, useDesks } from "@/lib/desks";
import { ChristmasOffer } from "./ChristmasOffer";
import { MeetingReminder } from "./MeetingReminder";

/** How long a claim is remembered as just made, for the desk's "Claimed" (DeskPlate). */
const CLAIMED_MS = 2200;
/** Whether the Christmas offer is showing doesn't matter here any more. */
const ignore = () => {};

/**
 * The one prompt above the dock (docs/product.md): a meeting about to start,
 * or at Christmas the presents' offer. What you can do where you stand is at
 * the top right instead (FloorHint). Desks are claimed on the desks themselves
 * (DeskPlate), never down here; this only tells the floor whether you can
 * claim one in this place.
 */
export function FloorPrompt() {
  const place = usePlace();
  const { user } = useAuth();
  const { claimed } = useDesks();
  // A meeting about to start takes the place from the Christmas offer.
  const [reminding, setReminding] = useState(false);

  // A desk is a member's, in an office (not a guest's); in the demo office, anyone's while they're there.
  const canClaim = !!user && (place.kind === "lobby" || (place.kind === "office" && place.role !== "guest"));
  useEffect(() => {
    setCanClaim(canClaim);
    return () => {
      setCanClaim(false);
    };
  }, [canClaim]);
  // Said once, briefly: the claim is forgotten after the desk has said it.
  useEffect(() => {
    if (claimed === null) return;
    const timer = setTimeout(clearClaimed, CLAIMED_MS);
    return () => clearTimeout(timer);
  }, [claimed]);

  return (
    <>
      <MeetingReminder onShown={setReminding} />
      {!reminding && <ChristmasOffer onShown={ignore} />}
    </>
  );
}
