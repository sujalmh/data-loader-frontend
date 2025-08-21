"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Play, RotateCcw, FileText, CheckCircle, Clock, AlertCircle, BookOpen } from "lucide-react"
import type { FileData, AnalysisData } from "@/app/page"

interface FileProcessingProps {
  files: FileData[]
  setFiles: (updater: (prevFiles: FileData[]) => FileData[]) => void
  progress: number
  setProgress: (progress: number) => void
}

interface ApiResult {
  fileName: string;
  qualityMetrics: {
    parseAccuracy: number;
    complexity: number;
  };
  classification: "Structured" | "Semi-Structured" | "Unstructured";
  analysis: AnalysisData; // Added to match the backend response
}

interface FileProcessingProps {
  files: FileData[]
  setFiles: (updater: (prevFiles: FileData[]) => FileData[]) => void
  progress: number
  setProgress: (progress: number) => void
}


export default function FileProcessing({ files, setFiles, progress, setProgress }: FileProcessingProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null);
  const [processedFileCount, setProcessedFileCount] = useState(0);

  const selectedFiles = files.filter((f) => f.selected)

  const startProcessing = async () => {
    setIsProcessing(true)
    setProgress(0)
    setError(null)
    setProcessedFileCount(0)

    // Reset the status of selected files before processing
    setFiles((prevFiles) =>
      prevFiles.map((f) =>
        f.selected
          ? {
              ...f,
              processed: false,
              qualityMetrics: undefined,
              classification: undefined,
              analysis: undefined, // Reset analysis field
            }
          : f,
      ),
    )

    const formData = new FormData()
    selectedFiles.forEach((file) => {
      if (file.file) {
        formData.append("files", file.file)
      }
    })

    // Simulate progress
    const progressInterval = setInterval(() => {
        setProgress(oldProgress => oldProgress < 95 ? oldProgress + 1 : oldProgress);
    }, 150);


    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/process-files`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Processing failed. Check the server." }));
        throw new Error(errorData.detail);
      }

      const results: ApiResult[] = await response.json()
      
      // Update state with results from the API
      setFiles((prevFiles) => {
        const resultMap = new Map(results.map(r => [r.fileName, r]));
        return prevFiles.map(file => {
          const result = resultMap.get(file.name);
          if (file.selected && result) {
            return {
              ...file,
              processed: true,
              qualityMetrics: result.qualityMetrics,
              classification: result.classification,
              analysis: result.analysis, // Store the new analysis object
            };
          }
          return file;
        });
      });
      
      setProcessedFileCount(results.length);
      setProgress(100);

    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.message || "An unknown error occurred. Is the backend server running?");
      setProgress(0);
    } finally {
      setIsProcessing(false)
    }
  }

  const resetProcessing = () => {
    setFiles(prevFiles =>
      prevFiles.map((f) => ({
        ...f,
        processed: false,
        qualityMetrics: undefined,
        classification: undefined,
        analysis: undefined, // Also reset the analysis field
      })),
    )
    setProgress(0)
    setError(null);
    setProcessedFileCount(0);
  }

  // --- Helper functions for rendering badges ---

  const getQualityBadge = (score: number) => {
    if (score >= 3) return <Badge className="bg-green-500 hover:bg-green-600">Excellent</Badge>
    if (score >= 2) return <Badge className="bg-yellow-500 hover:bg-yellow-600">Good</Badge>
    if (score >= 1) return <Badge className="bg-orange-500 hover:bg-orange-600">Fair</Badge>
    return <Badge variant="destructive">Poor</Badge>
  }

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case "Structured":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Structured</Badge>
      case "Semi-Structured":
        return <Badge className="bg-purple-500 hover:bg-purple-600">Semi-Structured</Badge>
      case "Unstructured":
        return <Badge className="bg-gray-500 hover:bg-gray-600">Unstructured</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getComplexityDisplay = (score: number) => {
    switch (Math.round(score)) {
      case 1:
        return <Badge className="bg-red-500 hover:bg-red-600">Hard</Badge>;
      case 2:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Medium</Badge>;
      case 3:
        return <Badge className="bg-green-500 hover:bg-green-600">Easy</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  }

  const getFileStatus = (file: FileData) => {
    if (file.processed) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }
    if (isProcessing && file.selected) {
      return <Clock className="w-5 h-5 text-blue-500 animate-spin" />
    }
    return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Step 2: File Processing</h2>
        <p className="text-gray-600">Analyze data quality and classify file types via API</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Processing Control</CardTitle>
          <CardDescription>Process {selectedFiles.length} selected files to compute quality metrics.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
            <div className="flex items-center gap-4">
                <Button onClick={startProcessing} disabled={isProcessing || selectedFiles.length === 0} className="flex items-center gap-2 w-40">
                    <Play className="w-4 h-4" />
                    {isProcessing ? "Processing..." : "Start Processing"}
                </Button>
                <Button variant="outline" onClick={resetProcessing} disabled={isProcessing} className="flex items-center gap-2 bg-transparent">
                    <RotateCcw className="w-4 h-4" />
                    Reset
                </Button>
            </div>
            <div className="flex-1 w-full">
                <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
            </div>
          </div>
          
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="w-4 h-4" />
              <span>Error: {error}</span>
            </div>
          )}

          <div className="text-sm text-gray-600 mt-2">
            Status: {isProcessing ? "Sending files to server..." : `${processedFileCount} of ${selectedFiles.length} files processed.`}
          </div>
        </CardContent>
      </Card>

      {selectedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
            <CardDescription>Data quality metrics and classifications from the server.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Status</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Parse Accuracy</TableHead>
                  <TableHead>Complexity</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedFiles.map((file) => (
                  <TableRow key={file.id} className={file.processed ? "bg-green-50/50" : ""}>
                    <TableCell>{getFileStatus(file)}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        {file.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {file.qualityMetrics ? (
                        <div className="flex items-center gap-2">
                          <span>{file.qualityMetrics.parseAccuracy}/3</span>
                          {getQualityBadge(file.qualityMetrics.parseAccuracy)}
                        </div>
                      ) : (
                        <span className="text-gray-400">
                          {isProcessing && file.selected ? "Processing..." : "Pending"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {file.qualityMetrics ? (
                        <div className="flex items-center gap-2">
                          <span>{Math.round(file.qualityMetrics.complexity)}/3</span>
                          {getComplexityDisplay(file.qualityMetrics.complexity)}
                        </div>
                      ) : (
                        <span className="text-gray-400">
                          {isProcessing && file.selected ? "Processing..." : "Pending"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {file.classification ? (
                        getClassificationBadge(file.classification)
                      ) : (
                        <span className="text-gray-400">
                          {isProcessing && file.selected ? "Analyzing..." : "Pending"}
                        </span>
                      )}
                    </TableCell>
                    {/* New Cell for Domain */}
                    <TableCell>
                      {file.analysis?.domain ? (
                         <Badge variant="outline">{file.analysis.domain}</Badge>
                      ) : (
                        <span className="text-gray-400">
                          {isProcessing && file.selected ? "Analyzing..." : "Pending"}
                        </span>
                      )}
                    </TableCell>
                    {/* New Cell for Summary */}
                    <TableCell className="text-xs text-gray-600 max-w-xs truncate">
                      {file.analysis?.brief_summary ? (
                        <div className="flex items-start gap-2">
                          <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{file.analysis.brief_summary}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">
                          {isProcessing && file.selected ? "Analyzing..." : "Pending"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
