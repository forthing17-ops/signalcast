'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  BookOpen, 
  Download,
  RefreshCw,
  Network,
  Target
} from 'lucide-react';
import { ProgressChart } from './ProgressChart';
import { KnowledgeGraph } from './KnowledgeGraph';
import { ExportControls } from './ExportControls';

interface UserKnowledgeState {
  topic: string;
  confidenceLevel: number;
  contentCount: number;
  knowledgeDepth: 'beginner' | 'intermediate' | 'advanced';
  lastInteraction: Date;
  progressionScore: number;
}

interface KnowledgeGap {
  topic: string;
  gapType: 'missing' | 'shallow' | 'outdated' | 'prerequisite';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  priority: number;
  foundationalImportance: number;
}

interface KnowledgeOverview {
  knowledgeAreas: UserKnowledgeState[];
  totalTopics: number;
  averageConfidence: number;
  progressionOpportunities: number;
}

interface GapAnalysis {
  identifiedGaps: KnowledgeGap[];
  totalGaps: number;
  criticalGaps: number;
  foundationalGaps: number;
  recommendedActions: string[];
  learningPath: string[];
}

export function KnowledgeDashboard() {
  const [knowledgeOverview, setKnowledgeOverview] = useState<KnowledgeOverview | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadKnowledgeData();
  }, []);

  const loadKnowledgeData = async () => {
    try {
      setLoading(true);
      
      const [knowledgeResponse, gapsResponse] = await Promise.all([
        fetch('/api/knowledge'),
        fetch('/api/knowledge/gaps?suggestions=true'),
      ]);

      if (knowledgeResponse.ok && gapsResponse.ok) {
        const knowledgeData = await knowledgeResponse.json();
        const gapsData = await gapsResponse.json();
        
        setKnowledgeOverview(knowledgeData.data);
        setGapAnalysis(gapsData.data.gaps);
      }
    } catch (error) {
      console.error('Error loading knowledge data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadKnowledgeData();
    setRefreshing(false);
  };

  const getDepthColor = (depth: string) => {
    switch (depth) {
      case 'beginner': return 'bg-blue-100 text-blue-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading knowledge dashboard...</span>
        </div>
      </div>
    );
  }

  if (!knowledgeOverview) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <Brain className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Knowledge Data Yet</h3>
          <p className="text-gray-500 text-center">
            Start consuming content to build your knowledge graph and track your learning progress.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Dashboard</h1>
          <p className="text-gray-500">Track your learning progress and discover knowledge gaps</p>
        </div>
        <div className="flex items-center space-x-2">
          <ExportControls />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Topics</p>
                <p className="text-2xl font-bold text-gray-900">{knowledgeOverview.totalTopics}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Confidence</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(knowledgeOverview.averageConfidence * 100)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ready to Progress</p>
                <p className="text-2xl font-bold text-gray-900">{knowledgeOverview.progressionOpportunities}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Knowledge Gaps</p>
                <p className="text-2xl font-bold text-gray-900">{gapAnalysis?.totalGaps || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="gaps">Knowledge Gaps</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Knowledge Areas */}
            <Card>
              <CardHeader>
                <CardTitle>Knowledge Areas</CardTitle>
                <CardDescription>
                  Your current knowledge across different topics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {knowledgeOverview.knowledgeAreas
                    .sort((a, b) => b.confidenceLevel - a.confidenceLevel)
                    .slice(0, 10)
                    .map((area) => (
                      <div key={area.topic} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{area.topic}</span>
                            <div className="flex items-center space-x-2">
                              <Badge className={getDepthColor(area.knowledgeDepth)}>
                                {area.knowledgeDepth}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {area.contentCount} items
                              </span>
                            </div>
                          </div>
                          <Progress 
                            value={area.confidenceLevel * 100} 
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Confidence: {Math.round(area.confidenceLevel * 100)}%</span>
                            <span>Progress: {Math.round(area.progressionScore * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Learning Progress</CardTitle>
                <CardDescription>
                  Confidence levels across your knowledge areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProgressChart knowledgeAreas={knowledgeOverview.knowledgeAreas} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progression Opportunities */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Ready for Next Level</CardTitle>
                <CardDescription>
                  Topics where you're ready to progress to the next knowledge level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {knowledgeOverview.knowledgeAreas
                    .filter(area => area.progressionScore >= 0.8)
                    .map((area) => (
                      <div key={area.topic} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{area.topic}</h4>
                          <Badge className={getDepthColor(area.knowledgeDepth)}>
                            {area.knowledgeDepth}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>{area.contentCount} pieces consumed</span>
                          <span>{Math.round(area.confidenceLevel * 100)}% confidence</span>
                        </div>
                        <Progress value={area.progressionScore * 100} className="h-2 mt-2" />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Learning Path */}
            {gapAnalysis && gapAnalysis.learningPath.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Learning Path</CardTitle>
                  <CardDescription>
                    Suggested order for addressing knowledge gaps
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {gapAnalysis.learningPath.slice(0, 8).map((topic, index) => (
                      <div key={topic} className="flex items-center space-x-2">
                        <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm">{topic}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          {gapAnalysis && (
            <div className="space-y-6">
              {/* Gap Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{gapAnalysis.criticalGaps}</p>
                      <p className="text-sm text-gray-600">Critical Gaps</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{gapAnalysis.foundationalGaps}</p>
                      <p className="text-sm text-gray-600">Foundational Gaps</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-600">{gapAnalysis.totalGaps}</p>
                      <p className="text-sm text-gray-600">Total Gaps</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Identified Gaps */}
              <Card>
                <CardHeader>
                  <CardTitle>Identified Knowledge Gaps</CardTitle>
                  <CardDescription>
                    Areas where you might benefit from additional learning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {gapAnalysis.identifiedGaps.slice(0, 10).map((gap, index) => (
                      <div key={`${gap.topic}-${index}`} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{gap.topic}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge className={getSeverityColor(gap.severity)}>
                              {gap.severity}
                            </Badge>
                            <Badge variant="outline">
                              {gap.gapType}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{gap.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Priority: {Math.round(gap.priority * 100)}%</span>
                          <span>Foundational: {Math.round(gap.foundationalImportance * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommended Actions */}
              {gapAnalysis.recommendedActions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recommended Actions</CardTitle>
                    <CardDescription>
                      Steps to address your knowledge gaps
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {gapAnalysis.recommendedActions.map((action, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Relationships</CardTitle>
              <CardDescription>
                Connections between your learned content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeGraph />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}