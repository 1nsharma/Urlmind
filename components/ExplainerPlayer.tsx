'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { UrlIntelligenceReport } from '@/lib/types';

interface ExplainerPlayerProps {
  report: UrlIntelligenceReport;
}

export default function ExplainerPlayer({ report }: ExplainerPlayerProps) {
  const scenes = report.explainerScript;
  const totalDuration = useMemo(
    () => scenes.reduce((acc, s) => acc + (s.durationSeconds || 12), 0) || 60,
    [scenes],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedInScene, setElapsedInScene] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const lastSpokenIndexRef = useRef<number | null>(null);

  const activeScene = scenes[currentIndex] ?? scenes[0];
  const sceneDuration = activeScene?.durationSeconds || 12;

  // Compute cumulative elapsed seconds
  const cumulativeElapsed = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < currentIndex; i++) {
      sum += scenes[i]?.durationSeconds || 12;
    }
    return Math.min(totalDuration, sum + elapsedInScene);
  }, [scenes, currentIndex, elapsedInScene, totalDuration]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying || scenes.length === 0) return;
    const interval = setInterval(() => {
      setElapsedInScene((prev) => {
        if (prev + 0.25 >= sceneDuration) {
          if (currentIndex + 1 < scenes.length) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            setIsPlaying(false);
            return sceneDuration;
          }
        }
        return prev + 0.25;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, sceneDuration, scenes.length]);

  // Optional browser Web Speech narration
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!isPlaying || !voiceEnabled || !activeScene) {
      window.speechSynthesis.cancel();
      if (!isPlaying) lastSpokenIndexRef.current = null;
      return;
    }
    if (lastSpokenIndexRef.current !== currentIndex) {
      lastSpokenIndexRef.current = currentIndex;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(activeScene.narration);
      utterance.rate = 1.02;
      window.speechSynthesis.speak(utterance);
    }
  }, [isPlaying, voiceEnabled, currentIndex, activeScene]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!activeScene) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500">
        No explainer storyboard scenes are available for this URL.
      </div>
    );
  }

  const focusNodeIds = new Set(activeScene.visualFocusNodeIds);

  const handleTogglePlay = () => {
    if (
      !isPlaying &&
      currentIndex === scenes.length - 1 &&
      elapsedInScene >= sceneDuration
    ) {
      setCurrentIndex(0);
      setElapsedInScene(0);
    }
    setIsPlaying((p) => !p);
  };

  const handleSelectScene = (idx: number) => {
    setCurrentIndex(idx);
    setElapsedInScene(0);
    lastSpokenIndexRef.current = null;
  };

  return (
    <div className="space-y-4">
      {/* Stage Canvas */}
      <div className="bg-slate-950 text-white border border-slate-800 rounded-xl overflow-hidden">
        {/* Stage Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono text-blue-400 font-semibold tabular-nums">
              Scene 0{activeScene.sceneNumber} / 0{scenes.length}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-300 font-medium">
              {report.domain}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVoiceEnabled((v) => !v)}
              aria-pressed={voiceEnabled}
              aria-label={
                voiceEnabled
                  ? 'Mute voiceover narration'
                  : 'Enable voiceover narration'
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {voiceEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              )}
              <span>{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
            </button>

            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {Math.floor(cumulativeElapsed)}s / {totalDuration}s
            </span>
          </div>
        </div>

        {/* Visual Animated Stage */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center min-h-[340px]">
          <div className="lg:col-span-6 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeScene.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <p className="text-xs font-mono text-blue-400">
                  {activeScene.durationSeconds}s Chapter
                </p>
                <h2 className="font-display text-2xl font-bold text-white leading-snug text-balance">
                  {activeScene.title}
                </h2>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                  {activeScene.narration}
                </p>
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-xs text-slate-400">
                    <span className="font-semibold text-emerald-400">
                      Key takeaway:{' '}
                    </span>
                    {activeScene.keyTakeaway}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Spotlight Node Matrix */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {report.nodes.slice(0, 8).map((node) => {
              const isFocused = focusNodeIds.has(node.id);
              const isDetected = node.confidence === 'detected';
              return (
                <div
                  key={node.id}
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    isFocused
                      ? 'border-blue-500 bg-blue-950/50 shadow-sm scale-[1.01]'
                      : 'border-slate-800 bg-slate-900/60 opacity-45'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                    <span className="text-slate-400 truncate">
                      {node.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 shrink-0 ${
                        isDetected ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {isDetected ? (
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <HelpCircle className="w-3 h-3" aria-hidden="true" />
                      )}
                      <span>{isDetected ? 'Detected' : 'Inferred'}</span>
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white truncate">
                    {node.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transport & Progress Bar */}
        <div className="px-5 py-4 bg-slate-900/90 border-t border-slate-800 space-y-3">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-200"
              style={{
                width: `${Math.min(100, (cumulativeElapsed / totalDuration) * 100)}%`,
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous scene"
                disabled={currentIndex === 0}
                onClick={() => handleSelectScene(Math.max(0, currentIndex - 1))}
                className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleTogglePlay}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Play 60s Explainer</span>
                  </>
                )}
              </button>
              <button
                type="button"
                aria-label="Next scene"
                disabled={currentIndex >= scenes.length - 1}
                onClick={() =>
                  handleSelectScene(
                    Math.min(scenes.length - 1, currentIndex + 1),
                  )
                }
                className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Restart explainer"
                onClick={() => {
                  setIsPlaying(false);
                  handleSelectScene(0);
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs text-slate-400">
              Click any chapter below to jump directly
            </span>
          </div>
        </div>
      </div>

      {/* Scene Chapters Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {scenes.map((scene, idx) => {
          const active = idx === currentIndex;
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => handleSelectScene(idx)}
              className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                active
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1 tabular-nums">
                <span>0{scene.sceneNumber}</span>
                <span>{scene.durationSeconds}s</span>
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">
                {scene.title}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
