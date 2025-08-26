'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Download, 
  Upload, 
  FileText, 
  Shield, 
  AlertCircle, 
  CheckCircle,
  Copy,
  Trash2 
} from 'lucide-react'

interface ImportResult {
  success: boolean
  message: string
  conflicts?: string[]
  imported_fields?: string[]
}

export function ImportExportSection() {
  const [exportData, setExportData] = useState<string>('')
  const [importData, setImportData] = useState<string>('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/preferences/export')
      if (response.ok) {
        const data = await response.json()
        const exportJson = JSON.stringify(data, null, 2)
        setExportData(exportJson)
        
        // Also trigger download
        const blob = new Blob([exportJson], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `preferences-backup-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        throw new Error('Failed to export preferences')
      }
    } catch {
      setImportResult({
        success: false,
        message: 'Failed to export preferences. Please try again.',
      })
      setImportResult({
        success: false,
        message: 'Failed to export preferences. Please try again.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async () => {
    if (!importData.trim()) {
      setImportResult({
        success: false,
        message: 'Please paste your preferences data or select a file to import.',
      })
      return
    }

    setIsImporting(true)
    try {
      const parsedData = JSON.parse(importData)
      
      const response = await fetch('/api/preferences/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData),
      })

      const result = await response.json()
      setImportResult(result)
      
      if (result.success) {
        setImportData('')
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Invalid JSON format. Please check your data and try again.',
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setImportData(content)
        setImportResult(null)
      }
      reader.readAsText(file)
    }
  }

  const copyExportData = () => {
    navigator.clipboard.writeText(exportData)
  }

  const clearImportData = () => {
    setImportData('')
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Download className="h-4 w-4" />
            <span>Export Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create a backup of all your preferences that can be imported on other devices or restored later.
          </p>
          
          <div className="flex items-center space-x-3">
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                'Exporting...'
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export & Download
                </>
              )}
            </Button>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Shield className="h-3 w-3" />
              <span>Secure</span>
            </Badge>
          </div>

          {exportData && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Export Data Preview</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyExportData}
                  className="text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <Textarea
                value={exportData}
                readOnly
                className="font-mono text-xs h-32"
                placeholder="Your exported preferences will appear here..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Upload className="h-4 w-4" />
            <span>Import Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Restore preferences from a backup file or paste JSON data directly.
          </p>

          {/* File Upload */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Upload Backup File</h4>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {/* Manual Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Or Paste JSON Data</h4>
              {importData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearImportData}
                  className="text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <Textarea
              value={importData}
              onChange={(e) => {
                setImportData(e.target.value)
                setImportResult(null)
              }}
              placeholder="Paste your preferences JSON data here..."
              className="font-mono text-xs h-32"
            />
          </div>

          {/* Import Results */}
          {importResult && (
            <Alert className={importResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center space-x-2">
                {importResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={importResult.success ? 'text-green-700' : 'text-red-700'}>
                  {importResult.message}
                </AlertDescription>
              </div>
              
              {importResult.imported_fields && importResult.imported_fields.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-green-700">Imported fields:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {importResult.imported_fields.map(field => (
                      <Badge key={field} variant="outline" className="text-green-700 border-green-300">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {importResult.conflicts && importResult.conflicts.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-yellow-700">Conflicts resolved:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {importResult.conflicts.map(field => (
                      <Badge key={field} variant="outline" className="text-yellow-700 border-yellow-300">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Alert>
          )}

          {/* Import Actions */}
          <div className="flex items-center space-x-3">
            <Button 
              onClick={handleImport} 
              disabled={isImporting || !importData.trim()}
              variant={importResult?.success ? "outline" : "default"}
            >
              {isImporting ? (
                'Importing...'
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Preferences
                </>
              )}
            </Button>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Shield className="h-3 w-3" />
              <span>Validated</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Notice:</strong> Only import preference files from trusted sources. 
          Your data is validated before import to prevent security issues.
        </AlertDescription>
      </Alert>

      {/* Backup Recommendations */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-base">
            <FileText className="h-4 w-4" />
            <span>Backup Best Practices</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Export your preferences regularly, especially after major changes</li>
            <li>Store backup files in a secure location (cloud storage, password manager)</li>
            <li>Include the export date in your backup file names for easy identification</li>
            <li>Test your backup files periodically by importing them on a test device</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}