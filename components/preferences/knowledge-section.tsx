'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  RefreshCw, 
  AlertTriangle, 
  TrendingUp,
  Info,
  Save,
  RotateCcw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';

interface KnowledgeSectionProps {
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

interface UserPreferences {
  noveltyPreference: number;
}

interface KnowledgeStats {
  totalTopics: number;
  averageConfidence: number;
  progressionOpportunities: number;
  totalGaps: number;
  criticalGaps: number;
}

export function KnowledgeSection({ onUnsavedChanges }: KnowledgeSectionProps) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    noveltyPreference: 0.7, // Default value
  });
  const [originalPreferences, setOriginalPreferences] = useState<UserPreferences>({
    noveltyPreference: 0.7,
  });
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    loadPreferences();
    loadKnowledgeStats();
  }, []);

  useEffect(() => {
    const hasChanges = preferences.noveltyPreference !== originalPreferences.noveltyPreference;
    onUnsavedChanges?.(hasChanges);
  }, [preferences, originalPreferences, onUnsavedChanges]);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('noveltyPreference')
        .eq('userId', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        const prefs = {
          noveltyPreference: data.noveltyPreference || 0.7,
        };
        setPreferences(prefs);
        setOriginalPreferences(prefs);
      }
    } catch (error) {
      console.error('Error loading knowledge preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadKnowledgeStats = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch('/api/knowledge');
      
      if (response.ok) {
        const data = await response.json();
        setKnowledgeStats(data.data);
      }
    } catch (error) {
      console.error('Error loading knowledge stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          userId: user.id,
          noveltyPreference: preferences.noveltyPreference,
        });

      if (error) {
        throw error;
      }

      setOriginalPreferences(preferences);
    } catch (error) {
      console.error('Error saving knowledge preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetPreferences = () => {
    setPreferences(originalPreferences);
  };

  const getNoveltyDescription = (value: number) => {
    if (value < 0.3) return 'More reinforcement - prefers familiar content that builds on what you know';
    if (value < 0.7) return 'Balanced - mix of familiar and novel content';
    return 'Maximum novelty - prioritizes new and diverse content';
  };

  const getNoveltyColor = (value: number) => {
    if (value < 0.3) return 'text-blue-600';
    if (value < 0.7) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading knowledge preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Knowledge Statistics Overview */}
      {knowledgeStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Knowledge Overview</span>
            </CardTitle>
            <CardDescription>
              Your current learning progress and knowledge state
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="flex items-center justify-center h-24">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                <span>Loading stats...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{knowledgeStats.totalTopics}</p>
                  <p className="text-sm text-gray-600">Topics</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(knowledgeStats.averageConfidence * 100)}%
                  </p>
                  <p className="text-sm text-gray-600">Avg Confidence</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{knowledgeStats.progressionOpportunities}</p>
                  <p className="text-sm text-gray-600">Ready to Progress</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{knowledgeStats.totalGaps}</p>
                  <p className="text-sm text-gray-600">Knowledge Gaps</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{knowledgeStats.criticalGaps}</p>
                  <p className="text-sm text-gray-600">Critical Gaps</p>
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={loadKnowledgeStats}
                disabled={loadingStats}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingStats ? 'animate-spin' : ''}`} />
                Refresh Stats
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anti-Repetition Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Content Novelty Preference</CardTitle>
          <CardDescription>
            Control how much you want to see familiar vs. new content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Novelty Preference Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="novelty-slider" className="text-base font-medium">
                Novelty vs. Reinforcement Balance
              </Label>
              <Badge variant="outline" className={getNoveltyColor(preferences.noveltyPreference)}>
                {Math.round(preferences.noveltyPreference * 100)}% novelty
              </Badge>
            </div>
            
            <div className="px-3">
              <Slider
                id="novelty-slider"
                min={0}
                max={1}
                step={0.1}
                value={[preferences.noveltyPreference]}
                onValueChange={([value]) => 
                  setPreferences(prev => ({ ...prev, noveltyPreference: value }))
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>More Reinforcement</span>
                <span>Balanced</span>
                <span>Maximum Novelty</span>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <span className={getNoveltyColor(preferences.noveltyPreference)}>
                  {getNoveltyDescription(preferences.noveltyPreference)}
                </span>
              </AlertDescription>
            </Alert>
          </div>

          {/* How It Works */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">How this affects your content:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="font-medium text-blue-900 mb-1">Low Novelty (0-30%)</div>
                <div className="text-blue-700">
                  More content that reinforces what you already know, helping solidify your knowledge
                </div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="font-medium text-yellow-900 mb-1">Balanced (30-70%)</div>
                <div className="text-yellow-700">
                  Mix of familiar and new content for steady learning progression
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="font-medium text-green-900 mb-1">High Novelty (70-100%)</div>
                <div className="text-green-700">
                  Prioritizes diverse, cutting-edge content to expand your knowledge horizons
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Gap Alerts */}
      {knowledgeStats && knowledgeStats.criticalGaps > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Critical Knowledge Gaps Detected</span>
            </CardTitle>
            <CardDescription className="text-red-600">
              You have {knowledgeStats.criticalGaps} critical knowledge gaps that may be limiting your learning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-700">
                Visit the Knowledge Dashboard to address these gaps and unlock new learning opportunities.
              </span>
              <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                <Brain className="h-4 w-4 mr-2" />
                View Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Progress Indicator */}
      {knowledgeStats && knowledgeStats.totalTopics > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Learning Progress</span>
            </CardTitle>
            <CardDescription>
              Your knowledge development across tracked topics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Confidence</span>
                <span className="text-sm text-gray-600">
                  {Math.round(knowledgeStats.averageConfidence * 100)}%
                </span>
              </div>
              <Progress value={knowledgeStats.averageConfidence * 100} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-lg font-semibold text-purple-600">
                    {knowledgeStats.progressionOpportunities}
                  </p>
                  <p className="text-xs text-purple-700">Ready for next level</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-lg font-semibold text-gray-600">
                    {knowledgeStats.totalTopics - knowledgeStats.progressionOpportunities}
                  </p>
                  <p className="text-xs text-gray-700">Still developing</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={resetPreferences}
          disabled={preferences.noveltyPreference === originalPreferences.noveltyPreference}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Changes
        </Button>
        
        <Button
          onClick={savePreferences}
          disabled={preferences.noveltyPreference === originalPreferences.noveltyPreference || saving}
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}