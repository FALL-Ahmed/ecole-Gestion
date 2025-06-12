import React from 'react';
import { Skeleton } from '@/components/ui/skeleton'; // Assure-toi que ce chemin est correct

const daysCount = 6; // Lundi à Samedi
const timeSlotsCount = 8; // Nombre de créneaux horaires

export function SkeletonSchedule() {
  return (
    <div className="overflow-x-auto p-4"> {/* Ajout de padding pour l'esthétique */}
      <div className="min-w-[900px]">
        {/* Skeleton pour les en-têtes de jours */}
        <div className="grid grid-cols-[100px_repeat(6,1fr)] gap-2 mb-4"> {/* Marge augmentée */}
          <div className="font-semibold text-gray-500"></div>
          {Array.from({ length: daysCount }).map((_, i) => (
            <div key={i} className="font-semibold text-center py-2 bg-gray-100 rounded">
              <Skeleton className="h-4 w-20 mx-auto mb-1" /> {/* Nom du jour */}
              <Skeleton className="h-3 w-16 mx-auto" /> {/* Date */}
            </div>
          ))}
        </div>

        {/* Skeleton pour les créneaux horaires */}
        {Array.from({ length: timeSlotsCount }).map((_, i) => (
          <div key={i} className="grid grid-cols-[100px_repeat(6,1fr)] gap-2 mb-2">
            <div className="text-sm font-medium text-gray-500 py-2 flex items-center">
              <Skeleton className="h-4 w-24" /> {/* Créneau horaire */}
            </div>
            {Array.from({ length: daysCount }).map((_, j) => (
              <div key={j} className="min-h-[80px]">
                <Skeleton className="h-[80px] w-full rounded" /> {/* Case de cours */}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}