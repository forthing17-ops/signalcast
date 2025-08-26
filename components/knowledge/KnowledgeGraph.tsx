'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Network, ChevronRight } from 'lucide-react';

interface ContentRelationship {
  id: string;
  parentContentId: string;
  childContentId: string;
  relationshipType: 'builds_on' | 'prerequisite' | 'related' | 'contrasts';
  strength: number;
  parentContent?: {
    id: string;
    title: string;
    topics: string[];
  };
  childContent?: {
    id: string;
    title: string;
    topics: string[];
  };
}

interface ContentCluster {
  topic: string;
  contentIds: string[];
  centralContent: string;
  averageComplexity: number;
}

interface RelationshipAnalysis {
  relationships: ContentRelationship[];
  connectionMap: Map<string, string[]>;
  learningPath: string[];
  clusters: ContentCluster[];
}

export function KnowledgeGraph() {
  const [relationshipData, setRelationshipData] = useState<RelationshipAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  useEffect(() => {
    loadRelationshipData();
  }, []);

  const loadRelationshipData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/content/relationships?action=discover');
      
      if (response.ok) {
        const data = await response.json();
        // Convert connectionMap from object to Map
        const analysis = {
          ...data.data,
          connectionMap: new Map(Object.entries(data.data.connectionMap || {})),
        };
        setRelationshipData(analysis);
      }
    } catch (error) {
      console.error('Error loading relationship data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'builds_on': return 'bg-blue-100 text-blue-800';
      case 'prerequisite': return 'bg-red-100 text-red-800';
      case 'related': return 'bg-green-100 text-green-800';
      case 'contrasts': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplexityColor = (complexity: number) => {
    if (complexity < 0.3) return 'bg-green-500';
    if (complexity < 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading knowledge graph...</span>
        </div>
      </div>
    );
  }

  if (!relationshipData || relationshipData.relationships.length === 0) {
    return (
      <div className="text-center py-8">
        <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Relationships Found</h3>
        <p className="text-gray-500 mb-4">
          Consume more content to discover relationships and build your knowledge graph.
        </p>
        <Button onClick={loadRelationshipData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Content Clusters */}
      {relationshipData.clusters.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Knowledge Clusters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relationshipData.clusters.map((cluster) => (
              <Card 
                key={cluster.topic}
                className={`cursor-pointer transition-colors ${
                  selectedCluster === cluster.topic ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedCluster(
                  selectedCluster === cluster.topic ? null : cluster.topic
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium truncate">{cluster.topic}</h4>
                    <div className="flex items-center space-x-1">
                      <div
                        className={`w-3 h-3 rounded-full ${getComplexityColor(cluster.averageComplexity)}`}
                        title={`Complexity: ${Math.round(cluster.averageComplexity * 100)}%`}
                      />
                      <span className="text-xs text-gray-500">
                        {cluster.contentIds.length}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {cluster.contentIds.length} content piece{cluster.contentIds.length !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    Complexity: {Math.round(cluster.averageComplexity * 100)}%
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Learning Path */}
      {relationshipData.learningPath.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Recommended Learning Path</h3>
          <div className="flex flex-wrap items-center gap-2">
            {relationshipData.learningPath.slice(0, 8).map((topic, index) => (
              <React.Fragment key={topic}>
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                  <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{topic}</span>
                </div>
                {index < Math.min(relationshipData.learningPath.length - 1, 7) && (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Relationship Network */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Content Relationships</h3>
          <Button onClick={loadRelationshipData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Relationship Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['builds_on', 'prerequisite', 'related', 'contrasts'].map(type => {
            const count = relationshipData.relationships.filter(r => r.relationshipType === type).length;
            return (
              <Card key={type}>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-semibold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-600 capitalize">{type.replace('_', ' ')}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Relationship List */}
        <div className="space-y-3">
          {relationshipData.relationships
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 20)
            .map((relationship) => (
              <div key={relationship.id} className="p-4 border rounded-lg bg-white">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getRelationshipColor(relationship.relationshipType)}>
                    {relationship.relationshipType.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    Strength: {Math.round(relationship.strength * 100)}%
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">
                      {relationship.parentContent?.title || `Content ${relationship.parentContentId.slice(0, 8)}`}
                    </span>
                    {relationship.parentContent?.topics && (
                      <div className="text-xs text-gray-500 mt-1">
                        {relationship.parentContent.topics.slice(0, 3).join(', ')}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                  
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">
                      {relationship.childContent?.title || `Content ${relationship.childContentId.slice(0, 8)}`}
                    </span>
                    {relationship.childContent?.topics && (
                      <div className="text-xs text-gray-500 mt-1">
                        {relationship.childContent.topics.slice(0, 3).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Connection Statistics */}
      <div className="mt-6">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Network Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold text-blue-600">
                  {relationshipData.relationships.length}
                </p>
                <p className="text-xs text-gray-600">Total Connections</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-green-600">
                  {relationshipData.clusters.length}
                </p>
                <p className="text-xs text-gray-600">Knowledge Clusters</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-purple-600">
                  {relationshipData.learningPath.length}
                </p>
                <p className="text-xs text-gray-600">Learning Path Steps</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-orange-600">
                  {relationshipData.connectionMap.size}
                </p>
                <p className="text-xs text-gray-600">Connected Content</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}