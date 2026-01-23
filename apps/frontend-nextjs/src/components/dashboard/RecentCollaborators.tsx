"use client";

import React from "react";
import { Users } from "lucide-react";
import { CharacterPreview } from "./CharacterPreview";

export interface Collaborator {
  id: string;
  displayName: string;
  characterName: string;
  lastSeenRoom?: string;
  lastSeenAt?: string;
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
            <div key={i} className="w-12 h-12 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (collaborators.length === 0) {
    return (
      <div className="bg-ui-white border-2 border-ui-border rounded-2xl p-4 shadow-retro-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-400" />
          <h3 className="font-pixel text-sm text-gray-900">Recent People</h3>
        </div>
        <p className="text-gray-400 text-xs text-center py-3">
          People you meet will show up here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-ui-white border-2 border-ui-border rounded-2xl p-4 shadow-retro-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <h3 className="font-pixel text-sm text-gray-900">Recent People</h3>
        </div>
        <span className="text-xs text-gray-400">{collaborators.length}</span>
      </div>

      {/* Avatar Stack */}
      <div className="flex flex-wrap gap-2">
        {collaborators.slice(0, 8).map((person, index) => (
          <div
            key={person.id}
            className="group relative"
            style={{ zIndex: collaborators.length - index }}
          >
            <div className="w-12 h-14 bg-gradient-to-b from-gray-50 to-white rounded-xl border-2 border-ui-border flex items-center justify-center overflow-hidden hover:border-brand-primary/50 transition-colors cursor-default">
              <CharacterPreview
                characterId={person.characterName || "Adam"}
                size="sm"
                showShadow={false}
              />
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              {person.displayName}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        ))}
        {collaborators.length > 8 && (
          <div className="w-12 h-14 bg-gray-100 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-500">
              +{collaborators.length - 8}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
