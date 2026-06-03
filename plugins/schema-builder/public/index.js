
(function(global) {
  const React = global.React;
  const { useState, useRef, useEffect, useMemo, useCallback } = React;
  const Lucide = global.Lucide;

  const SCHEMA_STEP_ID = 'architect_schema_data';
  const GRID_SIZE = 20;

  const SchemaBuilder = ({ project, onSave, theme, onNotify }) => {
    const schemaStep = (project.steps || []).find(s => s.id === SCHEMA_STEP_ID);
    const [viewMode, setViewMode] = useState('visual');
    const [selectedTableId, setSelectedTableId] = useState(null);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [isSnapping, setIsSnapping] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const [draggedTableId, setDraggedTableId] = useState(null);

    const initialData = useMemo(() => {
      if (schemaStep && schemaStep.content) {
        try { return JSON.parse(schemaStep.content); } catch (e) { return { tables: [], relationships: [] }; }
      }
      return { tables: [], relationships: [] };
    }, [schemaStep]);

    const [data, setData] = useState(initialData);

    const generateSQL = () => {
      let sql = `-- Architect Export\n`;
      data.tables.forEach(t => {
        sql += `CREATE TABLE ${t.name} (\n`;
        sql += t.columns.map(c => `  ${c.name} ${c.type}`).join(',\n');
        sql += `\n);\n\n`;
      });
      return sql;
    };

    const syncToBackend = async () => {
      setIsSyncing(true);
      try {
        const response = await fetch('/__system/architect/save-sql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: generateSQL(), filename: 'schema.sql' })
        });
        if (response.ok) onNotify("Backend Sync Success.");
      } catch (e) {
        onNotify("Backend Sync Error.");
      } finally {
        setIsSyncing(false);
      }
    };

    const handleDeleteTable = (id, name) => {
        if (confirm(`Delete table ${name}?`)) {
            setData(prev => ({ ...prev, tables: prev.tables.filter(t => t.id !== id) }));
            setActiveMenuId(null);
            onNotify("Entity deleted.");
        }
    };

    const addColumn = (id) => {
        setData(prev => ({
            ...prev,
            tables: prev.tables.map(t => t.id === id ? { ...t, columns: [...t.columns, { id: 'col_'+Date.now(), name: 'new', type: 'VARCHAR' }] } : t)
        }));
        setActiveMenuId(null);
    };

    useEffect(() => {
      if (JSON.stringify(data) === JSON.stringify(initialData)) return;
      const timer = setTimeout(() => {
        const updatedSteps = [...(project.steps || [])];
        const idx = updatedSteps.findIndex(s => s.id === SCHEMA_STEP_ID);
        const newStep = {
          id: SCHEMA_STEP_ID, title: 'Architect Schema Store', category: 'backend', status: 'completed', content: JSON.stringify(data), createdAt: Date.now()
        };
        if (idx > -1) updatedSteps[idx] = newStep;
        else updatedSteps.push(newStep);
        onSave({ ...project, steps: updatedSteps });
      }, 800);
      return () => clearTimeout(timer);
    }, [data, project, onSave, initialData]);

    const handleMouseMove = useCallback((e) => {
      if (!draggedTableId) return;
      let newX = e.clientX - dragOffset.current.x;
      let newY = e.clientY - dragOffset.current.y;
      if (isSnapping) {
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
      }
      setData(prev => ({
        ...prev,
        tables: prev.tables.map(t => t.id === draggedTableId ? { ...t, x: newX, y: newY } : t)
      }));
    }, [draggedTableId, isSnapping]);

    useEffect(() => {
      const handleMouseUp = () => setDraggedTableId(null);
      if (draggedTableId) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [draggedTableId, handleMouseMove]);

    const addTable = () => {
      const id = 'tbl_' + Date.now();
      const newTable = {
        id, name: 'NEW_ENTITY', x: 100, y: 100,
        columns: [{ id: 'col_' + Date.now(), name: 'id', type: 'UUID', isPrimary: true }]
      };
      setData(prev => ({ ...prev, tables: [...prev.tables, newTable] }));
      setSelectedTableId(id);
    };

    return React.createElement('div', { className: "flex h-full bg-slate-50 dark:bg-black text-slate-900 dark:text-white", onClick: () => setActiveMenuId(null) },
      React.createElement('div', { className: "w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col p-6 shadow-xl z-20", onClick: e => e.stopPropagation() },
        React.createElement('h2', { className: "text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2" }, 
          React.createElement(Lucide.Zap, { size: 14, className: "text-cyan-500" }), "Blueprint v2.0"),
        React.createElement('button', { 
            onClick: addTable,
            className: "w-full py-3 bg-cyan-600 text-white rounded-xl text-xs font-bold uppercase mb-4 active:scale-95 transition-all"
        }, "+ Manual Entity"),
        React.createElement('button', { 
            onClick: syncToBackend,
            disabled: isSyncing,
            className: "w-full py-3 border border-slate-700 text-cyan-400 rounded-xl text-xs font-bold uppercase mb-6 flex items-center justify-center gap-2"
        }, isSyncing ? "Syncing..." : "Sync to Backend"),
        selectedTableId && React.createElement('div', { className: "pt-6 border-t border-slate-800" },
            React.createElement('label', { className: "text-[9px] uppercase font-bold text-slate-500 mb-2 block" }, "Entity Name"),
            React.createElement('input', { 
                value: data.tables.find(t => t.id === selectedTableId)?.name || '', 
                onChange: e => setData(prev => ({...prev, tables: prev.tables.map(t => t.id === selectedTableId ? {...t, name: e.target.value.toUpperCase()} : t)})),
                className: "w-full p-3 bg-black border border-slate-800 rounded-lg text-sm font-bold outline-none focus:border-cyan-500"
            })
        )
      ),
      React.createElement('div', { className: "flex-1 relative overflow-hidden flex flex-col" },
        React.createElement('div', { className: "flex-1 relative schema-canvas overflow-auto" },
          data.tables.map(table => React.createElement('div', {
              key: table.id,
              onMouseDown: (e) => {
                if (e.target.closest('.btn-action')) return;
                setDraggedTableId(table.id);
                setSelectedTableId(table.id);
                setActiveMenuId(null);
                dragOffset.current = { x: e.clientX - table.x, y: e.clientY - table.y };
              },
              style: { left: table.x, top: table.y, position: 'absolute' },
              className: `w-56 bg-slate-900 border-2 rounded-xl shadow-lg cursor-grab active:cursor-grabbing transition-all ${selectedTableId === table.id ? 'border-cyan-500' : 'border-slate-800'}`
          },
              React.createElement('div', { className: "p-3 bg-slate-800 border-b border-inherit flex justify-between items-center rounded-t-xl relative" }, 
                React.createElement('span', { className: "font-bold text-[10px] uppercase tracking-wider text-white" }, table.name),
                React.createElement('div', { className: "flex items-center gap-1" },
                  React.createElement('button', { 
                    onClick: e => { e.stopPropagation(); setActiveMenuId(activeMenuId === table.id ? null : table.id); },
                    className: "btn-action text-slate-400 hover:text-white" 
                  }, React.createElement(Lucide.Settings, { size: 12 })),
                  activeMenuId === table.id && React.createElement('div', { 
                    className: "absolute right-0 top-full mt-1 w-32 bg-slate-900 border border-slate-700 rounded shadow-xl z-50 py-1 font-sans",
                    onClick: e => e.stopPropagation()
                  }, 
                    React.createElement('button', { 
                        onClick: () => addColumn(table.id),
                        className: "w-full px-3 py-1.5 text-left text-[9px] uppercase font-bold text-slate-300 hover:bg-emerald-600 hover:text-white"
                    }, "Add Field"),
                    React.createElement('button', { 
                        onClick: () => handleDeleteTable(table.id, table.name),
                        className: "w-full px-3 py-1.5 text-left text-[9px] uppercase font-bold text-rose-500 hover:bg-rose-600 hover:text-white"
                    }, "Delete Entity")
                  )
                )
              ),
              React.createElement('div', { className: "p-3 space-y-2" }, 
                  table.columns.map(c => React.createElement('div', { key: c.id, className: "text-[11px] font-mono flex justify-between items-center" }, 
                      React.createElement('div', { className: "flex items-center gap-1" }, 
                        c.isPrimary && React.createElement(Lucide.Key, { size: 10, className: "text-amber-500" }),
                        React.createElement('span', { className: "text-slate-300" }, c.name)
                      ),
                      React.createElement('span', { className: "text-[9px] bg-black/50 px-1.5 py-0.5 rounded text-slate-500" }, c.type)
                  ))
              )
          ))
        )
      )
    );
  };

  global.GalagaPlugin_SchemaBuilder = { Component: SchemaBuilder };
})(window);
