'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface CuriosityAreasData {
  curiosityAreas: string[]
}

interface CuriosityAreasStepProps {
  data: CuriosityAreasData
  onNext: (data: Partial<CuriosityAreasData>) => void
  onBack: () => void
  onSkip: () => void
  canGoBack: boolean
  isLastStep?: boolean
  loading?: boolean
}

export default function CuriosityAreasStep({
  data,
  onNext,
  onBack,
  onSkip,
  canGoBack,
  isLastStep = false,
  loading = false
}: CuriosityAreasStepProps) {
  const [selectedAreas, setSelectedAreas] = useState<string[]>(data.curiosityAreas)
  const [customArea, setCustomArea] = useState('')

  const trendingTopics = [
    'Artificial General Intelligence',
    'Quantum Computing',
    'WebAssembly (WASM)',
    'Edge Computing',
    'Web3 & Decentralized Apps',
    'Rust Programming',
    'Micro-frontends',
    'JAMstack Architecture',
    'Zero Trust Security',
    'DevSecOps',
    'Observability & APM',
    'Progressive Web Apps',
    'Headless Commerce',
    'No-code/Low-code Platforms',
    'AR/VR Development',
    'IoT & Smart Devices',
    'Blockchain Development',
    'Serverless Architecture',
    'Container Orchestration',
    'Data Engineering',
    'MLOps',
    'Green Computing',
    'Privacy-first Development',
    'Cross-platform Development'
  ]

  const emergingTech = [
    '6G Technology',
    'Neuromorphic Computing',
    'Digital Twins',
    'Ambient Computing',
    'Spatial Computing',
    'Synthetic Biology Programming',
    'Quantum Internet',
    'Brain-Computer Interfaces',
    'Autonomous Systems',
    'Federated Learning'
  ]

  const handleAreaToggle = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : [...prev, area]
    )
  }

  const handleAddCustomArea = () => {
    if (customArea.trim() && !selectedAreas.includes(customArea.trim())) {
      setSelectedAreas(prev => [...prev, customArea.trim()])
      setCustomArea('')
    }
  }

  const handleRemoveArea = (area: string) => {
    setSelectedAreas(prev => prev.filter(a => a !== area))
  }

  const handleNext = () => {
    onNext({ curiosityAreas: selectedAreas })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          What emerging topics spark your curiosity?
        </h2>
        <p className="text-gray-600">
          Help us discover cutting-edge content that matches your interests
        </p>
      </div>

      {/* Selected Areas */}
      {selectedAreas.length > 0 && (
        <div className="space-y-2">
          <Label>Your curiosity areas ({selectedAreas.length})</Label>
          <div className="flex flex-wrap gap-2 p-3 bg-orange-50 rounded-lg">
            {selectedAreas.map((area) => (
              <Badge
                key={area}
                variant="secondary"
                className="cursor-pointer hover:bg-red-100"
                onClick={() => handleRemoveArea(area)}
              >
                {area} ×
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Trending Topics */}
      <div className="space-y-3">
        <div>
          <Label className="text-lg font-semibold">Trending Technology Topics</Label>
          <p className="text-sm text-gray-600 mt-1">
            Current hot topics in the tech world
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {trendingTopics.map((topic) => (
            <button
              key={topic}
              onClick={() => handleAreaToggle(topic)}
              className={`
                text-left p-2 rounded-lg border text-sm transition-colors
                ${selectedAreas.includes(topic)
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                }
              `}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Emerging Technologies */}
      <div className="space-y-3">
        <div>
          <Label className="text-lg font-semibold">Emerging & Future Technologies</Label>
          <p className="text-sm text-gray-600 mt-1">
            Cutting-edge technologies that are still developing
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {emergingTech.map((tech) => (
            <button
              key={tech}
              onClick={() => handleAreaToggle(tech)}
              className={`
                text-left p-2 rounded-lg border text-sm transition-colors
                ${selectedAreas.includes(tech)
                  ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                }
              `}
            >
              {tech}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Area Input */}
      <div className="space-y-2">
        <Label htmlFor="custom">Add your own curiosity area</Label>
        <div className="flex space-x-2">
          <Input
            id="custom"
            type="text"
            placeholder="e.g., Sustainable Tech, Digital Ethics, etc."
            value={customArea}
            onChange={(e) => setCustomArea(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomArea()}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddCustomArea}
            disabled={!customArea.trim()}
          >
            Add
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          Think about technologies or topics you're curious to learn more about
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <div>
          {canGoBack && (
            <Button variant="outline" onClick={onBack} disabled={loading}>
              Back
            </Button>
          )}
        </div>
        
        <div className="flex space-x-3">
          {!isLastStep && (
            <Button variant="ghost" onClick={onSkip} disabled={loading}>
              Skip for now
            </Button>
          )}
          <Button 
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? 'Completing Setup...' : isLastStep ? 'Complete Setup' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}