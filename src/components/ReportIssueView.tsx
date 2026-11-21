import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  AlertTriangle,
  AlignLeft,
  ArrowRight,
  Compass,
  Construction,
  Droplets,
  ExternalLink,
  FileText,
  Lightbulb,
  Loader2,
  LocateFixed,
  MapPin,
  Mic,
  MicOff,
  ShieldAlert,
  Sparkles,
  Tag,
  ThumbsUp,
  Trash2,
  Trees,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { DEMO_SAMPLE_REPORT } from "../data/seedIssues";
import { useImageUpload } from "../hooks/useImageUpload";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import {
  CHENNAI_SAMPLE_LOCATIONS,
  ISSUE_CATEGORIES,
  type CivicIssue,
  type IssueCategory,
} from "../types/civic";
import { analyzeIssue, autoDraftFromPhoto, formatVoiceTranscript } from "../utils/api";
import { findPotentialDuplicates } from "../utils/civicHelpers";
import { readBlobAsDataUrl } from "../utils/image";
import {
  FOCUS_RING_CLASS,
  buildGoogleMapsSearchUrl,
} from "./Badges";
import { HowItWorksStrip } from "./HowItWorksGuide";
import { TriageResultCard } from "./report/TriageResultCard";
import { TriageStepper } from "./report/TriageStepper";

interface ReportIssueViewProps {
  existingIssues?: CivicIssue[];
  upvotedIds?: Record<string, boolean>;
  onUpvoteIssue?: (issueId: string) => Promise<void>;
  onIssueCreated: (issue: CivicIssue) => void;
  onNavigateToTracker: (highlightId?: string) => void;
  onNotify?: (message: string) => void;
}

type VoiceLanguage = "en-IN" | "ta-IN";

const CATEGORY_CHIPS: Array<{
  category: IssueCategory;
  shortLabel: string;
  icon: typeof Construction;
}> = [
  { category: "Roads & Potholes", shortLabel: "Roads", icon: Construction },
  { category: "Sanitation & Garbage", shortLabel: "Sanitation", icon: Trash2 },
  { category: "Streetlights & Electricity", shortLabel: "Streetlights", icon: Lightbulb },
  { category: "Water Supply & Drainage", shortLabel: "Water", icon: Droplets },
  { category: "Parks & Public Spaces", shortLabel: "Parks", icon: Trees },
  { category: "Traffic & Public Safety", shortLabel: "Safety", icon: ShieldAlert },
];

const GLASS_INPUT_BASE =
  "w-full rounded-xl bg-slate-950/40 backdrop-blur-md border border-white/15 py-2.5 text-sm text-white placeholder-slate-400 focus:bg-slate-950/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors";
const glassIconInputClass = `${GLASS_INPUT_BASE} pl-10 pr-3.5`;

const GPS_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 8000 };

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function ReportIssueView({
  existingIssues = [],
  upvotedIds = {},
  onUpvoteIssue,
  onIssueCreated,
  onNavigateToTracker,
  onNotify,
}: ReportIssueViewProps) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [gpsCoords, setGpsCoords] = useState<string | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [selectedSampleLoc, setSelectedSampleLoc] = useState("");
  const [description, setDescription] = useState("");
  const [categoryOverride, setCategoryOverride] = useState<IssueCategory | "">("");

  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>("en-IN");
  const [isFormattingVoice, setIsFormattingVoice] = useState(false);
  const [showVoiceFallback, setShowVoiceFallback] = useState(false);
  const [voiceFallbackText, setVoiceFallbackText] = useState("");
  const [voiceHintMsg, setVoiceHintMsg] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoDrafting, setIsAutoDrafting] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [upvotingDuplicateId, setUpvotingDuplicateId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [triageResult, setTriageResult] = useState<CivicIssue | null>(null);

  const {
    image,
    setImage,
    isDragging: isDraggingFile,
    fileInputRef,
    handleFileChange: handleImageFileChange,
    dropZoneHandlers,
    clear: clearImage,
  } = useImageUpload(setErrorMsg);

  const imagePreviewUrl = image?.dataUrl ?? null;
  const imageBase64 = image?.dataUrl ?? null;
  const imageMimeType = image?.mimeType ?? null;
  const imageFileName = image?.fileName ?? null;

  const potentialDuplicates = useMemo(
    () => findPotentialDuplicates(title, location, existingIssues),
    [title, location, existingIssues]
  );

  const handleSampleLocationChange = (value: string) => {
    setSelectedSampleLoc(value);
    setGpsCoords(null);
    if (value) setLocation(value);
  };

  const handleUseCurrentGps = () => {
    setErrorMsg(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrorMsg(
        "Geolocation is not supported in this browser. Please select a sample Chennai location or type an address."
      );
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordString = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
        setGpsCoords(coordString);
        setLocation(`${coordString} (Chennai GPS)`);
        setSelectedSampleLoc("");
        setIsLocatingGps(false);
      },
      (geoError) => {
        setIsLocatingGps(false);
        setErrorMsg(
          geoError.code === 1
            ? "Location permission denied. Please enable GPS access or type your street landmark."
            : "Unable to acquire GPS coordinates right now. Please enter a street landmark."
        );
      },
      GPS_OPTIONS
    );
  };

  const formatTranscriptWithGemini = useCallback(
    async (transcript: string) => {
      const cleaned = transcript.trim();
      if (!cleaned) return;

      setIsFormattingVoice(true);
      setErrorMsg(null);
      setVoiceHintMsg(null);

      try {
        const data = await formatVoiceTranscript({ transcript: cleaned, language: voiceLanguage });
        if (typeof data.title === "string") setTitle(data.title);
        if (typeof data.description === "string") setDescription(data.description);
        if (ISSUE_CATEGORIES.includes(data.suggestedCategory)) {
          setCategoryOverride(data.suggestedCategory);
        }
        setVoiceHintMsg(
          `Voice complaint formatted (${data.suggestedCategory} · ${data.suggestedPriority} priority).`
        );
        setShowVoiceFallback(false);
        setVoiceFallbackText("");
      } catch (err: unknown) {
        setErrorMsg(errorMessage(err, "Unable to format spoken complaint with AI."));
      } finally {
        setIsFormattingVoice(false);
      }
    },
    [voiceLanguage]
  );

  const { isListening: isListeningVoice, toggle: toggleVoiceRecognition } = useSpeechRecognition({
    language: voiceLanguage,
    onTranscript: (transcript) => void formatTranscriptWithGemini(transcript),
    onError: () => {
      setShowVoiceFallback(true);
      setVoiceHintMsg(
        "Microphone speech recognition could not capture audio. You can type or paste casual English/Tamil notes below to format with AI."
      );
    },
  });

  const handleVoiceReportClick = () => {
    setErrorMsg(null);
    setVoiceHintMsg(null);
    // Browsers without the Web Speech API get a typed-input fallback instead.
    if (!toggleVoiceRecognition()) {
      setShowVoiceFallback((prev) => !prev);
    }
  };

  const handleAutoDraftFromPhoto = async () => {
    if (!imageBase64 || !imageMimeType) {
      setErrorMsg("Please upload a photograph first to auto-draft details with AI.");
      return;
    }

    setErrorMsg(null);
    setIsAutoDrafting(true);
    try {
      const data = await autoDraftFromPhoto({ imageBase64, imageMimeType });
      if (typeof data.title === "string") setTitle(data.title);
      if (typeof data.description === "string") setDescription(data.description);
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, "Unable to auto-draft details from photo right now."));
    } finally {
      setIsAutoDrafting(false);
    }
  };

  const handleUpvoteDuplicate = async (issueId: string) => {
    if (!onUpvoteIssue) return;
    setUpvotingDuplicateId(issueId);
    try {
      await onUpvoteIssue(issueId);
    } catch {
      // The parent surfaces failures; the duplicate card simply stays un-upvoted.
    } finally {
      setUpvotingDuplicateId(null);
    }
  };

  const handleDemoSampleFill = async () => {
    setErrorMsg(null);
    setTriageResult(null);
    setGpsCoords(null);
    setIsLoadingDemo(true);

    setTitle(DEMO_SAMPLE_REPORT.title);
    setLocation(DEMO_SAMPLE_REPORT.location);
    setSelectedSampleLoc(DEMO_SAMPLE_REPORT.location);
    setDescription(DEMO_SAMPLE_REPORT.description);
    setCategoryOverride("");

    try {
      const response = await fetch(DEMO_SAMPLE_REPORT.sampleImageUrl);
      if (response.ok) {
        const blob = await response.blob();
        setImage({
          dataUrl: await readBlobAsDataUrl(blob),
          mimeType: blob.type || "image/webp",
          fileName: "mylapore_crosswalk_drain_collapse.webp",
        });
      }
    } catch {
      // Keep the pre-filled text fields if the sample photo is unavailable.
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleResetForm = () => {
    setTitle("");
    setLocation("");
    setGpsCoords(null);
    setSelectedSampleLoc("");
    setDescription("");
    setCategoryOverride("");
    setVoiceHintMsg(null);
    setShowVoiceFallback(false);
    setVoiceFallbackText("");
    clearImage();
    setErrorMsg(null);
    setTriageResult(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !location.trim() || !description.trim()) {
      setErrorMsg("Please fill in Issue Title, Location, and Detailed Description.");
      return;
    }

    setIsSubmitting(true);
    try {
      const createdIssue = await analyzeIssue({
        title: title.trim(),
        location: location.trim(),
        description: description.trim(),
        categoryOverride,
        imageBase64,
        imageMimeType,
      });
      setTriageResult(createdIssue);
      onIssueCreated(createdIssue);
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, "Unable to complete AI triage right now. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="report-heading" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-6">
        <div className="max-w-2xl">
          <h1
            id="report-heading"
            className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-100 to-blue-400 bg-clip-text text-transparent"
          >
            Report a Civic Issue
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-300 leading-relaxed">
            Submit street-level infrastructure, sanitation, or safety complaints in Chennai.
            Multimodal AI triage routes each report to the responsible municipal department.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDemoSampleFill}
          disabled={isLoadingDemo || isSubmitting}
          className={`inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 backdrop-blur-md border border-amber-400/35 px-4 py-2.5 text-sm font-semibold text-amber-100 shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 ${FOCUS_RING_CLASS}`}
        >
          {isLoadingDemo ? (
            <Loader2 className="h-4 w-4 animate-spin text-amber-300" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
          )}
          <span>Demo Sample Fill</span>
        </button>
      </div>

      {/* Compact 4-Step Horizontal Glass Strip */}
      <HowItWorksStrip />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Complaint Submission Glass Card */}
        <form
          onSubmit={handleSubmit}
          aria-labelledby="complaint-form-title"
          className="lg:col-span-7 bg-slate-950/35 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-6 sm:p-7 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <h2
              id="complaint-form-title"
              className="text-base font-semibold text-slate-100"
            >
              Citizen Complaint Details
            </h2>
            {(title || description || location || imagePreviewUrl) && (
              <button
                type="button"
                onClick={handleResetForm}
                disabled={isSubmitting || isAutoDrafting || isFormattingVoice}
                className={`text-xs font-medium text-slate-300 hover:text-white transition-colors rounded-md px-2 py-1 cursor-pointer ${FOCUS_RING_CLASS}`}
              >
                Clear form
              </button>
            )}
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-400/50 bg-red-500/20 backdrop-blur-sm px-4 py-3 text-sm text-red-100"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-300" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="issue-title"
              className="block text-sm font-medium text-slate-200 mb-1.5"
            >
              Issue Title <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <FileText
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="issue-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Deep pothole flooding near Anna Nagar Roundtana"
                required
                maxLength={160}
                className={glassIconInputClass}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sample-location"
                  className="block text-sm font-medium text-slate-200 mb-1.5"
                >
                  Use Sample Chennai Location
                </label>
                <div className="relative">
                  <Compass
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <select
                    id="sample-location"
                    value={selectedSampleLoc}
                    onChange={(e) => handleSampleLocationChange(e.target.value)}
                    className={glassIconInputClass}
                  >
                    <option value="">Select a sample Chennai spot...</option>
                    {CHENNAI_SAMPLE_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="issue-location"
                    className="block text-sm font-medium text-slate-200"
                  >
                    Location / Street Landmark <span className="text-amber-400">*</span>
                  </label>
                </div>
                <div className="relative">
                  <MapPin
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="issue-location"
                    type="text"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setGpsCoords(null);
                    }}
                    placeholder="Enter street, ward, or landmark in Chennai"
                    required
                    maxLength={200}
                    className={glassIconInputClass}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleUseCurrentGps}
                disabled={isLocatingGps}
                className={`inline-flex items-center gap-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/35 px-3 py-1.5 text-xs font-medium text-blue-200 hover:text-white transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60 ${FOCUS_RING_CLASS}`}
              >
                {isLocatingGps ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {isLocatingGps ? "Capturing GPS..." : "Use Current GPS Location"}
                </span>
              </button>

              {gpsCoords && (
                <a
                  href={buildGoogleMapsSearchUrl(gpsCoords)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-xs font-medium text-emerald-300 hover:text-emerald-200 underline ${FOCUS_RING_CLASS}`}
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  <span>GPS Pin: {gpsCoords} (Open in Google Maps)</span>
                </a>
              )}
            </div>
          </div>

          {/* Duplicate Issue Alert Banner */}
          {potentialDuplicates.length > 0 && !triageResult && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-amber-400/40 bg-amber-950/40 backdrop-blur-md p-4 space-y-2.5"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className="h-4 w-4 text-amber-400 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div className="text-xs text-amber-100">
                  <span className="font-semibold">Similar issue already reported nearby:</span>{" "}
                  Confirming an existing complaint helps departments prioritize faster without
                  creating duplicate tickets.
                </div>
              </div>
              <div className="space-y-2">
                {potentialDuplicates.map((dup) => {
                  const hasUpvoted = Boolean(upvotedIds[dup.id]);
                  return (
                    <div
                      key={dup.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 px-3 py-2 text-xs transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-100 truncate">
                          <span className="font-mono text-blue-300 mr-1.5">{dup.id}</span>
                          {dup.title}
                        </div>
                        <div className="text-slate-300 truncate">{dup.location}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {onUpvoteIssue && (
                          <button
                            type="button"
                            disabled={hasUpvoted || upvotingDuplicateId === dup.id}
                            onClick={() => void handleUpvoteDuplicate(dup.id)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:cursor-default ${FOCUS_RING_CLASS} ${
                              hasUpvoted
                                ? "bg-emerald-500/20 border-emerald-400/45 text-emerald-200"
                                : "bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/40 text-amber-100"
                            }`}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {hasUpvoted ? "Confirmed" : "Upvote Existing"} ({dup.upvotes})
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onNavigateToTracker(dup.id)}
                          className={`rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white whitespace-nowrap cursor-pointer ${FOCUS_RING_CLASS}`}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="issue-description"
                className="block text-sm font-medium text-slate-200"
              >
                Detailed Description <span className="text-amber-400">*</span>
              </label>

              <div className="flex items-center gap-2">
                <label htmlFor="voice-language" className="sr-only">
                  Voice Report Language
                </label>
                <select
                  id="voice-language"
                  value={voiceLanguage}
                  onChange={(e) => setVoiceLanguage(e.target.value as "en-IN" | "ta-IN")}
                  aria-label="Voice Report Language"
                  className="rounded-lg bg-slate-950/40 backdrop-blur-md border border-white/15 px-2.5 py-1 text-xs text-white focus:bg-slate-950/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                >
                  <option value="en-IN">English (India)</option>
                  <option value="ta-IN">Tamil (தமிழ்)</option>
                </select>

                <button
                  type="button"
                  onClick={handleVoiceReportClick}
                  disabled={isFormattingVoice || isSubmitting}
                  aria-pressed={isListeningVoice}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer disabled:opacity-50 ${FOCUS_RING_CLASS} ${
                    isListeningVoice
                      ? "bg-red-500/25 border-red-400/60 text-red-100 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                      : "bg-blue-500/15 hover:bg-blue-500/25 border-blue-400/35 text-blue-100"
                  }`}
                >
                  {isFormattingVoice ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-300" aria-hidden="true" />
                      <span>Formatting Speech...</span>
                    </>
                  ) : isListeningVoice ? (
                    <>
                      <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Stop Listening</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" />
                      <span>Voice Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {showVoiceFallback && (
              <div className="rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-3.5 space-y-2">
                <label
                  htmlFor="voice-fallback-input"
                  className="block text-xs font-medium text-slate-200"
                >
                  Speech Transcript Input (English, Tamil, or Tanglish mix)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="voice-fallback-input"
                    type="text"
                    value={voiceFallbackText}
                    onChange={(e) => setVoiceFallbackText(e.target.value)}
                    placeholder="e.g., Anna Nagar 2nd avenue la big pothole irukku, water fulla nikuthu..."
                    className="flex-1 rounded-lg bg-slate-950/40 backdrop-blur-md border border-white/15 px-3 py-2 text-xs text-white placeholder-slate-400 focus:bg-slate-950/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    disabled={isFormattingVoice || !voiceFallbackText.trim()}
                    onClick={() => void formatTranscriptWithGemini(voiceFallbackText)}
                    className={`rounded-lg bg-blue-500/25 hover:bg-blue-500/35 border border-blue-400/45 px-3 py-2 text-xs font-semibold text-blue-100 whitespace-nowrap cursor-pointer disabled:opacity-50 ${FOCUS_RING_CLASS}`}
                  >
                    Format with AI
                  </button>
                </div>
              </div>
            )}

            {voiceHintMsg && (
              <div
                aria-live="polite"
                className="rounded-lg bg-blue-500/15 border border-blue-400/35 px-3 py-2 text-xs text-blue-100 leading-relaxed"
              >
                {voiceHintMsg}
              </div>
            )}

            <div className="relative">
              <AlignLeft
                className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <textarea
                id="issue-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the severity, safety hazards to pedestrians or motorists, and exact site conditions..."
                required
                maxLength={2000}
                className="w-full rounded-xl bg-slate-950/40 backdrop-blur-md border border-white/15 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-400 leading-relaxed focus:bg-slate-950/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <label
              htmlFor="category-override"
              className="block text-sm font-medium text-slate-200"
            >
              Optional Category Override
            </label>

            {/* Clickable Visual Category Chips synced with select */}
            <div
              role="group"
              aria-label="Quick category selection chips"
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              {CATEGORY_CHIPS.map(({ category, shortLabel, icon: Icon }) => {
                const isSelected = categoryOverride === category;
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      setCategoryOverride(isSelected ? "" : category)
                    }
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${FOCUS_RING_CLASS} ${
                      isSelected
                        ? "bg-blue-500/25 border-blue-400/60 text-white shadow-[0_0_14px_rgba(59,130,246,0.28)]"
                        : "bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border-white/10 text-slate-300 hover:text-white hover:border-blue-400/35"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isSelected ? "text-blue-300" : "text-slate-400"
                      }`}
                      aria-hidden="true"
                    />
                    <span>{shortLabel}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Tag
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <select
                id="category-override"
                value={categoryOverride}
                onChange={(e) => setCategoryOverride(e.target.value as IssueCategory | "")}
                className={glassIconInputClass}
              >
                <option value="">Auto-detect with AI (Recommended)</option>
                {ISSUE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="issue-photo-upload"
                className="block text-sm font-medium text-slate-200"
              >
                Photo Evidence (Optional, enables Visual AI Inspection)
              </label>

              <button
                type="button"
                onClick={() => void handleAutoDraftFromPhoto()}
                disabled={!imageBase64 || isAutoDrafting || isSubmitting}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING_CLASS} ${
                  imageBase64
                    ? "bg-blue-500/25 hover:bg-blue-500/35 border-blue-400/50 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                    : "bg-white/[0.04] border-white/10 text-slate-400"
                }`}
              >
                {isAutoDrafting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>Drafting from photo...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Auto-Draft Details with AI</span>
                  </>
                )}
              </button>
            </div>

            {!imagePreviewUrl ? (
              <label
                htmlFor="issue-photo-upload"
                {...dropZoneHandlers}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-7 text-center backdrop-blur-md transition-all duration-200 cursor-pointer ${FOCUS_RING_CLASS} ${
                  isDraggingFile
                    ? "border-blue-400 bg-blue-500/15"
                    : "border-white/20 bg-slate-950/40 hover:border-blue-400/60 hover:bg-white/[0.06]"
                }`}
              >
                <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-300">
                  <Upload className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-slate-100">
                  Drag &amp; drop a site photo or click to browse
                </span>
                <span className="mt-1 text-xs text-slate-300">
                  PNG, JPG, or WEBP up to 10 MB · Then click Auto-Draft Details with AI
                </span>
                <input
                  ref={fileInputRef}
                  id="issue-photo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImageFileChange}
                  className="sr-only"
                />
              </label>
            ) : (
              <div className="rounded-xl border border-white/15 overflow-hidden bg-slate-950/40 backdrop-blur-md">
                <div className="relative">
                  <img
                    src={imagePreviewUrl}
                    alt={`Uploaded site evidence preview for ${title || "civic complaint"}`}
                    className="h-56 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    aria-label="Remove uploaded image"
                    className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-slate-950/75 backdrop-blur-md border border-white/20 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-950 transition-colors cursor-pointer ${FOCUS_RING_CLASS}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Remove</span>
                  </button>
                </div>
                {imageFileName && (
                  <div className="px-3.5 py-2 text-xs text-slate-300 border-t border-white/10 truncate">
                    Attached: {imageFileName}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isAutoDrafting || isFormattingVoice}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 border border-blue-300/40 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(59,130,246,0.38)] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${FOCUS_RING_CLASS}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Analyzing Complaint &amp; Visual Evidence...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  <span>Submit &amp; Analyze with AI</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Panel: live AI triage result, or the "how it works" stepper */}
        <div className="lg:col-span-5" aria-live="polite" aria-atomic="true">
          {triageResult ? (
            <TriageResultCard
              issue={triageResult}
              onViewInTracker={onNavigateToTracker}
              onReset={handleResetForm}
              onCopied={(message) => onNotify?.(message)}
            />
          ) : (
            <TriageStepper />
          )}
        </div>
      </div>
    </section>
  );
}
