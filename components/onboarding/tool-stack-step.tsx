'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface ToolStackData {
  techStack: string[]
}

interface ToolStackStepProps {
  data: ToolStackData
  onNext: (data: Partial<ToolStackData>) => void
  onBack: () => void
  onSkip: () => void
  canGoBack: boolean
}

export default function ToolStackStep({
  data,
  onNext,
  onBack,
  onSkip,
  canGoBack
}: ToolStackStepProps) {
  const [selectedStack, setSelectedStack] = useState<string[]>(data.techStack)
  const [customTool, setCustomTool] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const toolCategories = {
    'Languages': [
      'JavaScript',
      'TypeScript',
      'Python',
      'Java',
      'C#',
      'Go',
      'Rust',
      'PHP',
      'Ruby',
      'Swift',
      'Kotlin',
      'C++',
      'Scala'
    ],
    'Frontend Frameworks': [
      'React',
      'Next.js',
      'Vue.js',
      'Angular',
      'Svelte',
      'Nuxt.js',
      'Gatsby',
      'Remix',
      'Solid.js'
    ],
    'Backend Frameworks': [
      'Node.js',
      'Express.js',
      'Nest.js',
      'FastAPI',
      'Django',
      'Flask',
      'Spring Boot',
      'ASP.NET',
      'Rails',
      'Laravel'
    ],
    'Databases': [
      'PostgreSQL',
      'MySQL',
      'MongoDB',
      'Redis',
      'SQLite',
      'Elasticsearch',
      'DynamoDB',
      'Cassandra',
      'Neo4j',
      'InfluxDB'
    ],
    'Cloud Providers': [
      'AWS',
      'Azure',
      'Google Cloud',
      'Vercel',
      'Netlify',
      'Heroku',
      'DigitalOcean',
      'Cloudflare',
      'Supabase',
      'PlanetScale'
    ],
    'DevOps & Tools': [
      'Docker',
      'Kubernetes',
      'GitHub Actions',
      'Jenkins',
      'Terraform',
      'Ansible',
      'Prometheus',
      'Grafana',
      'ELK Stack',
      'Datadog'
    ],
    'Development Tools': [
      'VS Code',
      'IntelliJ IDEA',
      'Git',
      'GitHub',
      'GitLab',
      'Figma',
      'Postman',
      'Insomnia',
      'Webpack',
      'Vite'
    ]
  }

  const getAllTools = () => {
    return Object.values(toolCategories).flat()
  }

  const getFilteredTools = () => {
    if (!searchTerm) return toolCategories
    
    const filtered: typeof toolCategories = {}
    Object.entries(toolCategories).forEach(([category, tools]) => {
      const matchingTools = tools.filter(tool =>
        tool.toLowerCase().includes(searchTerm.toLowerCase())
      )
      if (matchingTools.length > 0) {
        filtered[category as keyof typeof toolCategories] = matchingTools
      }
    })
    return filtered
  }

  const handleToolToggle = (tool: string) => {
    setSelectedStack(prev =>
      prev.includes(tool)
        ? prev.filter(t => t !== tool)
        : [...prev, tool]
    )
  }

  const handleAddCustomTool = () => {
    if (customTool.trim() && !selectedStack.includes(customTool.trim())) {
      setSelectedStack(prev => [...prev, customTool.trim()])
      setCustomTool('')
    }
  }

  const handleRemoveTool = (tool: string) => {
    setSelectedStack(prev => prev.filter(t => t !== tool))
  }

  const handleNext = () => {
    onNext({ techStack: selectedStack })
  }

  const filteredCategories = getFilteredTools()

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          What's your current tech stack?
        </h2>
        <p className="text-gray-600">
          Tell us about the technologies you currently work with
        </p>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search">Search tools and technologies</Label>
        <Input
          id="search"
          type="text"
          placeholder="Search for specific tools..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Selected Tools */}
      {selectedStack.length > 0 && (
        <div className="space-y-2">
          <Label>Current tech stack ({selectedStack.length})</Label>
          <div className="flex flex-wrap gap-2 p-3 bg-green-50 rounded-lg">
            {selectedStack.map((tool) => (
              <Badge
                key={tool}
                variant="secondary"
                className="cursor-pointer hover:bg-red-100"
                onClick={() => handleRemoveTool(tool)}
              >
                {tool} ×
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tool Categories */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.entries(filteredCategories).map(([category, tools]) => (
          <div key={category} className="space-y-2">
            <h3 className="font-semibold text-lg text-gray-800">{category}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {tools.map((tool) => (
                <button
                  key={tool}
                  onClick={() => handleToolToggle(tool)}
                  className={`
                    text-left p-2 rounded-lg border text-sm transition-colors
                    ${selectedStack.includes(tool)
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'
                    }
                  `}
                >
                  {tool}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Custom Tool Input */}
      <div className="space-y-2">
        <Label htmlFor="custom">Add a tool not listed above</Label>
        <div className="flex space-x-2">
          <Input
            id="custom"
            type="text"
            placeholder="e.g., Bun, Deno, Tauri, etc."
            value={customTool}
            onChange={(e) => setCustomTool(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTool()}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddCustomTool}
            disabled={!customTool.trim()}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <div>
          {canGoBack && (
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
        </div>
        
        <div className="flex space-x-3">
          <Button variant="ghost" onClick={onSkip}>
            Skip for now
          </Button>
          <Button onClick={handleNext}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}