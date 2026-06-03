
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Database, Key, Trash2, Upload, 
  Settings2, X, Save, RefreshCw, Grid3X3, Trash, Box, Type, 
  Fingerprint, Link2, Sparkles, Send, FileCode, Server, Settings,
  MousePointer2, Move, Info
} from 'lucide-react';
import { Project, SchemaData, Table, Column, Step, Relationship } from '../types';
import { GoogleGenAI, Type as SchemaType } from "@google/genai";

interface ArchitectViewProps {
  project: Project;
  onSave: (updatedProject: Project) => void;
  theme: 'light' | 'dark';
}

const SCHEMA_STEP_ID = 'architect_schema_data';
const GRID_SIZE = 20;

const ArchitectView: React.FC<ArchitectViewProps> = ({ project, onSave, theme }) => {
  const schemaStep = (project.steps || []).find(s => s.id === SCHEMA_STEP_ID);
  const [viewMode, setViewMode] = useState<'visual' | 'code' | 'sql'>('visual');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<{tableId: string, colId: string} | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [seedDataStr, setSeedDataStr] = useState('[]');
  const [isSnapping, setIsSnapping] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const initialData: SchemaData = useMemo(() => {
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

  // Derived state: which tables and columns are connected to the currently selected column?
  const connectedInfo = useMemo(() => {
    if (!selectedColumnId) return { tableIds: new Set<string>(), colIds: new Set<string>() };
    const tableIds = new Set<string>();
    const colIds = new Set<string>();
    data.relationships.forEach(rel => {
      if (rel.fromColumnId === selectedColumnId.colId) {
        tableIds.add(rel.toTableId);
        colIds.add(rel.toColumnId);
      } else if (rel.toColumnId === selectedColumnId.colId) {
        tableIds.add(rel.fromTableId);
        colIds.add(rel.fromColumnId);
      }
    });
    return { tableIds, colIds };
  }, [selectedColumnId, data.relationships]);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

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
        notify("Schema synchronized to server disk storage.");
      } else {
        throw new Error("Backend reject.");
      }
    } catch (e) {
      notify("Backend connection failed. Local save only.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-preview',
        contents: `Generate a database table structure for a "${aiPrompt}". Return only the JSON object. Use standard SQL types for the columns.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING, description: "The name of the database table (uppercase snake_case)" },
              columns: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    name: { type: SchemaType.STRING, description: "Column name in lowercase snake_case" },
                    type: { type: SchemaType.STRING, description: "Standard SQL type e.g. VARCHAR, INT, UUID, DATETIME" },
                    isPrimary: { type: SchemaType.BOOLEAN, description: "Is this the primary key?" },
                    isNullable: { type: SchemaType.BOOLEAN, description: "Can this column be null?" }
                  },
                  required: ["name", "type", "isPrimary", "isNullable"]
                }
              }
            },
            required: ["name", "columns"]
          }
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
        notify(`AI Entity "${newTable.name}" synthesized.`);
      }
    } catch (e: any) {
      console.error(e);
      notify("AI generation failed. Check API connectivity.");
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTableId) {
      const table = data.tables.find(t => t.id === selectedTableId);
      if (table) {
        setSeedDataStr(JSON.stringify(table.rows || [], null, 2));
      }
    }
  }, [selectedTableId]);

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
        cardinality: '1:1'
      };
      
      const isSelf = newRel.fromColumnId === newRel.toColumnId;
      const exists = data.relationships.some(r => 
        (r.fromColumnId === newRel.fromColumnId && r.toColumnId === newRel.toColumnId) ||
        (r.fromColumnId === newRel.toColumnId && r.toColumnId === newRel.fromColumnId)
      );

      if (!exists && !isSelf) {
        setData(prev => ({ ...prev, relationships: [...prev.relationships, newRel] }));
        notify("Relationship mapped.");
      }
    }
    setDraggedTableId(null);
    setActiveConn(null);
  }, [activeConn, hoveredDot, data.relationships]);

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
    const x = table.x; 
    const y = table.y + 51 + (colIdx * 41) + 20; 
    return { x, y };
  };

  const handleTableMouseDown = (e: React.MouseEvent, table: Table) => {
    if ((e.target as HTMLElement).closest('.btn-action')) return;
    if ((e.target as HTMLElement).closest('.connection-handle')) return;
    
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
    const coords = getDotCoords(tableId, colId);
    setActiveConn({ tableId, colId, x: coords.x, y: coords.y });
    setCurrentMousePos({ x: coords.x, y: coords.y });
  };

  const addColumn = (tableId: string) => {
    const colId = `col_${Date.now()}`;
    setData(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.id === tableId ? {
        ...t,
        columns: [...t.columns, { 
          id: colId, name: 'new_field', type: 'VARCHAR', 
          isPrimary: false, isForeignKey: false, isNullable: true, isConnectable: true
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
    setData(prev => ({
      ...prev,
      tables: prev.tables.filter(t => t.id !== tableId),
      relationships: prev.relationships.filter(r => r.fromTableId !== tableId && r.toTableId !== tableId)
    }));
    if (selectedTableId === tableId) setSelectedTableId(null);
    setActiveMenuId(null);
    notify(`${tableName} decommissioned.`);
  };

  const selectedColumn = useMemo(() => {
    if (!selectedColumnId) return null;
    return data.tables.find(t => t.id === selectedColumnId.tableId)?.columns.find(c => c.id === selectedColumnId.colId) || null;
  }, [selectedColumnId, data.tables]);

  const handleAddManualTable = () => {
    const id = `tbl_${Date.now()}`;
    const newTable: Table = {
      id,
      name: 'NEW_ENTITY',
      x: 100 + (data.tables.length * 20),
      y: 100 + (data.tables.length * 20),
      columns: [
        { id: `col_${Date.now()}_id`, name: 'id', type: 'UUID', isPrimary: true, isForeignKey: false, isNullable: false, isConnectable: true }
      ]
    };
    setData(prev => ({ ...prev, tables: [...prev.tables, newTable] }));
    setSelectedTableId(id);
    notify("Entity initialized.");
  };

  return (
    <div className="flex h-full min-h-[950px] bg-slate-50 dark:bg-[#050505] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl relative">
      {/* Sidebar */}
      <div className="w-[450px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#020617] z-20 shadow-xl shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/30">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300 flex items-center gap-2">
              <Database size={14} className="text-cyan-500 dark:text-cyan-400" /> SCHEMA BUILDER
            </h2>
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                <button onClick={() => setViewMode('visual')} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${viewMode === 'visual' ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Vis</button>
                <button onClick={() => setViewMode('code')} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${viewMode === 'code' ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>JS</button>
                <button onClick={() => setViewMode('sql')} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${viewMode === 'sql' ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>SQL</button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {!selectedTableId && !selectedColumnId && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300 flex items-center gap-2"><Box size={12} /> Toolbox</h3>
                  <button 
                    onClick={handleAddManualTable}
                    className="group w-full p-6 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center hover:border-cyan-500 transition-all"
                  >
                    <Plus size={24} className="text-slate-400 group-hover:text-cyan-500 mb-2" />
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-cyan-600 uppercase tracking-widest">New Entity</span>
                  </button>
                </div>
              </div>
            )}

            {selectedTableId && (
                <div className="animate-in slide-in-from-left-2 duration-300 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h3 className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-2 uppercase tracking-wider"><Database size={14} /> Entity Config</h3>
                        <button onClick={() => { setSelectedTableId(null); setSelectedColumnId(null); }} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={16}/></button>
                    </div>
                    <div className="space-y-4">
                        <div className="flex flex-col">
                            <input className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-t-lg p-3 text-sm font-bold text-slate-900 dark:text-white focus:border-cyan-500 focus:relative focus:z-10 outline-none" value={data.tables.find(t => t.id === selectedTableId)?.name || ''} onChange={e => setData(prev => ({...prev, tables: prev.tables.map(t => t.id === selectedTableId ? {...t, name: e.target.value.toUpperCase()} : t)}))} />
                            <button onClick={() => addColumn(selectedTableId)} className="w-full py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-t-0 border-slate-200 dark:border-slate-800 rounded-b-lg text-xs font-bold uppercase text-cyan-600 dark:text-cyan-400 transition-colors flex items-center justify-center">
                                <Plus size={14} className="inline mr-1" /> Add Field
                            </button>
                        </div>
                        
                        {selectedColumnId && selectedColumn && (
                            <div className="animate-in slide-in-from-top-2 duration-300 space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between pb-2">
                                    <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 uppercase tracking-wider"><Settings2 size={14} /> Attribute Profile</h3>
                                    <button onClick={() => setSelectedColumnId(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={16}/></button>
                                </div>
                                <div className="space-y-4">
                                    <input className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-900 dark:text-white focus:border-cyan-500 outline-none" value={selectedColumn.name} onChange={e => updateColumn(selectedColumnId.tableId, selectedColumnId.colId, { name: e.target.value.toLowerCase() })} />
                                    <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-900 dark:text-white outline-none" value={selectedColumn.type} onChange={e => updateColumn(selectedColumnId.tableId, selectedColumnId.colId, { type: e.target.value })}>
                                        <option value="UUID">UUID</option><option value="INT">INT</option><option value="VARCHAR">VARCHAR</option><option value="TEXT">TEXT</option><option value="BOOLEAN">BOOLEAN</option><option value="DATETIME">DATETIME</option>
                                    </select>
                                    <div className="space-y-2 pt-2">
                                         <button onClick={() => updateColumn(selectedColumnId.tableId, selectedColumnId.colId, { isPrimary: !selectedColumn.isPrimary })} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${selectedColumn.isPrimary ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-500 text-amber-600 dark:text-amber-400' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                            <span className="flex items-center gap-2"><Key size={14} /> Primary Key</span>
                                         </button>
                                         <button onClick={() => updateColumn(selectedColumnId.tableId, selectedColumnId.colId, { isConnectable: !selectedColumn.isConnectable })} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${selectedColumn.isConnectable ? 'bg-cyan-50 dark:bg-cyan-950/20 border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                            <span className="flex items-center gap-2"><Link2 size={14} /> Connectable</span>
                                         </button>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        setData(prev => ({
                                          ...prev,
                                          tables: prev.tables.map(t => t.id === selectedColumnId.tableId ? {
                                            ...t,
                                            columns: t.columns.filter(c => c.id !== selectedColumnId.colId)
                                          } : t),
                                          relationships: prev.relationships.filter(r => r.fromColumnId !== selectedColumnId.colId && r.toColumnId !== selectedColumnId.colId)
                                        }));
                                        setSelectedColumnId(null);
                                      }}
                                      className="w-full py-2 border border-rose-900/30 text-rose-500 rounded-lg text-[9px] font-bold uppercase hover:bg-rose-500/10"
                                    >
                                      <Trash size={12} className="inline mr-1" /> Delete Field
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 uppercase tracking-wider"><Server size={14} /> Seed Data (JSON Array)</h3>
                            </div>
                            <textarea 
                               className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-900 dark:text-white focus:border-cyan-500 outline-none min-h-[320px] custom-scrollbar"
                               placeholder="[\n  {\n    &quot;id&quot;: &quot;...&quot;\n  }\n]"
                               value={seedDataStr}
                               onChange={e => {
                                   const val = e.target.value;
                                   setSeedDataStr(val);
                                   try {
                                       const parsed = JSON.parse(val);
                                       if (Array.isArray(parsed)) {
                                           setData(prev => ({...prev, tables: prev.tables.map(t => t.id === selectedTableId ? {...t, rows: parsed} : t)}));
                                       }
                                   } catch (err) {
                                       // Valid, we just don't save to document until valid
                                   }
                               }}
                            />
                            <p className="text-[9px] text-slate-400">Must be valid JSON array to update automatically.</p>
                        </div>

                        <button onClick={() => handleDeleteTable(selectedTableId, data.tables.find(t => t.id === selectedTableId)?.name || 'Unknown')} className="w-full py-2.5 border border-slate-200 dark:border-slate-800 text-rose-500 rounded-lg text-xs font-bold uppercase hover:bg-rose-500/10 transition-colors">
                            <Trash2 size={14} className="inline mr-1" /> Delete Entity
                        </button>
                    </div>
                </div>
            )}
        </div>
        
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex flex-col gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300 flex items-center gap-2"><Sparkles size={12} className="text-purple-500 dark:text-purple-400" /> AI Generator</label>
              <div className="relative">
                <textarea 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500 pr-10 min-h-[60px] resize-y custom-scrollbar"
                  placeholder="Describe a table..."
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiGenerate(); } }}
                />
                <button onClick={handleAiGenerate} disabled={isAiLoading || !aiPrompt.trim()} className="absolute right-2 bottom-2 text-purple-500 hover:text-purple-400 disabled:opacity-50 transition-colors">
                  {isAiLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>

            <button onClick={syncToBackend} disabled={isSyncing} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 active:scale-95">
              {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[9px] font-bold uppercase hover:bg-slate-200 dark:hover:bg-white/10"><Upload size={14} className="inline mr-1"/> Import</button>
              <button onClick={() => { const blob = new Blob([generateSQL()], { type: 'text/plain' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `schema.sql`; link.click(); }} className="py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[9px] font-bold uppercase hover:bg-slate-200 dark:hover:bg-white/10"><FileCode size={14} className="inline mr-1"/> SQL File</button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (evt) => {
                try { setData(JSON.parse(evt.target?.result as string)); notify("Blueprint imported."); } catch(e) { notify("Invalid Blueprint file."); }
              };
              reader.readAsText(file);
            }} />
        </div>
      </div>

      {/* Main Builder Canvas */}
      <div className="flex-1 relative overflow-hidden flex flex-col group/canvas" onClick={() => { setSelectedTableId(null); setSelectedColumnId(null); setActiveMenuId(null); }}>
        {viewMode === 'code' ? (
            <div className="flex-1 p-10 overflow-auto bg-[#050505] custom-scrollbar">
                <pre className="p-8 bg-[#020617] border border-slate-800 rounded-2xl text-[13px] font-mono text-cyan-500/90 shadow-xl overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
            </div>
        ) : viewMode === 'sql' ? (
            <div className="flex-1 p-10 overflow-auto bg-[#050505] custom-scrollbar">
                <pre className="p-8 bg-[#020617] border border-slate-800 rounded-2xl text-[13px] font-mono text-emerald-500/90 shadow-xl overflow-x-auto">{generateSQL()}</pre>
            </div>
        ) : (
            <div ref={canvasRef} className="flex-1 relative schema-canvas overflow-auto custom-scrollbar scroll-smooth">
                {/* Visual Guidelines Overlay */}
                <div className="absolute top-4 left-4 flex gap-4 pointer-events-none opacity-40">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"><MousePointer2 size={12}/> Left Click: Select</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"><Move size={12}/> Drag: Move Entity</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"><Link2 size={12}/> Dot Drag: Link Attributes</div>
                </div>

                <svg className="absolute inset-0 pointer-events-none z-0" style={{ width: 5000, height: 5000 }}>
                    <defs>
                      <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
                        <path d="M0,0 L0,8 L8,4 Z" fill="#06b6d4" />
                      </marker>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    
                    {/* Fixed Relationships */}
                    {data.relationships.map(rel => {
                        const start = getDotCoords(rel.fromTableId, rel.fromColumnId);
                        const end = getDotCoords(rel.toTableId, rel.toColumnId);
                        const midX = (start.x + end.x) / 2;
                        // Determine if relationship is part of a selection highlighting
                        const isActive = selectedColumnId && (rel.fromColumnId === selectedColumnId.colId || rel.toColumnId === selectedColumnId.colId);

                        return (
                          <g 
                            key={rel.id} 
                            className="group/rel cursor-pointer pointer-events-auto" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setData(prev => ({ ...prev, relationships: prev.relationships.filter(r => r.id !== rel.id) }));
                              notify("Connection deleted.");
                            }}
                          >
                            <path 
                              d={`M ${start.x} ${start.y} C ${start.x - 100} ${start.y}, ${end.x + 100} ${end.y}, ${end.x} ${end.y}`} 
                              fill="none" 
                              stroke={isActive ? "#22d3ee" : "#06b6d4"} 
                              strokeWidth={isActive ? "4" : "2.5"} 
                              strokeLinecap="round"
                              markerEnd="url(#arrow)" 
                              opacity={isActive ? "1" : "0.7"}
                              filter={isActive ? "url(#glow)" : "none"}
                              className="transition-all duration-300 group-hover/rel:stroke-rose-500"
                            />
                            {/* Delete Node Connector Element via hover */}
                            <g className="transition-opacity duration-300 opacity-0 group-hover/rel:opacity-100">
                                <circle 
                                  cx={midX} 
                                  cy={(start.y + end.y)/2} 
                                  r="12" 
                                  fill="#020617" 
                                  stroke="#f43f5e" 
                                  strokeWidth="2" 
                                />
                                <text 
                                  x={midX} 
                                  y={(start.y + end.y)/2} 
                                  fill="#f43f5e" 
                                  fontSize="16" 
                                  fontWeight="bold" 
                                  textAnchor="middle" 
                                  dominantBaseline="central" 
                                  pointerEvents="none"
                                >
                                  ×
                                </text>
                            </g>
                          </g>
                        );
                    })}
                    
                    {/* Ghost Connection while dragging */}
                    {activeConn && (
                        <path 
                          d={`M ${activeConn.x} ${activeConn.y} C ${activeConn.x - 100} ${activeConn.y}, ${currentMousePos.x + 100} ${currentMousePos.y}, ${currentMousePos.x} ${currentMousePos.y}`} 
                          fill="none" 
                          stroke="#06b6d4" 
                          strokeWidth="2" 
                          strokeDasharray="6,6" 
                          opacity="0.6" 
                        />
                    )}
                </svg>

                {/* Ghost Entity while AI is generating */}
                {isAiLoading && (
                    <div 
                        style={{ 
                          left: 100 + (data.tables.length * 40), 
                          top: 100 + (data.tables.length * 40), 
                          zIndex: 40
                        }} 
                        className="absolute w-[240px] bg-purple-950/20 border-2 border-purple-500/30 rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.15)] backdrop-blur-sm overflow-hidden animate-pulse"
                    >
                       <div className="px-4 py-3 border-b border-purple-500/20 flex items-center justify-between bg-purple-900/10">
                          <div className="flex items-center gap-2">
                              <Sparkles size={12} className="text-purple-400" />
                              <div className="h-3 w-24 bg-purple-500/30 rounded" />
                          </div>
                          <div className="h-3 w-4 bg-purple-500/20 rounded" />
                       </div>
                       <div className="py-3 px-4 space-y-4">
                           {[1, 2, 3].map(i => (
                               <div key={i} className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded bg-purple-500/30" />
                                  <div className="flex-1 space-y-2">
                                      <div className="h-2 w-full bg-purple-500/20 rounded" />
                                      <div className="h-2 w-1/2 bg-purple-500/10 rounded" />
                                  </div>
                               </div>
                           ))}
                       </div>
                       <div className="absolute inset-x-0 bottom-0 py-2 bg-gradient-to-t from-purple-900/40 to-transparent flex justify-center">
                          <span className="text-[9px] font-black tracking-widest text-purple-400/80 uppercase">Synthesizing...</span>
                       </div>
                    </div>
                )}

                {data.tables.map((table) => {
                    const isRelated = connectedInfo.tableIds.has(table.id);
                    const isDirectlySelected = selectedTableId === table.id;

                    return (
                        <div 
                            key={table.id} 
                            onMouseDown={e => handleTableMouseDown(e, table)} 
                            onClick={e => e.stopPropagation()}
                            style={{ 
                              left: table.x, 
                              top: table.y, 
                              transform: draggedTableId === table.id ? 'scale(1.02)' : 'scale(1)',
                              zIndex: isDirectlySelected || isRelated ? 50 : 10
                            }} 
                            className={`
                              absolute w-[240px] bg-white/95 dark:bg-slate-900/95 border-2 rounded-xl shadow-2xl transition-all duration-300 group/table backdrop-blur-md
                              ${isDirectlySelected ? 'border-cyan-500 ring-4 ring-cyan-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}
                              ${isRelated ? 'border-cyan-400 ring-8 ring-cyan-500/5 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.01]' : ''}
                            `}
                        >
                            {/* Table Header */}
                            <div className={`px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between rounded-t-xl relative transition-colors ${isRelated ? 'bg-cyan-50 dark:bg-cyan-950/20' : 'bg-slate-50/80 dark:bg-slate-950/50'}`}>
                                <div className="flex items-center gap-2 flex-1 mr-2 cursor-grab active:cursor-grabbing">
                                    <Database size={12} className={`transition-colors ${isDirectlySelected || isRelated ? 'text-cyan-500' : 'text-slate-500 dark:text-slate-400 group-hover/table:text-cyan-400'}`} />
                                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white font-mono truncate">{table.name}</span>
                                </div>
                                <button onClick={e => { e.stopPropagation(); setActiveMenuId(activeMenuId === table.id ? null : table.id); }} className="btn-action p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Actions"><Settings size={14} /></button>
                                
                                {activeMenuId === table.id && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-[100] py-1 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => addColumn(table.id)} className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase text-slate-300 hover:bg-cyan-600 flex items-center gap-2"><Plus size={12} /> Add Attribute</button>
                                        <button onClick={() => handleDeleteTable(table.id, table.name)} className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase text-rose-500 hover:bg-rose-600 hover:text-white flex items-center gap-2"><Trash2 size={12} /> Erase Entity</button>
                                    </div>
                                )}
                            </div>

                            {/* Table Columns */}
                            <div className="py-2">
                                {table.columns.map(col => {
                                    const isSelected = selectedColumnId?.colId === col.id;
                                    const isConnected = connectedInfo.colIds.has(col.id);
                                    // Specific logic for dot visibility
                                    const isTargetable = col.isPrimary || col.isConnectable;
                                    const hasDot = isTargetable || col.isForeignKey;
                                    
                                    // Highlight logic: when dragging, highlight valid targets (primary/connectable)
                                    const isBeingLinked = activeConn && isTargetable && activeConn.tableId !== table.id;

                                    return (
                                        <div 
                                            key={col.id} 
                                            className={`px-4 py-2.5 flex items-center justify-between text-xs cursor-pointer border-l-2 relative group/col transition-all ${isSelected ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-300 border-cyan-500' : isConnected ? 'bg-cyan-50/50 dark:bg-cyan-900/10 text-cyan-600 dark:text-cyan-400 border-cyan-400/50' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 border-transparent'}`} 
                                            onClick={e => { e.stopPropagation(); setSelectedColumnId({tableId: table.id, colId: col.id}); setSelectedTableId(table.id); }}
                                        >
                                            {/* Connection Dot (Left Side) */}
                                            {hasDot && (
                                              <div 
                                                  onMouseDown={e => handleDotMouseDown(e, table.id, col.id)} 
                                                  onMouseEnter={() => setHoveredDot({ tableId: table.id, colId: col.id })} 
                                                  onMouseLeave={() => setHoveredDot(null)} 
                                                  className={`
                                                    connection-handle absolute -left-[6.5px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-sm z-20 
                                                    transition-all cursor-crosshair border-2
                                                    ${isBeingLinked ? 'bg-cyan-400 border-white scale-125 animate-pulse opacity-100' : 'bg-slate-800 border-slate-700 opacity-0 group-hover/col:opacity-100 group-hover/table:opacity-100'}
                                                    hover:bg-cyan-500 hover:border-white hover:scale-125 active:scale-95
                                                  `}
                                              />
                                            )}

                                            <div className="flex items-center gap-2">
                                              {col.isPrimary ? <Fingerprint size={12} className="text-amber-500" /> : <Type size={12} className="text-slate-500 dark:text-slate-400" />}
                                              <span className={`font-bold tracking-tight ${isSelected ? 'text-slate-900 dark:text-white' : ''} ${isBeingLinked ? 'text-cyan-400' : ''}`}>{col.name}</span>
                                            </div>
                                            <span className="text-[9px] font-mono uppercase bg-slate-200 dark:bg-black/60 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-800/50 text-slate-600 dark:text-slate-400">{col.type}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {/* Floating Action Menu */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-8 py-4 rounded-full shadow-2xl flex items-center gap-8 z-50 backdrop-blur-md animate-in slide-in-from-bottom-4">
            <button onClick={() => setIsSnapping(!isSnapping)} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${isSnapping ? 'text-cyan-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}><Grid3X3 size={16} /> Grid: {isSnapping ? 'SNAP' : 'FREE'}</button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
            <button onClick={() => { if(confirm("Wipe entire blueprint state?")) setData({ tables: [], relationships: [] }); }} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors"><Trash size={16} /> Wipe Blueprint</button>
        </div>

        {notification && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase animate-in fade-in slide-in-from-top-4 shadow-xl z-[60] tracking-[0.1em]">
            {notification}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchitectView;
