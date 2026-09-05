"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CHARACTER_IDS } from "./CharacterPicker";

const subscribeOnce = () => () => {};
const emptySnapshot = () => "";
const readStored = (key: string) => () => localStorage.getItem(key) ?? "";

export function useIdentity() {
  const { user, isAuthenticated } = useAuth();

  const storedName = useSyncExternalStore(
    subscribeOnce,
    readStored("guestDisplayName"),
    emptySnapshot,
  );
  const storedCharacter = useSyncExternalStore(
    subscribeOnce,
    readStored("guestCharacter"),
    emptySnapshot,
  );

  const [typedName, setTypedName] = useState<string | null>(null);
  const [pickedCharacter, setPickedCharacter] = useState<string | null>(null);
  const [arriving, setArriving] = useState(false);

  const name = typedName ?? user?.displayName ?? storedName;
  const requested =
    pickedCharacter || user?.avatarPreferences?.characterName || storedCharacter;
  const character = CHARACTER_IDS.includes(requested) ? requested : "Adam";

  const pickCharacter = useCallback((next: string) => {
    setPickedCharacter(next);
    setArriving(true);
    setTimeout(() => setArriving(false), 700);
  }, []);

  const remember = useCallback(async () => {
    if (isAuthenticated && !user?.isGuest) {
      try {
        await apiClient.updateProfile(name, { characterName: character });
      } catch {
        // profile sync is best effort, entering the room still works
      }
      return;
    }

    localStorage.setItem("guestDisplayName", name);
    localStorage.setItem("guestCharacter", character);
  }, [character, isAuthenticated, name, user?.isGuest]);

  return {
    name,
    setName: setTypedName,
    character,
    pickCharacter,
    arriving,
    remember,
    isAuthenticated,
  };
}

export function roomHref(
  roomId: string,
  name: string,
  character: string,
  userId: string,
) {
  return `/room/${roomId}?name=${encodeURIComponent(
    name,
  )}&character=${character}&userId=${userId}`;
}
