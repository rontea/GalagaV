
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, Database, Key, Trash2, Copy, Check, Upload, 
  MousePointer2, Settings2, X, ChevronDown, Save, 
  Download, Zap, Settings, ArrowLeft, RefreshCw, Layout,
  Maximize, Minimize, Grid3X3, Trash, Box, Type, Fingerprint, Link2,
  Share2, Binary, Sparkles, Send, FileCode, Server, MoreVertical
} from 'lucide-react';
import { Project, SchemaData, Table, Column, Step, Relationship } from './types';
import { GoogleGenAI, Type as SchemaType } from "@google/genai";

interface PluginProps {
  project: Project;
  onSave: (updatedProject: Project) => void;
  theme: 'light' | 'dark';
  onNotify: (msg: string) => void;
}

const SCHEMA_STEP_ID = 'architect_schema_data';
const GRID_SIZE = 20;

const SchemaBuilder: React.FC<PluginProps> = ({ project, onSave, theme, onNotify }) => {
  const schemaStep = (project.steps || []).find(s => s.id === SCHEMA_STEP_ID);
  const [viewMode, setViewMode] = useState<'visual' | 'code' | 'sql'>('visual');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<{tableId: string, colId: string} | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isSnapping, setIsSnapping] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const initialData: SchemaData = React.useMemo(() => {
    if (schemaStep?.content) {
      try {
        return JSON.parse(schemaStep.content);
      } catch (e) {
        return { tables: [], relationships: [] };
      }
    }
    return { tables: [], relationships: [] };
  }, [schemaStep]);

  const [data, setData] = useState<SchemaData>(initialData);
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Connection State
  const [activeConn, setActiveConn] = useState<{ tableId: string, colId: string, x: number, y: number } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState({ x: 0, y: 0 });
  const [hoveredDot, setHoveredDot] = useState<{ tableId: string, colId: string } | null>(null);

  // SQL Generation Logic
  const generateSQL = useCallback(() => {
    let sql = `-- Architect Schema Export\n-- Project: ${project.name}\n-- Generated: ${new Date().toLocaleString()}\n\n`;
    data.tables.forEach(table => {
      sql += `CREATE TABLE ${table.name} (\n`;
      const colLines = table.columns.map(col => {
        let line = `  ${col.name} ${col.type}`;
        if (col.isPrimary) line += " PRIMARY KEY";
        if (!col.isNullable) line += " NOT NULL";
        return line;
      });
      sql += colLines.join(',\n');
      sql += `\n);\n\n`;
    });
    return sql;
  }, [data, project.name]);

  // Backend Sync Logic
  const syncToBackend = async () => {
    setIsSyncing(true);
    const sql = generateSQL();
    try {
      const response = await fetch('/__system/architect/save-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, filename: `${project.name.toLowerCase().replace(/\s/g, '_')}_schema.sql` })
      });
      if (response.ok) {
        onNotify("Schema synchronized to server disk storage.");
      } else {
        throw new Error("Backend reject.");
      }
    } catch (e) {
      onNotify("Backend connection failed. Local save only.");
    } finally {
      setIsSyncing(false);
    }
  };

  // AI Table Generation
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: (window as any).process?.env?.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a JSON database table structure for a "${aiPrompt}". Return only the JSON object following this schema: { "name": string, "columns": [ { "name": string, "type": string, "isPrimary": boolean, "isNullable": boolean } ] }. Use standard SQL types.`,
        config: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      
      const newTableData = JSON.parse(response.text || '{}');
      if (newTableData.name && newTableData.columns) {
        const id = `tbl_ai_${Date.now()}`;
        const newTable: Table = {
          id,
          name: newTableData.name.toUpperCase(),
          x: 100 + (data.tables.length * 40),
          y: 100 + (data.tables.length * 40),
          columns: newTableData.columns.map((c: any, i: number) => ({
            id: `col_ai_${Date.now()}_${i}`,
            name: c.name.toLowerCase(),
            type: c.type || 'VARCHAR',
            isPrimary: !!c.isPrimary,
            isForeignKey: false,
            isNullable: c.isNullable !== undefined ? c.isNullable : true,
            isConnectable: true
          }))
        };
        setData(prev => ({ ...prev, tables: [...prev.tables, newTable] }));
        setAiPrompt('');
        onNotify(`AI Entity "${newTable.name}" synthesized.`);
      }
    } catch (e) {
      onNotify("AI generation failed. Check API connectivity.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Auto-save logic to Host Project
  useEffect(() => {
    if (JSON.stringify(data) === JSON.stringify(initialData)) return;
    const timer = setTimeout(() => {
      const updatedSteps = [...(project.steps || [])];
      const idx = updatedSteps.findIndex(s => s.id === SCHEMA_STEP_ID);
      const newStep: Step = {
        id: SCHEMA_STEP_ID,
        title: 'Architect Schema Store',
        category: 'backend',
        status: 'completed',
        content: JSON.stringify(data),
        createdAt: Date.now()
      };
      if (idx > -1) updatedSteps[idx] = newStep;
      else updatedSteps.push(newStep);
      onSave({ ...project, steps: updatedSteps });
    }, 800);
    return () => clearTimeout(timer);
  }, [data, project, onSave, initialData]);

  // Mouse Physics for Dragging & Linking
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + canvas.scrollLeft;
    const y = e.clientY - rect.top + canvas.scrollTop;

    if (draggedTableId) {
      let newX = x - dragOffset.current.x;
      let newY = y - dragOffset.current.y;
      if (isSnapping) {
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
      }
      setData(prev => ({
        ...prev,
        tables: prev.tables.map(t => t.id === draggedTableId ? { ...t, x: newX, y: newY } : t)
      }));
    }

    if (activeConn) {
      setCurrentMousePos({ x, y });
    }
  }, [draggedTableId, activeConn, isSnapping]);

  const handleMouseUp = useCallback(() => {
    if (activeConn && hoveredDot) {
      const newRel: Relationship = {
        id: `rel_${Date.now()}`,
        fromTableId: activeConn.tableId,
        fromColumnId: activeConn.colId,
        toTableId: hoveredDot.tableId,
        toColumnId: hoveredDot.colId,
        cardinality: '1:n'
      };
      const exists = data.relationships.some(r => 
        (r.fromColumnId === newRel.fromColumnId && r.toColumnId === newRel.toColumnId) ||
        (r.fromColumnId === newRel.toColumnId && r.toColumnId === newRel.fromColumnId)
      );
      if (!exists && newRel.fromColumnId !== newRel.toColumnId) {
        setData(prev => ({ ...prev, relationships: [...prev.relationships, newRel] }));
        onNotify("Link engaged.");
      }
    }
    setDraggedTableId(null);
    setActiveConn(null);
  }, [activeConn, hoveredDot, data.relationships, onNotify]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const getDotCoords = (tableId: string, colId: string) => {
    const table = data.tables.find(t => t.id === tableId);
    if (!table) return { x: 0, y: 0 };
    const colIdx = table.columns.findIndex(c => c.id === colId);
    if (colIdx === -1) return { x: table.x, y: table.y };
    const x = table.x + 120; 
    const y = table.y + 48 + (colIdx * 41) + 20; 
    return { x, y };
  };

  const handleTableMouseDown = (e: React.MouseEvent, table: Table) => {
    if ((e.target as HTMLElement).closest('.btn-action')) return;
    if ((e.target as HTMLElement).closest('.connection-handle')) return;
    if ((e.target as HTMLElement).closest('.title-input')) return;
    
    setDraggedTableId(table.id);
    setSelectedTableId(table.id);
    setSelectedColumnId(null);
    setActiveMenuId(null);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      dragOffset.current = { 
        x: e.clientX - rect.left + canvas.scrollLeft - table.x, 
        y: e.clientY - rect.top + canvas.scrollTop - table.y 
      };
    }
  };

  const handleDotMouseDown = (e: React.MouseEvent, tableId: string, colId: string) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + canvas.scrollLeft;
    const y = e.clientY - rect.top + canvas.scrollTop;
    setActiveConn({ tableId, colId, x, y });
    setCurrentMousePos({ x, y });
  };

  const addColumn = (tableId: string) => {
    const colId = `col_${Date.now()}`;
    setData(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.id === tableId ? {
        ...t,
        columns: [...t.columns, { 
          id: colId, name: 'new_field', type: 'VARCHAR', 
          isPrimary: false, isForeignKey: false, isNullable: true, isConnectable: false
        }]
      } : t)
    }));
    setSelectedColumnId({ tableId, colId });
  };

  const updateColumn = (tableId: string, colId: string, updates: Partial<Column>) => {
    setData(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.id === tableId ? {
        ...t,
        columns: t.columns.map(c => c.id === colId ? { ...c, ...updates } : c)
      } : t)
    }));
  };

  const handleDeleteTable = (tableId: string, tableName: string) => {
    if (confirm(`Confirm decommissioning of table protocol: [ ${tableName} ]?`)) {
      setData(prev => ({
        ...prev,
        tables: prev.tables.filter(t => t.id !== tableId),
        relationships: prev.relationships.filter(r => r.fromTableId !== tableId && r.toTableId !== tableId)
      }));
      if (selectedTableId === tableId) setSelectedTableId(null);
      setActiveMenuId(null);
    }
  };

  const selectedColumn = React.useMemo(() => {
    if (!selectedColumnId) return null;
    return data.tables.find(t => t.id === selectedColumnId.tableId)?.columns.find(c => c.id === selectedColumnId.colId) || null;
  }, [selectedColumnId, data.tables]);

  return (
    <div className="flex h-full bg-slate-50 dark:bg-[#050505] overflow-hidden font-sans">
      {/* Sidebar Panel */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#020617] z-20 shadow-xl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-500" /> ARCHITECT_v2.0
            </h2>
            <div className="flex bg-slate-100 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
                <button onClick={() => setViewMode('visual')} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${viewMode === 'visual' ? 'bg-white dark:bg-slate-800 text-cyan-600 shadow-sm' : 'text-slate-500'}`}>Vis</button>
                <button onClick={() => setViewMode('code')} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${viewMode === 'code' ? 'bg-white dark:bg-slate-800 text-cyan-600 shadow-sm' : 'text-slate-500'}`}>JS</button>
                <button onClick={() => setViewMode('sql')} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${viewMode === 'sql' ? 'bg-white dark:bg-slate-800 text-cyan-600 shadow-sm' : 'text-slate-500'}`}>SQL</button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {/* AI Prompt Input */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"><Sparkles size={12} className="text-purple-500" /> AI Generator</label>
              <div className="relative">
                <input 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-purple-500 transition-all pr-10"
                  placeholder="Describe a table (e.g. Orders)..."
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAiGenerate()}
                />
                <button 
                  onClick={handleAiGenerate}
                  disabled={isAiLoading || !aiPrompt.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-400 disabled:opacity-50"
                >
                  {isAiLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>

            <hr className="border-slate-800" />

            {!selectedTableId && !selectedColumnId ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><Box size={12} /> Toolbox</h3>
                    <button 
                      onClick={() => {
                        const id = `tbl_${Date.now()}`;
                        setData(prev => ({ ...prev, tables: [...prev.tables, { id, name: `NEW_ENTITY`, x: 100, y: 100, columns: [{ id: `col_${Date.now()}`, name: 'id', type: 'UUID', isPrimary: true, isForeignKey: false, isNullable: false, isConnectable: true }] }] }));
                        setSelectedTableId(id);
                      }}
                      className="group w-full p-6 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center hover:border-cyan-500 transition-all"
                    >
                        <Database size={24} className="text-slate-400 group-hover:text-cyan-500 mb-3" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Manual Entity</span>
                    </button>
                </div>
            ) : null}

            {selectedTableId && (
                <div className="animate-in slide-in-from-left-2 duration-300 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h3 className="text-xs font-bold text-cyan-600 flex items-center gap-2 uppercase tracking-wider"><Database size={14} /> Entity Config</h3>
                        <button onClick={() => setSelectedTableId(null)} className="text-slate-400 hover:text-white"><X size={16}/></button>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[9px] font-bold uppercase text-slate-500 block">Protocol Name</label>
                        <input className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-bold text-white focus:border-cyan-500 outline-none" value={data.tables.find(t => t.id === selectedTableId)?.name || ''} onChange={e => setData(prev => ({...prev, tables: prev.tables.map(t => t.id === selectedTableId ? {...t, name: e.target.value.toUpperCase()} : t)}))} />
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => addColumn(selectedTableId)} className="py-2.5 bg-cyan-600 text-white rounded-lg text-xs font-bold uppercase"><Plus size={14} className="inline mr-1" /> Field</button>
                            <button onClick={() => handleDeleteTable(selectedTableId, data.tables.find(t => t.id === selectedTableId)?.name || 'Unknown')} className="py-2.5 border border-slate-800 text-rose-500 rounded-lg text-xs font-bold uppercase hover:bg-rose-500/10 transition-colors"><Trash2 size={14} className="inline mr-1" /> Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedColumnId && selectedColumn && (
                <div className="animate-in slide-in-from-left-2 duration-300 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h3 className="text-xs font-bold text-emerald-600 flex items-center gap-2 uppercase tracking-wider"><Settings2 size={14} /> Attribute Profile</h3>
                        <button onClick={() => setSelectedColumnId(null)} className="text-slate-400 hover:text-white"><X size={16}/></button>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[9px] font-bold uppercase text-slate-500 block">Property Name</label>
                        <input className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-mono text-white focus:border-cyan-500 outline-none" value={selectedColumn.name} onChange={e => updateColumn(selectedColumnId.tableId, selectedColumnId.colId, { name: e.target.value.toLowerCase() })} />
                        <label className="text-[9px] font-bold uppercase text-slate-500 block">Data Type</label>
                        <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs text-white outline-none" value={selectedColumn.type} onChange={e => updateColumn(selectedColumnId.tableId, selectedColumnId.colId, { type: e.target.value })}>
                            <option value="UUID">UUID</option><option value="INT">INT</option><option value="VARCHAR">VARCHAR</option><option value="TEXT">TEXT</option><option value="BOOLEAN">BOOLEAN</option><option value="DATETIME">DATETIME</option>
                        </select>
                        <div className="space-y-2 pt-2">
                             <button onClick={() => updateColumn(selectedColumnId.tableId, selectedColumnId.colId, { isPrimary: !selectedColumn.isPrimary })} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${selectedColumn.isPrimary ? 'bg-amber-950/20 border-amber-500 text-amber-400' : 'border-slate-800 text-slate-500'}`}>
                                <span className="flex items-center gap-2"><Key size={14} /> Primary Key</span>
                                {selectedColumn.isPrimary && <Check size={14} />}
                             </button>
                             <button onClick={() => updateColumn(selectedColumnId.tableId, selectedColumnId.colId, { isConnectable: !selectedColumn.isConnectable })} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${selectedColumn.isConnectable ? 'bg-cyan-950/20 border-cyan-500 text-cyan-400' : 'border-slate-800 text-slate-500'}`}>
                                <span className="flex items-center gap-2"><Link2 size={14} /> Connectable</span>
                                {selectedColumn.isConnectable && <Check size={14} />}
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        {/* Sync Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex flex-col gap-2">
            <button 
              onClick={syncToBackend} 
              disabled={isSyncing}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <Server size={16} />}
              Sync to Backend
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="py-2.5 bg-white/5 border border-slate-800 text-slate-500 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all"><Upload size={14} className="inline mr-1"/> Import</button>
              <button onClick={() => { const blob = new Blob([generateSQL()], { type: 'text/plain' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `schema.sql`; link.click(); }} className="py-2.5 bg-white/5 border border-slate-800 text-slate-500 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all"><FileCode size={14} className="inline mr-1"/> SQL File</button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (evt) => {
                try { setData(JSON.parse(evt.target?.result as string)); onNotify("Blueprint imported."); } catch(e) { onNotify("Invalid Blueprint file."); }
              };
              reader.readAsText(file);
            }} />
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col" onClick={() => setActiveMenuId(null)}>
        {viewMode === 'code' ? (
            <div className="flex-1 p-10 overflow-auto bg-[#050505] custom-scrollbar">
                <pre className="p-8 bg-[#020617] border border-slate-800 rounded-2xl text-[13px] font-mono text-cyan-500/90 shadow-xl overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
            </div>
        ) : viewMode === 'sql' ? (
            <div className="flex-1 p-10 overflow-auto bg-[#050505] custom-scrollbar">
                <pre className="p-8 bg-[#020617] border border-slate-800 rounded-2xl text-[13px] font-mono text-emerald-500/90 shadow-xl overflow-x-auto">{generateSQL()}</pre>
            </div>
        ) : (
            <div ref={canvasRef} className="flex-1 relative schema-canvas overflow-auto custom-scrollbar">
                <svg className="absolute inset-0 pointer-events-none z-0" style={{ width: 5000, height: 5000 }}>
                    <defs>
                        <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                            <path d="M0,0 L0,10 L10,5 Z" fill="#06b6d4" />
                        </marker>
                    </defs>
                    {data.relationships.map(rel => {
                        const start = getDotCoords(rel.fromTableId, rel.fromColumnId);
                        const end = getDotCoords(rel.toTableId, rel.toColumnId);
                        return <path key={rel.id} d={`M ${start.x} ${start.y} C ${start.x + 100} ${start.y}, ${end.x - 100} ${end.y}, ${end.x} ${end.y}`} fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrow)" opacity="0.6" />;
                    })}
                    {activeConn && (
                        <path d={`M ${activeConn.x} ${activeConn.y} C ${activeConn.x + 50} ${activeConn.y}, ${currentMousePos.x - 50} ${currentMousePos.y}, ${currentMousePos.x} ${currentMousePos.y}`} fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="5,5" opacity="0.8" />
                    )}
                </svg>

                {data.tables.map((table) => (
                    <div key={table.id} onMouseDown={e => handleTableMouseDown(e, table)} style={{ left: table.x, top: table.y, transform: draggedTableId === table.id ? 'scale(1.03)' : 'scale(1)' }} className={`absolute min-w-[240px] bg-slate-900/95 border-2 rounded-xl shadow-xl transition-all duration-150 z-10 ${selectedTableId === table.id ? 'border-cyan-500 ring-4 ring-cyan-500/10' : 'border-slate-800'}`}>
                        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between rounded-t-xl relative">
                            <div className="flex items-center gap-2 flex-1 mr-2">
                                <Database size={12} className="text-cyan-500" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white font-mono truncate">{table.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={e => { e.stopPropagation(); setActiveMenuId(activeMenuId === table.id ? null : table.id); }} className="btn-action p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Table Actions"><Settings size={14} /></button>
                                
                                {/* Entity Actions Dropdown */}
                                {activeMenuId === table.id && (
                                    <div className="absolute right-0 top-full mt-1 w-40 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => addColumn(table.id)} className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase text-slate-300 hover:bg-emerald-600 hover:text-white flex items-center gap-2">
                                            <Plus size={12} /> Add Field
                                        </button>
                                        <button onClick={() => handleDeleteTable(table.id, table.name)} className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase text-rose-500 hover:bg-rose-600 hover:text-white flex items-center gap-2">
                                            <Trash2 size={12} /> Delete Entity
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="py-2">
                            {table.columns.map(col => {
                                const isSelected = selectedColumnId?.colId === col.id;
                                const isConnectable = col.isPrimary || col.isForeignKey || col.isConnectable;
                                return (
                                    <div key={col.id} className={`px-4 py-2.5 flex items-center justify-between text-xs cursor-pointer border-l-2 relative group/col ${isSelected ? 'bg-cyan-900/30 text-cyan-300 border-cyan-500' : 'hover:bg-white/5 text-slate-400 border-transparent'}`} onClick={e => { e.stopPropagation(); setSelectedColumnId({tableId: table.id, colId: col.id}); setSelectedTableId(null); setActiveMenuId(null); }}>
                                        {isConnectable && (
                                            <div onMouseDown={e => handleDotMouseDown(e, table.id, col.id)} onMouseEnter={() => setHoveredDot({ tableId: table.id, colId: col.id })} onMouseLeave={() => setHoveredDot(null)} className="connection-handle absolute -right-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-cyan-500 border-2 border-slate-900 shadow-sm opacity-0 group-hover/col:opacity-100 transition-opacity cursor-crosshair z-20" />
                                        )}
                                        <div className="flex items-center gap-2">
                                            {col.isPrimary ? <Fingerprint size={12} className="text-amber-500" /> : <Type size={12} className="text-slate-400" />}
                                            <span className={`font-bold tracking-tight ${isSelected ? 'text-white' : ''}`}>{col.name}</span>
                                        </div>
                                        <span className="text-[9px] font-mono uppercase bg-black/60 px-2 py-0.5 rounded border border-slate-800">{col.type}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Global Action Bar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-800 px-8 py-4 rounded-full shadow-2xl flex items-center gap-8 z-50">
            <button onClick={() => setIsSnapping(!isSnapping)} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isSnapping ? 'text-cyan-600' : 'text-slate-400'}`}><Grid3X3 size={16} /> Grid: {isSnapping ? 'SNAP' : 'FREE'}</button>
            <div className="w-px h-6 bg-slate-800" />
            <button onClick={() => setData({ tables: [], relationships: [] })} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500"><Trash size={16} /> Wipe Blueprint</button>
        </div>
      </div>
    </div>
  );
};

const plugin = { Component: SchemaBuilder };
export default plugin;
