"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Play, ChevronDown, ChevronRight, Database, FileText, Table, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react"
import type { FileData, DatabaseConfig } from "@/app/page"

// NOTE: These types should ideally be shared with the backend
// to ensure consistency.
type ColumnSchema = {
    name: string;
    type: string;
    primary?: boolean;
};

type TableDetails = {
    tableName: string;
    schema_details: ColumnSchema[];
    rowsInserted: number;
    sqlCommands: string[];
};

type StructuredIngestionDetails = {
    type: "structured";
    tables: TableDetails[];
};

type SemiStructuredIngestionDetails = {
    type: "semi-structured";
    structuredData: {
        tableName: string;
        rowsInserted: number;
    };
    unstructuredData: {
        collection: string;
        chunksCreated: number;
        embeddingsGenerated: number;
    };
};

type UnstructuredIngestionDetails = {
    type: "unstructured";
    collection: string;
    chunksCreated: number;
    embeddingsGenerated: number;
    chunkingMethod: string;
    embeddingModel: string;
};

type IngestionDetails = (StructuredIngestionDetails | SemiStructuredIngestionDetails | UnstructuredIngestionDetails) & {
    // These are from the client-side mock for now, but would come from the API in a real app
    startTime: string;
    endTime: string;
};

// NEW: Type to match the API response for a single file
type FileIngestionResult = {
    fileName: string;
    fileSize: number;
    status: "success" | "failed"; // Simplified for demonstration
    ingestionDetails: StructuredIngestionDetails | null;
    error: string | null;
};

interface IngestionProcessProps {
    files: FileData[]
    setFiles: (files: (prevFiles: FileData[]) => FileData[]) => void
    databaseConfig: DatabaseConfig
    progress: number
    setProgress: (progress: number) => void
}

export default function IngestionProcess({
    files,
    setFiles,
    databaseConfig,
    progress,
    setProgress,
}: IngestionProcessProps) {
    const [isIngesting, setIsIngesting] = useState(false)
    const [apiError, setApiError] = useState<string | null>(null);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

    const selectedFiles = files.filter((f) => f.selected && f.processed)

    /**
     * Handles the actual API call for ingesting a given list of files.
     * This function is used by both the initial ingestion and the retry logic.
     */
    const handleIngestion = async (filesToProcess: FileData[]) => {
        if (filesToProcess.length === 0) return;

        setIsIngesting(true);
        setApiError(null);

        // Set the files being processed to "pending" and clear old errors
        setFiles((prevFiles) =>
            prevFiles.map((f) =>
                filesToProcess.some(p => p.id === f.id)
                    ? { ...f, ingestionStatus: "pending" as const, ingestionDetails: null, error: undefined }
                    : f
            )
        );

        const formData = new FormData();
        const fileDetails = filesToProcess.map(fileData => {
            const { file, ...details } = fileData;
            if (file) {
                formData.append("files", file);
            }
            return details;
        });

        formData.append("file_details", JSON.stringify(fileDetails));
        formData.append("db_config", JSON.stringify(databaseConfig));

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;

            const response = await fetch(`${apiUrl}/ingest/`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Ingestion request failed");
            }

            // The API response is now typed as FileIngestionResult[]
            const resultData: { results: FileIngestionResult[] } = await response.json();
            const results = resultData.results;
            console.log("Ingestion API response:", results);

            // Update file statuses based on API response
            setFiles((prevFiles) => {
                const newFiles = [...prevFiles];
                results.forEach((result) => {
                    const fileIndex = newFiles.findIndex(f => f.name === result.fileName);
                    if (fileIndex !== -1) {
                        newFiles[fileIndex] = {
                            ...newFiles[fileIndex],
                            ingestionStatus: result.status,
                            // Map the API's ingestionDetails to our state type, adding mock times for now
                            ingestionDetails: result.ingestionDetails ? {
                                ...result.ingestionDetails,
                                startTime: new Date().toISOString(),
                                endTime: new Date().toISOString(),
                            } as IngestionDetails : null,
                            error: result.error || undefined, // Set to undefined if null
                        };
                    }
                });
                return newFiles;
            });

        } catch (error) {
            console.error("Ingestion API error:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setApiError(errorMessage);

            // Mark only the files that were part of this processing batch as failed
            setFiles((prevFiles) =>
                prevFiles.map((f) =>
                    f.ingestionStatus === "pending"
                        ? { ...f, ingestionStatus: "failed" as const, error: "API connection failed" }
                        : f
                )
            );
        } finally {
            setIsIngesting(false);
            setProgress(100);
            setTimeout(() => {
                // This can trigger auto-advance in a parent component
            }, 500);
        }
    }

    // Starts the initial ingestion for all selected files
    const startIngestion = async () => {
        setProgress(0);
        const filesToIngest = files.filter((f) => f.selected && f.processed);
        await handleIngestion(filesToIngest);
    }

    // Retries ingestion only for the files that previously failed
    const retryFailedIngestion = async () => {
        const failedFiles = files.filter((f) => f.ingestionStatus === "failed");
        await handleIngestion(failedFiles);
    }

    const toggleFileExpansion = (fileId: string) => {
        const newExpanded = new Set(expandedFiles)
        if (newExpanded.has(fileId)) {
            newExpanded.delete(fileId)
        } else {
            newExpanded.add(fileId)
        }
        setExpandedFiles(newExpanded)
    }

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case "success":
                return <Badge className="bg-green-500 text-white">✓ Success</Badge>
            case "failed":
                return <Badge variant="destructive">✗ Failed</Badge>
            case "pending":
                return <Badge className="bg-yellow-500 text-white">⏳ Processing</Badge>
            default:
                return <Badge variant="outline">Waiting</Badge>
        }
    }

    const successCount = selectedFiles.filter((f) => f.ingestionStatus === "success").length
    const failedCount = selectedFiles.filter((f) => f.ingestionStatus === "failed").length
    const pendingCount = selectedFiles.filter((f) => f.ingestionStatus === "pending").length
    const progressValue = selectedFiles.length > 0 ? (successCount + failedCount) / selectedFiles.length * 100 : progress;

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Step 5: Ingestion Process</h2>
                <p className="text-gray-600">Ingest selected files into configured databases</p>
            </div>

            {/* Ingestion Control */}
            <Card>
                <CardHeader>
                    <CardTitle>Ingestion Control</CardTitle>
                    <CardDescription>Ingest {selectedFiles.length} selected files into databases</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <Button
                            onClick={startIngestion}
                            disabled={isIngesting || selectedFiles.length === 0}
                            className="flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            {isIngesting ? "Ingesting..." : "Start Ingestion"}
                        </Button>
                        
                        {/* --- NEW: Retry Failed Button --- */}
                        {failedCount > 0 && !isIngesting && (
                            <Button
                                onClick={retryFailedIngestion}
                                disabled={isIngesting}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Retry {failedCount} Failed
                            </Button>
                        )}
                        {/* --- END NEW --- */}

                        <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                                <span>Progress</span>
                                <span>{Math.round(progressValue)}%</span>
                            </div>
                            <Progress value={progressValue} className="w-full" />
                        </div>
                    </div>

                    {apiError && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-medium">Error: {apiError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{successCount}</div>
                            <div className="text-sm text-gray-600">Successful</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                            <div className="text-sm text-gray-600">Failed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                            <div className="text-sm text-gray-600">Processing</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Ingestion Results */}
            <Card>
                <CardHeader>
                    <CardTitle>Ingestion Results</CardTitle>
                    <CardDescription>Detailed results for each file ingestion</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {selectedFiles.map((file) => (
                            <Collapsible key={file.id} open={expandedFiles.has(file.id)} onOpenChange={() => toggleFileExpansion(file.id)}>
                                <div className="border rounded-lg p-4">
                                    <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                                        <div className="flex items-center gap-3">
                                            {expandedFiles.has(file.id) ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                            <FileText className="w-4 h-4" />
                                            <span className="font-medium">{file.name}</span>
                                            <Badge variant="outline">{file.classification}</Badge>
                                            {getStatusBadge(file.ingestionStatus)}
                                        </div>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent className="mt-4 pl-7">
                                        {file.ingestionStatus === 'failed' && file.error && (
                                            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                                                <strong>Error:</strong> {file.error}
                                            </div>
                                        )}
                                        {file.ingestionDetails && (
                                            <div className="space-y-4">
                                                {file.ingestionDetails.type === "structured" && (
                                                    <div className="space-y-4">
                                                        {file.ingestionDetails.tables.map((table, index) => (
                                                            <div key={index} className="space-y-3 border-l-2 border-blue-500 pl-4">
                                                                <div className="flex items-center gap-2">
                                                                    <Table className="w-4 h-4 text-blue-500" />
                                                                    <h4 className="font-semibold">Table: {table.tableName}</h4>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                                    <div>
                                                                        <strong>Rows Inserted:</strong> {table.rowsInserted.toLocaleString()}
                                                                    </div>
                                                                    {/* NEW: Displaying schema details */}
                                                                    <div>
                                                                        <strong>Schema Details:</strong>
                                                                        <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono max-h-40 overflow-y-auto">
                                                                            {table.schema_details.map((schema, s_index) => (
                                                                                <div key={s_index}>
                                                                                    {schema.name} ({schema.type})
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <strong>SQL Commands:</strong>
                                                                    <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono space-y-2">
                                                                        {table.sqlCommands.map((cmd: string, idx: number) => (
                                                                            <div key={idx}>{cmd}</div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* UI for Semi-Structured and Unstructured remain the same */}

                                                <div className="text-xs text-gray-500 mt-4">
                                                    <div>Started: {new Date(file.ingestionDetails.startTime).toLocaleString()}</div>
                                                    <div>Completed: {new Date(file.ingestionDetails.endTime).toLocaleString()}</div>
                                                </div>
                                            </div>
                                        )}
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        ))}
                    </div>
                </CardContent>
            </Card>
            {!isIngesting && progress === 100 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Ingestion Complete!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                        {successCount} files ingested successfully. {failedCount > 0 && `${failedCount} files failed.`}
                    </p>
                </div>
            )}
        </div>
    )
}