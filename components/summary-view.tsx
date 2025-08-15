"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Download, FileText, ChevronDown, ChevronRight, Database, Table, BarChart3 } from "lucide-react"
import type { FileData, DatabaseConfig, StructuredIngestionDetails, SemiStructuredIngestionDetails, UnstructuredIngestionDetails } from "@/app/page"

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

type IngestionDetails = StructuredIngestionDetails | SemiStructuredIngestionDetails | UnstructuredIngestionDetails;

interface FileDataWithDetails extends Omit<FileData, 'ingestionDetails'> {
    ingestionDetails?: IngestionDetails | null;
}

interface SummaryViewProps {
    files: FileDataWithDetails[]
    databaseConfig: DatabaseConfig
}

export default function SummaryView({ files, databaseConfig }: SummaryViewProps) {
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
    const [reportFormat, setReportFormat] = useState<"pdf" | "json">("pdf")

    const processedFiles = files.filter((f) => f.processed)
    const selectedFiles = files.filter((f) => f.selected && f.processed)
    const successfulIngestions = selectedFiles.filter((f) => f.ingestionStatus === "success")
    const failedIngestions = selectedFiles.filter((f) => f.ingestionStatus === "failed")

    const structuredFiles = successfulIngestions.filter((f) => f.classification === "Structured")
    const semiStructuredFiles = successfulIngestions.filter((f) => f.classification === "Semi-Structured")
    const unstructuredFiles = successfulIngestions.filter((f) => f.classification === "Unstructured")

    const toggleFileExpansion = (fileId: string) => {
        const newExpanded = new Set(expandedFiles)
        if (newExpanded.has(fileId)) {
            newExpanded.delete(fileId)
        } else {
            newExpanded.add(fileId)
        }
        setExpandedFiles(newExpanded)
    }

    const exportReport = (format: "pdf" | "json") => {
        const reportData = {
            summary: {
                totalFiles: processedFiles.length,
                selectedFiles: selectedFiles.length,
                successfulIngestions: successfulIngestions.length,
                failedIngestions: failedIngestions.length,
                structuredFiles: structuredFiles.length,
                semiStructuredFiles: semiStructuredFiles.length,
                unstructuredFiles: unstructuredFiles.length,
            },
            databaseConfig,
            files: selectedFiles.map((file) => ({
                name: file.name,
                classification: file.classification,
                qualityMetrics: file.qualityMetrics,
                ingestionStatus: file.ingestionStatus,
                ingestionDetails: file.ingestionDetails,
            })),
            timestamp: new Date().toISOString(),
        }

        if (format === "json") {
            const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `data-loader-report-${new Date().toISOString().split("T")[0]}.json`
            a.click()
        } else {
            // Simulate PDF export
            alert("PDF report generation would be implemented with a PDF library like jsPDF or Puppeteer")
        }
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Step 6: Summary & Report</h2>
                <p className="text-gray-600">Comprehensive overview of the data loading process</p>
            </div>

            {/* Overall Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{processedFiles.length}</div>
                        <div className="text-sm text-gray-600">Files Processed</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{successfulIngestions.length}</div>
                        <div className="text-sm text-gray-600">Successful Ingestions</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{failedIngestions.length}</div>
                        <div className="text-sm text-gray-600">Failed Ingestions</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {Math.round((successfulIngestions.length / selectedFiles.length) * 100) || 0}%
                        </div>
                        <div className="text-sm text-gray-600">Success Rate</div>
                    </CardContent>
                </Card>
            </div>

            {/* Database Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Data Distribution by Type
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 border rounded-lg">
                            <Database className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <div className="text-xl font-bold">{structuredFiles.length}</div>
                            <div className="text-sm text-gray-600">Structured Files</div>
                            <div className="text-xs text-gray-500 mt-1">→ {databaseConfig.structured.type.toUpperCase()}</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <div className="flex justify-center mb-2">
                                <Database className="w-4 h-4 text-blue-500" />
                                <FileText className="w-4 h-4 text-purple-500 ml-1" />
                            </div>
                            <div className="text-xl font-bold">{semiStructuredFiles.length}</div>
                            <div className="text-sm text-gray-600">Semi-Structured</div>
                            <div className="text-xs text-gray-500 mt-1">→ Both Databases</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <FileText className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                            <div className="text-xl font-bold">{unstructuredFiles.length}</div>
                            <div className="text-sm text-gray-600">Unstructured Files</div>
                            <div className="text-xs text-gray-500 mt-1">→ {databaseConfig.unstructured.type.toUpperCase()}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed File Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Detailed File Summary</CardTitle>
                    <CardDescription>Comprehensive analysis and insights for each processed file</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {selectedFiles.map((file) => (
                            <Collapsible key={file.id}>
                                <div className="border rounded-lg p-4">
                                    <CollapsibleTrigger
                                        className="flex items-center justify-between w-full text-left"
                                        onClick={() => toggleFileExpansion(file.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {expandedFiles.has(file.id) ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                            <FileText className="w-4 h-4" />
                                            <span className="font-medium">{file.name}</span>
                                            <Badge variant="outline">{file.classification}</Badge>
                                            {file.ingestionStatus === "success" ? (
                                                <Badge className="bg-green-500">✓ Success</Badge>
                                            ) : (
                                                <Badge variant="destructive">✗ Failed</Badge>
                                            )}
                                        </div>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent className="mt-4">
                                        <div className="space-y-4 pl-7">
                                            {/* Quality Metrics */}
                                            {file.qualityMetrics && (
                                                <div>
                                                    <h4 className="font-semibold mb-2">Quality Assessment</h4>
                                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                                        <div className="p-2 border rounded">
                                                            <div className="font-medium">Parse Accuracy</div>
                                                            <div>{file.qualityMetrics.parseAccuracy}/3</div>
                                                        </div>
                                                        <div className="p-2 border rounded">
                                                            <div className="font-medium">Completeness</div>
                                                            <div>{file.qualityMetrics.completeness}/3</div>
                                                        </div>
                                                        <div className="p-2 border rounded">
                                                            <div className="font-medium">Complexity</div>
                                                            <div>{file.qualityMetrics.complexity}/3</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Ingestion Details (API Results) */}
                                            {file.ingestionDetails && file.ingestionStatus === "success" && (
                                                <div>
                                                    <h4 className="font-semibold mb-2">Ingestion Summary</h4>
                                                    {/* Render details based on ingestionDetails type from API */}
                                                    {file.ingestionDetails.type === "structured" && (
                                                        <div className="space-y-4">
                                                            {file.ingestionDetails.tables.map((table, index) => (
                                                                <div key={index} className="p-3 border rounded space-y-2">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <Table className="w-4 h-4 text-blue-500" />
                                                                        <span className="font-medium">Table: {table.tableName}</span>
                                                                    </div>
                                                                    <div>
                                                                        <strong>Rows Inserted:</strong> {table.rowsInserted.toLocaleString()}
                                                                    </div>
                                                                    <div>
                                                                        <strong>Schema Details:</strong>
                                                                        <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono max-h-40 overflow-y-auto">
                                                                            {table.schema_details.map((schema, s_index) => (
                                                                                <div key={s_index}>
                                                                                    {schema.name} ({schema.type})
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Add similar logic for "semi-structured" and "unstructured" if their API responses become available */}
                                                    {(file.ingestionDetails.type === "semi-structured" || file.ingestionDetails.type === "unstructured") && (
                                                        <div className="p-3 border rounded text-sm">
                                                            Details for {file.ingestionDetails.type} files are not available in this version.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Ingestion Failure Message */}
                                            {file.ingestionStatus === "failed" && file.error && (
                                                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                                                    <strong>Error:</strong> {file.error}
                                                </div>
                                            )}
                                        </div>
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="w-5 h-5" />
                        Export Report
                    </CardTitle>
                    <CardDescription>Generate a comprehensive report of the data loading process</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Button onClick={() => exportReport("pdf")} className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Export as PDF
                        </Button>
                        <Button variant="outline" onClick={() => exportReport("json")} className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Export as JSON
                        </Button>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                        <p>The report includes:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Complete processing statistics and success rates</li>
                            <li>Detailed quality metrics for each file</li>
                            <li>Database ingestion logs and schema information</li>
                            <li>Comprehensive data insights and business value analysis</li>
                            <li>Configuration details and connection information</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}