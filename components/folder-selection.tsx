"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { FolderOpen, File, FileText, FileSpreadsheet, ImageIcon, Upload } from "lucide-react"
import type { FileData } from "@/app/page"

interface FolderSelectionProps {
  files: FileData[]
  setFiles: (files: FileData[]) => void
}

export default function FolderSelection({ files, setFiles }: FolderSelectionProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || [])
    if (uploadedFiles.length === 0) return

    const filesWithSelection: FileData[] = uploadedFiles.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      path: file.webkitRelativePath || file.name,
      size: file.size,
      type: file.name.split(".").pop()?.toLowerCase() || "unknown",
      selected: true, // All files pre-selected by default
      processed: false,
      file: file, // Store the actual File object for later processing
    }))

    setFiles(filesWithSelection)
    setSelectedFolder(
      uploadedFiles[0].webkitRelativePath ? uploadedFiles[0].webkitRelativePath.split("/")[0] : "Selected Files",
    )
  }

  const handleFolderUpload = () => {
    if (folderInputRef.current) {
      folderInputRef.current.click()
    }
  }

  const handleIndividualFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const toggleFileSelection = (fileId: string) => {
    setFiles(files.map((file) => (file.id === fileId ? { ...file, selected: !file.selected } : file)))
  }

  const toggleAllFiles = (checked: boolean) => {
    setFiles(files.map((file) => ({ ...file, selected: checked })))
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case "csv":
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="w-4 h-4" />
      case "pdf":
      case "docx":
      case "doc":
      case "txt":
        return <FileText className="w-4 h-4" />
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
        return <ImageIcon className="w-4 h-4" />
      default:
        return <File className="w-4 h-4" />
    }
  }

  const selectedCount = files.filter((f) => f.selected).length

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Step 1: Folder Selection & File Listing</h2>
        <p className="text-gray-600">Upload files or select a folder containing files to process</p>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
        accept=".csv,.xlsx,.xls,.pdf,.docx,.doc,.txt,.json,.sql,.png,.jpg,.jpeg,.gif"
      />
      <input ref={folderInputRef} type="file" webkitdirectory="" className="hidden" onChange={handleFileUpload} />

      {!selectedFolder ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors cursor-pointer"
            onClick={handleFolderUpload}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Folder</h3>
              <p className="text-gray-500 mb-4 text-center">Choose a folder containing the files you want to process</p>
              <Button className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Browse Folder
              </Button>
            </CardContent>
          </Card>

          <Card
            className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors cursor-pointer"
            onClick={handleIndividualFileUpload}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Upload className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Files</h3>
              <p className="text-gray-500 mb-4 text-center">Select individual files to upload and process</p>
              <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                <Upload className="w-4 h-4" />
                Upload Files
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                {selectedFolder}
              </CardTitle>
              <CardDescription>
                Found {files.length} files • {selectedCount} selected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="select-all" checked={selectedCount === files.length} onCheckedChange={toggleAllFiles} />
                  <label htmlFor="select-all" className="text-sm font-medium">
                    Select All Files
                  </label>
                </div>
                <Badge variant="secondary">
                  {selectedCount} of {files.length} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiles([])
                    setSelectedFolder("")
                  }}
                  className="ml-auto"
                >
                  Clear All
                </Button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <Checkbox checked={file.selected} onCheckedChange={() => toggleFileSelection(file.id)} />
                    <div className="flex items-center gap-2 flex-1">
                      {getFileIcon(file.type)}
                      <div className="flex-1">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-gray-500">{file.path}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {file.type.toUpperCase()}
                        </Badge>
                        <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
