import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Camera,
  GraduationCap,
  HelpCircle,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  RotateCcw,
  Share2,
} from 'lucide-react';
import {
  parseGeometryJSON,
  verifyPyramidMath,
  type MathVerificationReport,
  type ParsedGeometry,
} from './geometry/parseGeometry';
import type {
  DesignerRenderState,
  HighlightPairMode,
  SectionDisplayMode,
} from './geometry/buildPyramid';
import type {
  EdgeOcclusionDetail,
  EdgeVisibilityClassification,
} from './geometry/visibility';
import {
  GeometryViewer,
  type CameraPreset,
  type GeometryViewerHandle,
} from './components/GeometryViewer';
import { GeometryControls } from './components/GeometryControls';
import {
  ChallengePanel,
  type LabTab,
  type StudioMode,
} from './components/ChallengePanel';
import { ARViewer } from './components/ARViewer';
import { ShareModal } from './components/ShareModal';
import { HelpModal } from './components/HelpModal';
import { WowAnimationBar } from './components/WowAnimationBar';

const MODEL_URL = '/models/Hinh_chop_SABCD_trung_diem_MNP.json';

function buildDefaultPredictions(
  geometry: ParsedGeometry | null,
): Record<string, EdgeVisibilityClassification> {
  if (!geometry) return {};
  const map: Record<string, EdgeVisibilityClassification> = {};
  for (const edge of geometry.edges) {
    map[edge.id] = 'visible';
  }
  return map;
}

export default function App() {
  const [geometry, setGeometry] = useState<ParsedGeometry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [mode, setMode] = useState<StudioMode>('student');
  const [activeTab, setActiveTab] = useState<LabTab>('discovery');
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [progressiveSectionStep, setProgressiveSectionStep] = useState<number>(3);

  // Plane Explorer & Layer State
  const [showBase, setShowBase] = useState(true);
  const [baseOpacity, setBaseOpacity] = useState(0.26);
  const [showSection, setShowSection] = useState(true);
  const [sectionOpacity, setSectionOpacity] = useState(0.32);
  const [sectionDisplayMode, setSectionDisplayMode] =
    useState<SectionDisplayMode>('triangle');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [showPlaneLabels, setShowPlaneLabels] = useState(false);

  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [autoHiddenLines, setAutoHiddenLines] = useState(true);
  const [showHiddenEdges, setShowHiddenEdges] = useState(true);
  const [isOrthoBaseActive, setIsOrthoBaseActive] = useState(false);

  // Discovery Step 2 & Step 3 Interactive Highlights
  const [selectedMidpoint, setSelectedMidpoint] = useState<'M' | 'N' | 'P' | null>(null);
  const [highlightPair, setHighlightPair] = useState<HighlightPairMode>('none');

  // WOW Theorem Animation (16 seconds, 7 stages)
  const [wowActive, setWowActive] = useState(false);
  const [wowStage, setWowStage] = useState(1);
  const [wowDrawProgress, setWowDrawProgress] = useState(1);
  const [wowConclusionRevealed, setWowConclusionRevealed] = useState(false);

  // Designer Challenge Mode ("EM LÀ NHÀ THIẾT KẾ HÌNH HỌC")
  const [designerActive, setDesignerActive] = useState(false);
  const [designerChecked, setDesignerChecked] = useState(false);
  const [designerPredictions, setDesignerPredictions] = useState<
    Record<string, EdgeVisibilityClassification>
  >({});
  const [designerOcclusionResults, setDesignerOcclusionResults] = useState<
    Record<string, EdgeOcclusionDetail> | null
  >(null);

  // Modals & Fullscreen & AR
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isARModalOpen, setIsARModalOpen] = useState(false);
  const [isWebXRActive, setIsWebXRActive] = useState(false);
  const [arError, setArError] = useState<string | null>(null);

  const viewerRef = useRef<GeometryViewerHandle | null>(null);
  const stageSectionRef = useRef<HTMLElement | null>(null);

  const loadModel = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setGeometry(null);
    try {
      const response = await fetch(MODEL_URL, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Không thể tải tệp dữ liệu hình học (HTTP ${response.status}).`);
      }
      const rawJson: unknown = await response.json();
      const parsed = parseGeometryJSON(rawJson);
      const report = verifyPyramidMath(parsed);
      if (!report.allPassed) {
        throw new Error(`Kiểm tra toán học thất bại: ${report.failures.join(' ')}`);
      }
      setGeometry(parsed);
      setDesignerPredictions(buildDefaultPredictions(parsed));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi đọc và kiểm tra dữ liệu hình học 3D.';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModel();
  }, [loadModel]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  // WOW 16-second Choreographed Animation Loop (strictly preserves vertex coordinates)
  useEffect(() => {
    if (!wowActive) return;
    if (wowStage >= 7) return;

    const startTime = performance.now();
    let rafId = 0;
    let movedToSide = false;

    setShowBase(true);
    setBaseOpacity(0.32);
    setShowSection(false);
    setProgressiveSectionStep(3);
    setComparisonMode(false);
    setSelectedMidpoint(null);
    setHighlightPair('none');
    setAutoRotate(false);
    setIsOrthoBaseActive(false);
    setDesignerActive(false);
    viewerRef.current?.setCameraPreset('default');

    const tick = (now: number) => {
      const elapsedSec = (now - startTime) / 1000;

      if (elapsedSec < 2.4) {
        setWowStage(1);
        setShowBase(true);
        setShowSection(false);
        setWowDrawProgress(0);
      } else if (elapsedSec < 4.8) {
        setWowStage(2);
        setSelectedMidpoint('N');
        setWowDrawProgress(0);
      } else if (elapsedSec < 7.8) {
        setWowStage(3);
        setSelectedMidpoint(null);
        const p = Math.min(1, Math.max(0, (elapsedSec - 4.8) / 2.6));
        setWowDrawProgress(p);
      } else if (elapsedSec < 10.8) {
        setWowStage(4);
        setWowDrawProgress(1);
        setHighlightPair('BOTH');
      } else if (elapsedSec < 13.4) {
        setWowStage(5);
        setShowSection(true);
        setSectionDisplayMode('plane');
        setSectionOpacity(0.36);
        setShowPlaneLabels(true);
      } else if (elapsedSec < 16.0) {
        setWowStage(6);
        if (!movedToSide) {
          movedToSide = true;
          viewerRef.current?.setCameraPreset('side');
        }
      } else {
        setWowStage(7);
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [wowActive, wowStage === 7 ? 7 : 0]);

  const handleStartWowAnimation = useCallback(() => {
    setWowConclusionRevealed(false);
    setWowStage(1);
    setWowDrawProgress(0);
    setWowActive(true);
  }, []);

  const handleSkipWow = useCallback(() => {
    setShowBase(true);
    setShowSection(true);
    setSectionDisplayMode('plane');
    setShowPlaneLabels(true);
    setHighlightPair('BOTH');
    setSelectedMidpoint(null);
    setWowDrawProgress(1);
    setWowStage(7);
    viewerRef.current?.setCameraPreset('side');
  }, []);

  const handleCloseWow = useCallback(() => {
    setWowActive(false);
    setWowDrawProgress(1);
    setHighlightPair('none');
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const target = stageSectionRef.current ?? document.documentElement;
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be restricted by browser/iframe policy
    }
  }, []);

  const handleModeChange = useCallback((nextMode: StudioMode) => {
    setMode(nextMode);
    if (nextMode === 'student') {
      setProgressiveSectionStep(3);
    }
  }, []);

  const handleSelectPreset = useCallback((preset: CameraPreset) => {
    setAutoRotate(false);
    setIsOrthoBaseActive(preset === 'ortho_base');
    viewerRef.current?.setCameraPreset(preset);
  }, []);

  const handleToggleOrthoBase = useCallback(() => {
    setAutoRotate(false);
    setIsOrthoBaseActive((prev) => {
      const next = !prev;
      viewerRef.current?.setCameraPreset(next ? 'ortho_base' : 'default');
      return next;
    });
  }, []);

  const handleOnlyBase = useCallback(() => {
    setShowBase(true);
    setShowSection(false);
    setComparisonMode(false);
  }, []);

  const handleOnlySection = useCallback(() => {
    setShowBase(false);
    setShowSection(true);
    setProgressiveSectionStep(3);
    setComparisonMode(false);
  }, []);

  const handleToggleComparisonMode = useCallback(() => {
    setComparisonMode((prev) => {
      const next = !prev;
      if (next) {
        setShowBase(true);
        setShowSection(true);
        setProgressiveSectionStep(3);
        setSectionDisplayMode('plane');
        setShowPlaneLabels(true);
      }
      return next;
    });
  }, []);

  // Designer Challenge handlers
  const handleStartDesigner = useCallback(() => {
    setWowActive(false);
    setAutoRotate(false);
    setDesignerActive(true);
    setDesignerChecked(false);
    setDesignerOcclusionResults(null);
    setDesignerPredictions(buildDefaultPredictions(geometry));
  }, [geometry]);

  const handleExitDesigner = useCallback(() => {
    setDesignerActive(false);
    setDesignerChecked(false);
    setDesignerOcclusionResults(null);
  }, []);

  const handleCycleEdgePrediction = useCallback((edgeId: string) => {
    setDesignerChecked(false);
    setDesignerOcclusionResults(null);
    setDesignerPredictions((prev) => {
      const cur = prev[edgeId] ?? 'visible';
      const next: EdgeVisibilityClassification =
        cur === 'visible' ? 'hidden' : cur === 'hidden' ? 'partial' : 'visible';
      return { ...prev, [edgeId]: next };
    });
  }, []);

  const handleSetEdgePrediction = useCallback(
    (edgeId: string, cls: EdgeVisibilityClassification) => {
      setDesignerChecked(false);
      setDesignerOcclusionResults(null);
      setDesignerPredictions((prev) => ({ ...prev, [edgeId]: cls }));
    },
    [],
  );

  const handleCheckDesigner = useCallback(() => {
    const analysis = viewerRef.current?.analyzeCurrentOcclusion() ?? null;
    if (analysis) {
      setDesignerOcclusionResults(analysis);
      setDesignerChecked(true);
    }
  }, []);

  const handleResetDesigner = useCallback(() => {
    setDesignerChecked(false);
    setDesignerOcclusionResults(null);
    setDesignerPredictions(buildDefaultPredictions(geometry));
  }, [geometry]);

  const handleVertexClick = useCallback(
    (vertexId: string) => {
      if (vertexId === 'M' || vertexId === 'N' || vertexId === 'P') {
        setSelectedMidpoint((prev) => (prev === vertexId ? null : vertexId));
        if (activeTab !== 'discovery') {
          setActiveTab('discovery');
        }
      }
    },
    [activeTab],
  );

  const handleEdgeClick = useCallback(
    (edgeId: string) => {
      if (designerActive) {
        handleCycleEdgePrediction(edgeId);
      }
    },
    [designerActive, handleCycleEdgePrediction],
  );

  const handleWebXRStateChange = useCallback(
    (active: boolean, errorMessage?: string | null) => {
      setIsWebXRActive(active);
      if (active) {
        setIsARModalOpen(false);
      }
      if (errorMessage !== undefined) {
        setArError(errorMessage);
      }
    },
    [],
  );

  const handleStartWebXR = useCallback(async (overlayEl: HTMLElement) => {
    setArError(null);
    if (viewerRef.current) {
      await viewerRef.current.startWebXR(overlayEl);
    }
  }, []);

  const handleStopWebXR = useCallback(async () => {
    if (viewerRef.current) {
      await viewerRef.current.stopWebXR();
    }
  }, []);

  const designerRenderState: DesignerRenderState = useMemo(
    () => ({
      mode: !designerActive ? 'off' : designerChecked ? 'checked' : 'predict',
      predictions: designerPredictions,
      occlusionResults: designerOcclusionResults,
    }),
    [designerActive, designerChecked, designerPredictions, designerOcclusionResults],
  );

  const wowActivePair: 'none' | 'mn_np' | 'all' = useMemo(() => {
    if (!wowActive) return 'none';
    if (wowStage === 3) return 'mn_np';
    if (wowStage >= 4) return 'all';
    return 'none';
  }, [wowActive, wowStage]);

  const mathReport: MathVerificationReport = useMemo(
    () =>
      geometry
        ? verifyPyramidMath(geometry)
        : {
            isParallelABtoCD: false,
            isParallelADtoBC: false,
            isEqualLengthABtoCD: false,
            isEqualLengthADtoBC: false,
            isBaseCoplanar: false,
            isBaseNonDegenerate: false,
            areBaseTrianglesConsistent: false,
            isParallelogramValid: false,
            isMidpointM: false,
            isMidpointN: false,
            isMidpointP: false,
            areMidpointsExact: false,
            isParallelMNtoAB: false,
            isParallelNPtoBC: false,
            isParallelMPtoAC: false,
            isMNPNonDegenerate: false,
            arePlanesParallel: false,
            areColoredPlanesCoplanar: false,
            coordinatesImmutableOnOrbit: false,
            allPassed: false,
            failures: [],
            parallelogramResidual: 0,
            midpointMaxError: 0,
            planeParallelCrossNorm: 0,
            coloredPlaneCoplanarityError: 0,
          },
    [geometry],
  );

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[#F3FAFC] text-slate-900 lg:h-[100dvh] lg:overflow-hidden">
      {/* 1. Prominent Top Author Banner */}
      <div className="z-30 shrink-0 border-b-2 border-[#FACC15]/80 bg-[#04392B] px-3 py-1.5 text-white sm:px-5">
        <div className="flex flex-col items-center justify-center text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center justify-center gap-2">
            <GraduationCap className="h-4 w-4 shrink-0 text-[#FACC15] sm:h-5 sm:w-5" aria-hidden="true" />
            <p className="whitespace-nowrap font-extrabold tracking-wide text-[#FACC15] text-[clamp(0.74rem,3.4vw,1.02rem)]">
              PHÁT TRIỂN BỞI PHAN THỊ NGỌC THÁI
            </p>
          </div>
          <p className="text-[11px] font-medium text-emerald-100 sm:text-xs">
            Giáo viên Toán THPT – Trường THPT số 1 Trần Cao Vân
          </p>
        </div>
      </div>

      {/* 2. Main Educational 3D Laboratory Header */}
      <header className="z-30 shrink-0 border-b-2 border-[#00CFC8]/45 bg-gradient-to-r from-[#064E3B] via-[#075E47] to-[#064E3B] px-3 py-2 text-white shadow-sm sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FACC15]/50 bg-white/10 text-[#FACC15]">
              <Box className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h1 className="truncate text-sm font-extrabold tracking-tight text-white sm:text-base lg:text-lg">
                  PHÒNG THÍ NGHIỆM HÌNH CHÓP 3D
                </h1>
                <span className="hidden text-xs font-semibold text-[#00CFC8] xl:inline">
                  BÀI 13. HAI MẶT PHẲNG SONG SONG – TOÁN 11
                </span>
              </div>
              <p className="truncate text-[11px] font-medium text-emerald-100 sm:text-xs">
                Hình chóp <span className="font-math text-[#FACC15]">S.ABCD</span> – Trung điểm{' '}
                <span className="font-math text-[#FFB347]">M, N, P</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setIsPanelVisible((v) => !v)}
              title={isPanelVisible ? 'Ẩn bảng điều khiển bên phải' : 'Hiện bảng điều khiển'}
              className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/20"
            >
              {isPanelVisible ? (
                <>
                  <PanelRightClose className="h-4 w-4 text-[#00CFC8]" aria-hidden="true" />
                  <span className="hidden md:inline">Ẩn bảng điều khiển</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="h-4 w-4 text-[#FACC15]" aria-hidden="true" />
                  <span>Hiện bảng điều khiển</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleToggleFullscreen()}
              title="Xem toàn màn hình"
              className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/20"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 text-[#00CFC8]" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-4 w-4 text-[#00CFC8]" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Toàn màn hình</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              title="Hướng dẫn sử dụng"
              className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/20"
            >
              <HelpCircle className="h-4 w-4 text-[#00CFC8]" aria-hidden="true" />
              <span className="hidden sm:inline">Hướng dẫn</span>
            </button>

            <button
              type="button"
              disabled={!geometry}
              onClick={() => handleSelectPreset('default')}
              title="Đặt lại góc nhìn ban đầu"
              className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 text-[#00CFC8]" aria-hidden="true" />
              <span className="hidden md:inline">Đặt lại góc nhìn</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              title="Chia sẻ mô hình – Quét QR"
              className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border border-[#00CFC8]/50 bg-[#00CFC8]/15 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-[#00CFC8] transition-colors hover:bg-[#00CFC8]/25"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Chia sẻ QR</span>
            </button>

            <button
              type="button"
              disabled={!geometry}
              onClick={() => {
                setArError(null);
                setIsARModalOpen(true);
              }}
              title="Mở chế độ Thực tế tăng cường (AR)"
              className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl bg-[#FACC15] px-3 py-1.5 text-xs font-extrabold whitespace-nowrap text-[#064E3B] shadow-sm transition-colors hover:bg-yellow-300 disabled:opacity-50"
            >
              <Camera className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Xem AR</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Main Laboratory Workspace */}
      <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        <section
          ref={stageSectionRef}
          className={`relative h-[60dvh] min-h-[370px] w-full shrink-0 overflow-hidden bg-[#F3FAFC] lg:h-full ${
            isPanelVisible ? 'lg:w-[68%]' : 'lg:w-full'
          }`}
          aria-label="Khu vực mô hình hình học 3D"
        >
          {isLoading && (
            <div className="stage-gradient flex h-full w-full items-center justify-center p-6">
              <div className="rounded-2xl border border-[#064E3B]/15 bg-white px-5 py-4 text-center shadow-sm">
                <p className="text-sm font-bold text-[#064E3B]">
                  Đang tải và kiểm thử hình học không gian...
                </p>
                <p className="font-math mt-1 text-xs text-slate-500">{MODEL_URL}</p>
              </div>
            </div>
          )}

          {!isLoading && loadError && (
            <div className="stage-gradient flex h-full w-full items-center justify-center p-6">
              <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
                <h2 className="text-base font-bold text-slate-900">
                  Không thể dựng mô hình hình học
                </h2>
                <p className="mt-2 text-sm text-red-700">{loadError}</p>
                <button
                  type="button"
                  onClick={() => void loadModel()}
                  className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#064E3B] px-4 py-2 text-sm font-semibold text-[#FACC15] hover:bg-[#053D2E]"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span>Thử tải lại</span>
                </button>
              </div>
            </div>
          )}

          {!isLoading && !loadError && geometry && (
            <>
              <GeometryViewer
                ref={viewerRef}
                geometry={geometry}
                showBase={showBase}
                baseOpacity={baseOpacity}
                showSection={showSection}
                sectionOpacity={sectionOpacity}
                sectionDisplayMode={sectionDisplayMode}
                comparisonMode={comparisonMode}
                showPlaneLabels={showPlaneLabels}
                showLabels={showLabels}
                showGrid={showGrid}
                autoRotate={autoRotate}
                autoHiddenLines={autoHiddenLines}
                showHiddenEdges={showHiddenEdges}
                progressiveSectionStep={progressiveSectionStep}
                selectedMidpoint={selectedMidpoint}
                highlightPair={highlightPair}
                mnNpDrawProgress={wowActive ? wowDrawProgress : 1}
                wowActivePair={wowActivePair}
                designerState={designerRenderState}
                onVertexClick={handleVertexClick}
                onEdgeClick={handleEdgeClick}
                onWebXRStateChange={handleWebXRStateChange}
              />

              <WowAnimationBar
                active={wowActive}
                stage={wowStage}
                conclusionRevealed={wowConclusionRevealed}
                onSkipToQuestion={handleSkipWow}
                onReplay={handleStartWowAnimation}
                onRevealConclusion={() => setWowConclusionRevealed(true)}
                onClose={handleCloseWow}
              />

              {!isWebXRActive && (
                <GeometryControls
                  showBase={showBase}
                  showSection={showSection}
                  showLabels={showLabels}
                  showGrid={showGrid}
                  autoRotate={autoRotate}
                  autoHiddenLines={autoHiddenLines}
                  showHiddenEdges={showHiddenEdges}
                  isOrthoBaseActive={isOrthoBaseActive}
                  isFullscreen={isFullscreen}
                  wowActive={wowActive}
                  onToggleBase={() => setShowBase((v) => !v)}
                  onToggleSection={() => setShowSection((v) => !v)}
                  onToggleLabels={() => setShowLabels((v) => !v)}
                  onToggleGrid={() => setShowGrid((v) => !v)}
                  onToggleAutoRotate={() => {
                    if (isOrthoBaseActive) {
                      setIsOrthoBaseActive(false);
                      viewerRef.current?.setCameraPreset('default');
                    }
                    setAutoRotate((v) => !v);
                  }}
                  onToggleAutoHiddenLines={() => setAutoHiddenLines((v) => !v)}
                  onToggleHiddenEdges={() => setShowHiddenEdges((v) => !v)}
                  onToggleOrthoBase={handleToggleOrthoBase}
                  onSelectPreset={handleSelectPreset}
                  onStartWowAnimation={handleStartWowAnimation}
                  onCaptureSnapshot={() => viewerRef.current?.captureSnapshot()}
                  onToggleFullscreen={() => void handleToggleFullscreen()}
                  onOpenAR={() => {
                    setArError(null);
                    setIsARModalOpen(true);
                  }}
                />
              )}
            </>
          )}
        </section>

        {isPanelVisible && (
          <div className="w-full lg:h-full lg:w-[32%] lg:min-w-[350px]">
            <ChallengePanel
              mode={mode}
              activeTab={activeTab}
              onModeChange={handleModeChange}
              onTabChange={setActiveTab}
              progressiveSectionStep={progressiveSectionStep}
              onProgressiveStepChange={(step) => {
                setProgressiveSectionStep(step);
                if (step > 0 && !showSection) {
                  setShowSection(true);
                }
              }}
              onResetView={() => handleSelectPreset('default')}
              onToggleOrthoBase={handleToggleOrthoBase}
              onToggleFullscreen={() => void handleToggleFullscreen()}
              onSelectPreset={handleSelectPreset}
              onStartWowAnimation={handleStartWowAnimation}
              geometry={geometry}
              mathReport={mathReport}
              selectedMidpoint={selectedMidpoint}
              onSelectMidpoint={setSelectedMidpoint}
              highlightPair={highlightPair}
              onChangeHighlightPair={setHighlightPair}
              showBase={showBase}
              baseOpacity={baseOpacity}
              showSection={showSection}
              sectionOpacity={sectionOpacity}
              sectionDisplayMode={sectionDisplayMode}
              comparisonMode={comparisonMode}
              showPlaneLabels={showPlaneLabels}
              isOrthoBaseActive={isOrthoBaseActive}
              onToggleBase={() => setShowBase((v) => !v)}
              onChangeBaseOpacity={setBaseOpacity}
              onOnlyBase={handleOnlyBase}
              onToggleSection={() => setShowSection((v) => !v)}
              onChangeSectionOpacity={setSectionOpacity}
              onOnlySection={handleOnlySection}
              onChangeSectionDisplayMode={setSectionDisplayMode}
              onToggleComparisonMode={handleToggleComparisonMode}
              onTogglePlaneLabels={() => setShowPlaneLabels((v) => !v)}
              designerActive={designerActive}
              designerChecked={designerChecked}
              edges={geometry?.edges ?? []}
              designerPredictions={designerPredictions}
              designerOcclusionResults={designerOcclusionResults}
              onStartDesigner={handleStartDesigner}
              onExitDesigner={handleExitDesigner}
              onCycleEdgePrediction={handleCycleEdgePrediction}
              onSetEdgePrediction={handleSetEdgePrediction}
              onCheckDesigner={handleCheckDesigner}
              onResetDesigner={handleResetDesigner}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
      {geometry && (
        <ARViewer
          isOpen={isARModalOpen}
          isWebXRActive={isWebXRActive}
          geometry={geometry}
          showBase={showBase}
          showSection={showSection}
          onClose={() => setIsARModalOpen(false)}
          onStartWebXR={handleStartWebXR}
          onStopWebXR={handleStopWebXR}
          onUpdateARTransform={(scale, rot) => viewerRef.current?.setARTransform(scale, rot)}
          arError={arError}
        />
      )}
    </div>
  );
}
