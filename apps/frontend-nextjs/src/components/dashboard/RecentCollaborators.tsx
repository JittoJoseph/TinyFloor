"use client";

import React from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { CharacterPreview } from "./CharacterPreview";

export interface Collaborator {
  id: string;
  username?: string;
  displayName: string;
  characterName: string;
}

interface RecentCollaboratorsProps {
  collaborators: Collaborator[];
  isLoading?: boolean;
}

export function RecentCollaborators({
  collaborators,
  isLoading,
}: RecentCollaboratorsProps) {
  if (isLoading) {
    return (
      <div className="bg-ui-white border-2 border-ui-border rounded-2xl p-4 shadow-retro-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-400" />
          <h3 className="font-pixel text-sm text-gray-900">Recent People</h3>
        </div>
        <div className="flex gap-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={`skeleton-${i}`}
              className="w-12 h-12 bg-gray-100 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (collaborators.length === 0) {
    return (
      <div className="bg-ui-white border-2 border-ui-border rounded-2xl p-4 shadow-retro-sm h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-400" />
          <h3 className="font-pixel text-sm text-gray-900">Recent People</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-gray-400 text-xs">Join rooms to meet people</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ui-white border-2 border-ui-border rounded-2xl p-4 shadow-retro-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <h3 className="font-pixel text-sm text-gray-900">Recent People</h3>
        </div>
        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] font-bold text-gray-600">
          {collaborators.length}
        </span>
      </div>

      {/* Avatar Stack */}
      <div className="flex flex-wrap gap-2 flex-1 content-start">
        {collaborators.slice(0, 8).map((person, index) => {
          const hasValidId = Boolean(person.id);
          const linkHref = hasValidId ? `/dashboard?user=${person.id}` : "#";
          const content = (
            <div className="w-11 h-14 bg-white rounded-xl border-2 border-ui-border flex items-center justify-center overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all hover:-translate-y-0.5 pb-4">
              <CharacterPreview
                characterId={person.characterName || "Adam"}
                size="sm"
                showShadow={false}
              />
            </div>
          );

          return (
            <div
              key={person.id}
              className="group relative"
              style={{ zIndex: collaborators.length - index }}
            >
              {hasValidId ? (
                <Link href={linkHref} className="cursor-pointer block">
                  {content}
                </Link>
              ) : (
                <div className="cursor-default">{content}</div>
              )}
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                {person.displayName}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          );
        })}
        {collaborators.length > 8 && (
          <div className="w-11 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-200 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">
              +{collaborators.length - 8}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
