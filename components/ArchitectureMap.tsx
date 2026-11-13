'use client';

import { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';
import { computeLayeredGraphPositions } from '@/lib/graphLayout';
import type {
  EvidenceConfidence,
  IntelligenceNode,
  NodeLayer,
  UrlIntelligenceReport,
} from '@/lib/types';
import MermaidDiagram from './MermaidDiagram';

interface ArchitectureMapProps {
  report: UrlIntelligenceReport;
  onAskAboutNode: (node: IntelligenceNode) => void;
  isDark?: boolean;
}

type CustomNodeData = {
  node: IntelligenceNode;
  isSelected: boolean;
};

const LAYER_LABELS: Record<NodeLayer | 'all', string> = {
  all: 'All Layers',
  entry: 'Entry',
  frontend: 'Frontend / UI',
  logic: 'Core Logic / API',
  data: 'Data / Assets',
  external: 'External',
};

function ArchitectureNodeCard({ data }: NodeProps<Node<CustomNodeData>>) {
  const { node, isSelected } = data;
  const isDetected = node.confidence === 'detected';

  return (
    <div
      className={`w-[216px] rounded-xl border bg-white dark:bg-slate-900 px-3 py-2.5 text-left transition-shadow ${
        isSelected
          ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-md'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 shadow-sm'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border-0"
      />
      <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
        <span className="font-medium text-slate-500 dark:text-slate-400 truncate">
          {node.category}
        </span>
        <span
          className={`inline-flex items-center gap-1 font-medium shrink-0 ${
            isDetected
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-amber-700 dark:text-amber-400'
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
      <p className="font-display text-sm font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
        {node.label}
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
        {node.description}
      </p>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-blue-600 !border-0"
      />
    </div>
  );
}

const nodeTypes = {
  architectureNode: ArchitectureNodeCard,
};

export default function ArchitectureMap({
  report,
  onAskAboutNode,
  isDark = false,
}: ArchitectureMapProps) {
  const [mapMode, setMapMode] = useState<'flow' | 'mermaid'>('flow');
  const [layerFilter, setLayerFilter] = useState<NodeLayer | 'all'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<
    EvidenceConfidence | 'all'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    report.nodes[0]?.id ?? null,
  );

  const filteredNodes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return report.nodes.filter((node) => {
      if (layerFilter !== 'all' && node.layer !== layerFilter) return false;
      if (confidenceFilter !== 'all' && node.confidence !== confidenceFilter)
        return false;
      if (
        q &&
        !node.label.toLowerCase().includes(q) &&
        !node.category.toLowerCase().includes(q) &&
        !node.description.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [report.nodes, layerFilter, confidenceFilter, searchTerm]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes],
  );

  const filteredEdges = useMemo(
    () =>
      report.edges.filter(
        (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target),
      ),
    [report.edges, filteredNodeIds],
  );

  const flowNodes: Node<CustomNodeData>[] = useMemo(() => {
    const positioned = computeLayeredGraphPositions(
      filteredNodes,
      filteredEdges,
    );
    return positioned.map((pos) => ({
      id: pos.id,
      type: 'architectureNode',
      position: { x: pos.x, y: pos.y },
      data: {
        node: pos.node,
        isSelected: pos.id === selectedNodeId,
      },
    }));
  }, [filteredNodes, filteredEdges, selectedNodeId]);

  const flowEdges: Edge[] = useMemo(() => {
    return filteredEdges.map((edge) => {
      const isHighlighted =
        selectedNodeId &&
        (edge.source === selectedNodeId || edge.target === selectedNodeId);
      const isInferred = edge.confidence === 'inferred';
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        animated: Boolean(isHighlighted),
        style: {
          stroke: isHighlighted
            ? '#2563EB'
            : isInferred
              ? '#D97706'
              : '#64748B',
          strokeWidth: isHighlighted ? 2.2 : 1.5,
          strokeDasharray: isInferred ? '5 4' : undefined,
        },
        labelStyle: {
          fontSize: 11,
          fontWeight: 500,
          fill: isHighlighted ? '#1D4ED8' : '#475569',
        },
        labelBgStyle: {
          fill: '#FFFFFF',
          fillOpacity: 0.9,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isHighlighted
            ? '#2563EB'
            : isInferred
              ? '#D97706'
              : '#64748B',
        },
      };
    });
  }, [filteredEdges, selectedNodeId]);

  const selectedNode = useMemo(
    () => report.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [report.nodes, selectedNodeId],
  );

  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return report.edges.filter(
      (e) => e.source === selectedNode.id || e.target === selectedNode.id,
    );
  }, [report.edges, selectedNode]);

  const detectedCount = report.nodes.filter(
    (n) => n.confidence === 'detected',
  ).length;
  const inferredCount = report.nodes.length - detectedCount;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Diagram renderer mode"
            className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
          >
            <button
              type="button"
              onClick={() => setMapMode('flow')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mapMode === 'flow'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Interactive Graph
            </button>
            <button
              type="button"
              onClick={() => setMapMode('mermaid')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mapMode === 'mermaid'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mermaid Diagram
            </button>
          </div>

          {mapMode === 'flow' && (
            <>
              <div
                role="group"
                aria-label="Filter nodes by confidence"
                className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
              >
                {(
                  [
                    { id: 'all', label: `All (${report.nodes.length})` },
                    { id: 'detected', label: `Detected (${detectedCount})` },
                    { id: 'inferred', label: `Inferred (${inferredCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setConfidenceFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      confidenceFilter === tab.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <label htmlFor="map-layer-select" className="sr-only">
                Filter by architecture layer
              </label>
              <select
                id="map-layer-select"
                value={layerFilter}
                onChange={(e) =>
                  setLayerFilter(e.target.value as NodeLayer | 'all')
                }
                className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {Object.entries(LAYER_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {mapMode === 'flow' && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <label htmlFor="map-node-search" className="sr-only">
              Search map nodes
            </label>
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="map-node-search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter nodes by name or layer..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        )}
      </div>

      {mapMode === 'mermaid' ? (
        <MermaidDiagram report={report} isDark={isDark} />
      ) : (
      /* Main Split: Interactive Canvas + Node Inspector */
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div
          data-testid="architecture-map-canvas"
          data-node-count={flowNodes.length}
          data-selected-node={selectedNode?.id ?? ''}
          className="xl:col-span-8 h-[540px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden relative"
        >
          {flowNodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                No architecture nodes match your active filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setLayerFilter('all');
                  setConfidenceFilter('all');
                  setSearchTerm('');
                }}
                className="mt-3 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Reset Map Filters
              </button>
            </div>
          ) : (
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              fitView
              fitViewOptions={{ padding: 0.14 }}
              minZoom={0.45}
              maxZoom={1.6}
            >
              <Background gap={20} size={1} color="#CBD5E1" />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeStrokeWidth={2}
                style={{ width: 120, height: 80 }}
                className="!rounded-lg !border !border-slate-200 dark:!border-slate-800"
              />
            </ReactFlow>
          )}
        </div>

        {/* Node Inspector Panel */}
        <aside
          aria-label="Node inspector"
          className="xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Node Inspector
              </h3>
              {selectedNode && (
                <button
                  type="button"
                  aria-label="Clear selected node"
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Accessible Quick Node Selector */}
            <div className="mt-3">
              <label
                htmlFor="inspector-node-select"
                className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
              >
                Inspect component
              </label>
              <select
                id="inspector-node-select"
                value={selectedNodeId ?? ''}
                onChange={(e) => setSelectedNodeId(e.target.value || null)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Select a node...</option>
                {report.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label} ({n.confidence})
                  </option>
                ))}
              </select>
            </div>

            {selectedNode ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{LAYER_LABELS[selectedNode.layer]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedNode.category}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        selectedNode.confidence === 'detected'
                          ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                          : 'text-amber-700 dark:text-amber-400 font-medium'
                      }
                    >
                      {selectedNode.confidence === 'detected'
                        ? 'Detected'
                        : 'Inferred'}
                    </span>
                  </div>
                  <h4 className="mt-1 font-display text-base font-semibold text-slate-900 dark:text-white">
                    {selectedNode.label}
                  </h4>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedNode.description}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Observable Evidence
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed break-words">
                    {selectedNode.evidence}
                  </p>
                  {selectedNode.urlOrPath && (
                    <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-mono truncate">
                      Path: {selectedNode.urlOrPath}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Connections ({connectedEdges.length})
                  </p>
                  {connectedEdges.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No direct edges recorded for this node.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {connectedEdges.map((edge) => {
                        const isOutgoing = edge.source === selectedNode.id;
                        const otherId = isOutgoing ? edge.target : edge.source;
                        const otherNode = report.nodes.find(
                          (n) => n.id === otherId,
                        );
                        return (
                          <li key={edge.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedNodeId(otherId)}
                              className="w-full text-left px-2.5 py-1.5 text-xs rounded-md border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <span className="text-slate-500 dark:text-slate-400">
                                {isOutgoing ? '→' : '←'} {edge.label}:{' '}
                              </span>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {otherNode?.label || otherId}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400 py-8">
                Click any node on the architecture map or choose one above to
                inspect its evidence and dependencies.
              </div>
            )}
          </div>

          {selectedNode && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => onAskAboutNode(selectedNode)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-lg transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Ask AI about {selectedNode.label}</span>
              </button>
            </div>
          )}
        </aside>
      </div>
      )}
    </div>
  );
}
