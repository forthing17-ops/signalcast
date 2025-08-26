'use client';

import React from 'react';

interface UserKnowledgeState {
  topic: string;
  confidenceLevel: number;
  contentCount: number;
  knowledgeDepth: 'beginner' | 'intermediate' | 'advanced';
  lastInteraction: Date;
  progressionScore: number;
}

interface ProgressChartProps {
  knowledgeAreas: UserKnowledgeState[];
}

export function ProgressChart({ knowledgeAreas }: ProgressChartProps) {
  // Simple visualization using CSS and divs (no external chart library for MVP)
  const maxConfidence = Math.max(...knowledgeAreas.map(area => area.confidenceLevel), 0.1);
  const maxContentCount = Math.max(...knowledgeAreas.map(area => area.contentCount), 1);
  
  // Group by depth for better visualization
  const depthGroups = {
    beginner: knowledgeAreas.filter(area => area.knowledgeDepth === 'beginner'),
    intermediate: knowledgeAreas.filter(area => area.knowledgeDepth === 'intermediate'),
    advanced: knowledgeAreas.filter(area => area.knowledgeDepth === 'advanced'),
  };

  const getDepthColor = (depth: string, opacity: number = 1) => {
    switch (depth) {
      case 'beginner': return `rgba(59, 130, 246, ${opacity})`; // blue
      case 'intermediate': return `rgba(245, 158, 11, ${opacity})`; // yellow
      case 'advanced': return `rgba(34, 197, 94, ${opacity})`; // green
      default: return `rgba(107, 114, 128, ${opacity})`; // gray
    }
  };

  if (knowledgeAreas.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        <p>No knowledge data to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Confidence vs Content Count Scatter Plot */}
      <div className="relative h-48 border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="absolute inset-4">
          {/* Y-axis (Confidence) */}
          <div className="absolute left-0 top-0 bottom-0 w-8">
            <div className="h-full flex flex-col justify-between text-xs text-gray-500">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
          </div>

          {/* X-axis (Content Count) */}
          <div className="absolute bottom-0 left-8 right-0 h-6">
            <div className="h-full flex justify-between items-end text-xs text-gray-500">
              <span>0</span>
              <span>{Math.round(maxContentCount / 4)}</span>
              <span>{Math.round(maxContentCount / 2)}</span>
              <span>{Math.round(maxContentCount * 3/4)}</span>
              <span>{maxContentCount}</span>
            </div>
          </div>

          {/* Data points */}
          <div className="absolute left-8 top-0 right-0 bottom-6">
            {knowledgeAreas.map((area, index) => {
              const x = (area.contentCount / maxContentCount) * 100;
              const y = 100 - (area.confidenceLevel * 100);
              
              return (
                <div
                  key={area.topic}
                  className="absolute w-3 h-3 rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    backgroundColor: getDepthColor(area.knowledgeDepth),
                  }}
                  title={`${area.topic}: ${Math.round(area.confidenceLevel * 100)}% confidence, ${area.contentCount} items`}
                />
              );
            })}
          </div>

          {/* Grid lines */}
          <div className="absolute left-8 top-0 right-0 bottom-6">
            {/* Horizontal grid lines */}
            {[0, 25, 50, 75, 100].map(percent => (
              <div
                key={`h-${percent}`}
                className="absolute left-0 right-0 border-t border-gray-200"
                style={{ top: `${100 - percent}%` }}
              />
            ))}
            
            {/* Vertical grid lines */}
            {[0, 25, 50, 75, 100].map(percent => (
              <div
                key={`v-${percent}`}
                className="absolute top-0 bottom-0 border-l border-gray-200"
                style={{ left: `${percent}%` }}
              />
            ))}
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
          Content Count
        </div>
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-gray-600">
          Confidence Level
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-6">
        {Object.entries(depthGroups).map(([depth, areas]) => (
          areas.length > 0 && (
            <div key={depth} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getDepthColor(depth) }}
              />
              <span className="text-sm text-gray-600 capitalize">
                {depth} ({areas.length})
              </span>
            </div>
          )
        ))}
      </div>

      {/* Knowledge Depth Distribution */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Knowledge Distribution</h4>
        {Object.entries(depthGroups).map(([depth, areas]) => (
          areas.length > 0 && (
            <div key={depth} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize text-gray-600">{depth}</span>
                <span className="text-gray-500">{areas.length} topics</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(areas.length / knowledgeAreas.length) * 100}%`,
                    backgroundColor: getDepthColor(depth),
                  }}
                />
              </div>
            </div>
          )
        ))}
      </div>

      {/* Top Areas by Progression Score */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Ready for Progression</h4>
        <div className="space-y-2">
          {knowledgeAreas
            .filter(area => area.progressionScore > 0.5)
            .sort((a, b) => b.progressionScore - a.progressionScore)
            .slice(0, 5)
            .map((area) => (
              <div key={area.topic} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">{area.topic}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-purple-500"
                      style={{ width: `${area.progressionScore * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8">
                    {Math.round(area.progressionScore * 100)}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}