'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';

export function ExportControls() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeContent: false,
    includeGaps: true,
  });

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setIsExporting(true);
      
      const params = new URLSearchParams({
        format,
        ...(exportOptions.includeContent && { includeContent: 'true' }),
        ...(exportOptions.includeGaps && { includeGaps: 'true' }),
      });

      const response = await fetch(`/api/knowledge/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `knowledge-export-${new Date().toISOString().split('T')[0]}.${format}`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting knowledge data:', error);
      // TODO: Show error toast/notification
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={isExporting}
        >
          <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-pulse' : ''}`} />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium text-gray-900">Export Options</p>
          <p className="text-xs text-gray-500">Choose what to include</p>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuCheckboxItem
          checked={exportOptions.includeGaps}
          onCheckedChange={(checked) => 
            setExportOptions(prev => ({ ...prev, includeGaps: checked }))
          }
        >
          Include Knowledge Gaps
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuCheckboxItem
          checked={exportOptions.includeContent}
          onCheckedChange={(checked) => 
            setExportOptions(prev => ({ ...prev, includeContent: checked }))
          }
        >
          Include Content & Relationships
        </DropdownMenuCheckboxItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileText className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}