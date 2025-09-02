"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  FolderOpen, 
  FileText, 
  Database, 
  CheckCircle, 
  Download, 
  Filter, 
  ArrowRight, 
  ArrowLeft,
  UploadCloud // New icon for the upload step
} from "lucide-react"
import FolderSelection from "@/components/folder-selection"
import FileProcessing from "@/components/file-processing"
import FileSelectionForIngestion from "@/components/file-selection-ingestion"
import DatabaseConfiguration from "@/components/database-configuration"
import IngestionProcess from "@/components/ingestion-process"
import SummaryView from "@/components/summary-view"

// --- Type Definitions ---
export type AnalysisData = {
    file_name?: string | null;
    content_type?: string | null;
    domain?: string | null;
    subdomain?: string | null;
    intents?: string | string[] | null;
    publishing_authority?: string | null;
    published_date?: string | null;
    period_of_reference?: string | null;
    brief_summary?: string | null;
    document_size?: string | null;
    extra_fields?: Record<string, any>;
    error?: string | null;
};


export type FileData = {
  id: string
  name: string
  path: string
  size: number
  type: string
  selected: boolean
  processed: boolean
  file?: File 
  uploaded?: boolean // New: Track upload status per file
  qualityMetrics?: {
    parseAccuracy: number
    complexity: number
  }
  classification?: "Structured" | "Semi-Structured" | "Unstructured"
  ingestionStatus?: "pending" | "success" | "failed"
  ingestionDetails?: IngestionDetails
  analysis?: AnalysisData; 
}

export type ColumnSchema = {
    name: string;
    type: string;
    primary?: boolean;
};

export type TableDetails = {
    tableName: string;
    schema_details: ColumnSchema[];
    rowsInserted: number;
    sqlCommands: string[];
    fileSelectorPrompt?: string;
};

export type StructuredIngestionDetails = {
    type: "structured";
    tables: TableDetails[];
};

export type UnstructuredIngestionDetails = {
    type: "unstructured";
    collection: string;
    chunksCreated: number;
    embeddingsGenerated: number;
    chunkingMethod: string;
    embeddingModel: string;
};

export type IngestionDetails = (StructuredIngestionDetails | UnstructuredIngestionDetails) & {
    startTime: string;
    endTime: string;
};

export type FileIngestionResult = {
    fileName: string;
    fileSize: number;
    status: "success" | "failed";
    ingestionDetails: IngestionDetails | IngestionDetails[] | null;
    error: string | null;
};


export type DatabaseConfig = {
  structured: {
    type: "postgresql" | "mysql"
    host: string
    port: number
    database: string
    username: string
    password: string
  }
  unstructured: {
    type: "milvus" | "qdrant"
    host: string
    port: number
    collection: string
    apiKey?: string
  }
}

// --- New FileUpload Component ---
// This component handles the new "Upload Files" step.
const FileUpload = ({ files, setFiles, setUploadStatus }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFilesToUpload = files.filter(f => f.selected && !f.uploaded);

  const handleUpload = async () => {
    if (selectedFilesToUpload.length === 0) {
      setUploadStatus('success'); // Nothing to upload, can proceed.
      return;
    }

    const formData = new FormData();
    selectedFilesToUpload.forEach(fileData => {
      if (fileData.file) {
        formData.append('files', fileData.file, fileData.name);
      }
    });

    setIsUploading(true);
    setError(null);
    setUploadStatus('uploading');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      console.log(apiUrl);
      const response = await fetch(`${apiUrl}/upload-files/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);

      const uploadedFiles = result.files || [];

      setFiles(prevFiles =>
        prevFiles.map(f => {
          const uploaded = uploadedFiles.find(uf => uf.name === f.name);
          if (uploaded) {
            return {
              ...f,
              uploaded: true,
              path: uploaded.path  // ✅ save backend file path
            };
          }
          return f;
        })
      );


      setUploadStatus('success');
    } catch (err) {
      console.error("File upload failed:", err);
      setError(err.message);
      setUploadStatus('failed');
    } finally {
      setIsUploading(false);
    }
  };
  
  const allSelectedFilesUploaded = files.filter(f => f.selected).every(f => f.uploaded);

  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Upload Files for Processing</h2>
      <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
        The files you selected will now be uploaded to a secure server. This is a prerequisite for further analysis and processing.
      </p>

      {selectedFilesToUpload.length > 0 ? (
        <div className="mb-6 text-left max-w-md mx-auto bg-gray-50 p-4 rounded-lg border">
          <h3 className="font-semibold mb-2 text-gray-700">Files to be uploaded:</h3>
          <ul className="space-y-2">
            {selectedFilesToUpload.map(file => (
              <li key={file.id} className="flex items-center gap-2 text-sm text-gray-600">
                <FileText size={16} className="text-gray-500" />
                <span>{file.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
         <div className="mb-6 text-center max-w-md mx-auto bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-center gap-2">
                <CheckCircle size={20} className="text-green-600" />
                <p className="font-semibold text-green-700">All selected files have been uploaded.</p>
            </div>
        </div>
      )}

      <Button onClick={handleUpload} disabled={isUploading || allSelectedFilesUploaded} size="lg">
        {isUploading ? "Uploading..." : "Start Upload"}
      </Button>

      {error && <p className="text-red-500 mt-4">Upload failed: {error}</p>}
    </div>
  );
};


// --- Updated Steps Configuration ---
const steps = [
  { id: 1, title: "Folder Selection", icon: FolderOpen },
  { id: 2, title: "Upload Files", icon: UploadCloud }, // New step
  { id: 3, title: "File Processing", icon: FileText },
  { id: 4, title: "File Selection", icon: Filter },
  { id: 5, title: "Ingestion", icon: ArrowRight },
  { id: 6, title: "Summary", icon: CheckCircle },
]

export default function DataLoaderAutomation() {
  const [currentStep, setCurrentStep] = useState(1)
  const [files, setFiles] = useState<FileData[]>([])
  const [databaseConfig, setDatabaseConfig] = useState<DatabaseConfig>({
    structured: { type: "postgresql", host: "localhost", port: 5432, database: "dataloader", username: "postgres", password: "" },
    unstructured: { type: "milvus", host: "localhost", port: 19530, collection: "documents" },
  })
  const [processingProgress, setProcessingProgress] = useState(0)
  const [ingestionProgress, setIngestionProgress] = useState(0)
  // New state to track the status of the upload step
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'failed'>('idle');


  const nextStep = () => {
    // Total steps is now 7
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Logic to enable/disable the "Next" button
  const canProceed = () => {
    switch (currentStep) {
      case 1: // Folder Selection
        return files.some(f => f.selected); // Can proceed if at least one file is selected
      case 2: // Upload Files (New)
        return uploadStatus === 'success';
      case 3: // File Processing
        return files.filter((f) => f.selected).every((f) => f.processed);
      case 4: // File Selection
        return files.some((f) => f.selected);
      case 5: // Database Config
        return true; 
      case 6: // Ingestion
        return files.filter((f) => f.selected).some((f) => f.ingestionStatus === "success");
      default:
        return true;
    }
  }

  
  // Reset upload status when returning to step 1
  useEffect(() => {
    if (currentStep === 1) {
        setUploadStatus('idle');
        // Optionally reset 'uploaded' flag on files if you want re-uploads
        // setFiles(prev => prev.map(f => ({...f, uploaded: false})));
    }
  }, [currentStep]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Data Loader Automation</h1>
          <p className="text-lg text-gray-600">Automated file processing and database ingestion pipeline</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id

              return (
                <div key={step.id} className={`flex items-center ${index === steps.length - 1 ? '' : 'flex-1'}`}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                        isActive ? "bg-blue-600 border-blue-600 text-white" : 
                        isCompleted ? "bg-green-600 border-green-600 text-white" : 
                        "bg-white border-gray-300 text-gray-400"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className={`text-xs mt-2 text-center ${
                        isActive ? "text-blue-600 font-semibold" : 
                        isCompleted ? "text-green-600" : 
                        "text-gray-500"
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 transition-all ${isCompleted ? "bg-green-600" : "bg-gray-300"}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8 min-h-[400px] flex items-center justify-center">
          <CardContent className="p-6 w-full">
            {currentStep === 1 && <FolderSelection files={files} setFiles={setFiles} />}
            {currentStep === 2 && <FileUpload files={files} setFiles={setFiles} setUploadStatus={setUploadStatus} />}
            {currentStep === 3 && (
              <FileProcessing
                files={files}
                setFiles={setFiles}
                progress={processingProgress}
                setProgress={setProcessingProgress}
              />
            )}
            {currentStep === 4 && <FileSelectionForIngestion files={files} setFiles={setFiles} />}
            {currentStep === 5 && (
              <IngestionProcess
                files={files}
                setFiles={setFiles}
                databaseConfig={databaseConfig}
                progress={ingestionProgress}
                setProgress={setIngestionProgress}
              />
            )}
            {currentStep === 6 && <SummaryView files={files} databaseConfig={databaseConfig} />}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2 bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>

          {currentStep < 7 ? (
            <Button onClick={nextStep} disabled={!canProceed()} className="flex items-center gap-2">
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="default" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
