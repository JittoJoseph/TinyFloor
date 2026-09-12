"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Users } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { DirectoryHeader } from "@/components/DirectoryHeader";
import { CharacterPreview } from "@/components/dashboard";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { useInfiniteScroll } from "@/lib/useInfiniteScroll";
import { profilePath } from "@/lib/links";
import { PEOPLE_PAGE_SIZE } from "@/lib/directory";
import type { PublicUser } from "@/lib/types";

/** Starts from the people the server rendered, and loads them itself when it could not. */
export function PeopleDirectory({
  initialPeople,
}: {
  initialPeople: PublicUser[] | null;
}) {
  const t = useTranslations("directory");
  const tc = useTranslations("common");
  const { user, isAuthenticated } = useAuth();
  const [people, setPeople] = useState<PublicUser[]>(initialPeople ?? []);
  const [loading, setLoading] = useState(!initialPeople);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(
    initialPeople ? initialPeople.length === PEOPLE_PAGE_SIZE : true,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const pageRef = useRef(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (initialPeople) return;

    const fetchFirstPage = async () => {
      try {
        const data = await apiClient.getPublicUsers(0, PEOPLE_PAGE_SIZE);
        setPeople(data);
        setHasMore(data.length === PEOPLE_PAGE_SIZE);
      } catch (error) {
        console.error("Failed to fetch people:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFirstPage();
  }, [initialPeople]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loading || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const data = await apiClient.getPublicUsers(next, PEOPLE_PAGE_SIZE);
      pageRef.current = next;
      setPeople((prev) => [...prev, ...data]);
      setHasMore(data.length === PEOPLE_PAGE_SIZE);
    } catch (error) {
      console.error("Failed to fetch more people:", error);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [loading, hasMore]);

  const sentinelRef = useInfiniteScroll(hasMore && !loading, loadMore);

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return people;
    const query = searchQuery.toLowerCase();
    return people.filter(
      (person) =>
        person.displayName.toLowerCase().includes(query) ||
        person.username.toLowerCase().includes(query),
    );
  }, [people, searchQuery]);

  const yourCard =
    isAuthenticated && user
      ? {
          id: user.id,
          displayName: user.displayName,
          username: user.username,
          characterName: user.avatarPreferences?.characterName || "Adam",
          isGuest: user.isGuest,
        }
      : null;

  const visiblePeople = filteredPeople.filter(
    (person) => person.id !== yourCard?.id,
  );

  return (
    <div className="min-h-screen w-full pt-8 md:pt-20 pb-12 px-4 md:px-8 font-body relative">
      <div className="max-w-5xl mx-auto space-y-8">
        <DirectoryHeader
          active="people"
          subtitle={t("peopleSubtitle")}
          ctaLabel={tc("createRoom")}
          count={
            loading
              ? t("gatheringPeople")
              : tc("peopleCount", { count: people.length })
          }
          query={searchQuery}
          onQueryChange={setSearchQuery}
          searchPlaceholder={t("searchPeople")}
        />

        {yourCard && (
          <Link
            href={profilePath(yourCard.id)}
            className="cursor-pointer block w-full"
          >
            <div className="bg-[#fbfbf9] border border-[rgba(0,0,0,0.06)] rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 relative overflow-hidden group">
              <div className="absolute top-0 start-0 w-1 h-full bg-[var(--color-braun-orange)]"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-20 bg-white border border-[rgba(0,0,0,0.05)] rounded-2xl flex items-center justify-center">
                    <CharacterPreview
                      characterId={yourCard.characterName}
                      size="sm"
                      showShadow={false}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-medium text-[var(--color-braun-text)] tracking-tight">
                        {yourCard.displayName}
                      </h2>
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-[rgba(255,78,0,0.08)] text-[var(--color-braun-orange)] rounded-full border border-[rgba(255,78,0,0.1)]">
                        {tc("you")}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-braun-text)] opacity-50" dir="ltr">
                      @{yourCard.username}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[var(--color-braun-text)] opacity-40 group-hover:opacity-70 transition-opacity">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t("yourProfile")}</span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {loading ? (
          <div className="text-center py-32 flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-[var(--color-braun-orange)] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-[var(--color-braun-text)] opacity-50 tracking-widest uppercase font-medium">
              {t("loadingPeople")}
            </p>
          </div>
        ) : visiblePeople.length === 0 ? (
          <div className="w-full py-24 flex flex-col items-center text-center bg-white border border-[rgba(0,0,0,0.05)] rounded-3xl shadow-sm">
            <Users
              className="w-8 h-8 text-[var(--color-braun-text)] opacity-20 mb-4"
              strokeWidth={1.5}
            />
            <h3 className="text-xl font-light text-[var(--color-braun-text)] tracking-tight mb-2">
              {t("noPeople")}
            </h3>
            <p className="text-sm text-[var(--color-braun-text)] opacity-50 mb-6 max-w-sm">
              {t("noPeopleBody")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visiblePeople.map((person) => (
              <Link
                key={person.id}
                href={profilePath(person.id)}
                className="cursor-pointer group"
              >
                <div className="bg-white border border-[rgba(0,0,0,0.05)] rounded-3xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 h-full flex items-center gap-4">
                  <div className="w-14 h-16 bg-[#f8f8f6] border border-[rgba(0,0,0,0.04)] rounded-2xl flex items-center justify-center shrink-0">
                    <CharacterPreview
                      characterId={person.characterName || "Adam"}
                      size="sm"
                      showShadow={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col">
                    <p className="text-base font-medium text-[var(--color-braun-text)] tracking-tight truncate mb-0.5">
                      {person.displayName}
                    </p>
                    <p className="text-xs text-[var(--color-braun-text)] opacity-50 truncate" dir="ltr">
                      @{person.username}
                    </p>
                    {person.isGuest && (
                      <span className="self-start mt-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-[rgba(0,0,0,0.04)] text-[var(--color-braun-text)] opacity-70 rounded-full">
                        {tc("guest")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {hasMore && !loading && !searchQuery.trim() && (
          <div ref={sentinelRef} className="flex justify-center items-center h-12">
            {loadingMore && (
              <div className="w-5 h-5 border-2 border-[var(--color-braun-text)] border-t-transparent rounded-full animate-spin opacity-40" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
