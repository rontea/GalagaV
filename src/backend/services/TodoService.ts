import fs from 'fs';
import path from 'path';
import { TodoModel, Todo } from '../models/TodoModel';
import { getNewId } from '../utils/utils';

function normalizeWindowsPath(p: string | undefined): string | undefined {
  if (!p) return p;
  if (process.platform === 'win32') {
    const msysRegex = /^\/([a-zA-Z])(\/.*)?$/;
    const match = p.match(msysRegex);
    if (match) {
      const drive = match[1].toUpperCase();
      const rest = match[2] ? match[2].replace(/\//g, '\\') : '';
      return `${drive}:${rest || '\\'}`;
    }
  }
  return p;
}

function isAbsoluteSystemPath(p: string): boolean {
  return (
    path.isAbsolute(p) ||
    /^[a-zA-Z]:[/\\]/.test(p) ||
    p.startsWith('/') ||
    p.startsWith('\\')
  );
}

function resolveProjectBasePath(localFolderPath?: string): string | null {
  localFolderPath = normalizeWindowsPath(localFolderPath);

  if (!localFolderPath || localFolderPath.trim() === '') {
    return null;
  }

  if (isAbsoluteSystemPath(localFolderPath)) {
    return localFolderPath;
  }

  return path.resolve(process.cwd(), '..', localFolderPath.replace(/^[/\\]+/, ''));
}

export class TodoService {
  private static isSyncing = false;
  private static lastWriteTime = 0;

  static setSyncing(val: boolean) {
    this.isSyncing = val;
    if (val) this.lastWriteTime = Date.now();
  }

  static getSyncing() {
    // If we just wrote something, ignore events for 1 second to avoid feedback loops
    if (this.isSyncing) return true;
    if (Date.now() - this.lastWriteTime < 1000) return true;
    return false;
  }

  private static getSyncInProgress() {
    return this.isSyncing;
  }

  public static resolvePaths(
    todoFolderPath?: string,
    localFolderPath?: string,
    options: { allowAppFallback?: boolean } = {}
  ): string {
    todoFolderPath = normalizeWindowsPath(todoFolderPath);

    const baseDir = resolveProjectBasePath(localFolderPath);
    const hasLinkedProjectPath = !!localFolderPath && localFolderPath.trim() !== '';
    const hasTodoFolderPath = !!todoFolderPath && todoFolderPath.trim() !== '';

    if (hasLinkedProjectPath) {
      if (!baseDir) {
        throw new Error('Linked project folder path could not be resolved.');
      }
      if (!fs.existsSync(baseDir)) {
        throw new Error(`Linked project folder does not exist: ${baseDir}`);
      }
      if (!fs.statSync(baseDir).isDirectory()) {
        throw new Error(`Linked project path is not a directory: ${baseDir}`);
      }
    }

    let dirPath: string;
    if (hasTodoFolderPath) {
      if (isAbsoluteSystemPath(todoFolderPath)) {
        dirPath = todoFolderPath;
      } else if (baseDir) {
        dirPath = path.resolve(baseDir, todoFolderPath);
      } else if (options.allowAppFallback) {
        dirPath = path.resolve(process.cwd(), todoFolderPath);
      } else {
        throw new Error(
          `Todo Folder Path "${todoFolderPath}" is relative, but no Local Folder Path is linked. Set Local Folder Path to the existing project folder or use an absolute Todo Folder Path.`
        );
      }
    } else if (baseDir) {
      dirPath = path.resolve(baseDir, 'todo');
    } else if (options.allowAppFallback) {
      dirPath = path.resolve(process.cwd(), 'todo');
    } else {
      throw new Error('No Local Folder Path is linked. Todo files cannot be synced to the GalagaV app folder.');
    }

    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`[TodoService] Lazily created folder path: ${dirPath}`);
      }
    } catch (e) {
      console.error(`[TodoService] Failed to lazily create folder path: ${dirPath}`, e);
    }

    return dirPath;
  }

  static syncFromFiles(
    todoFolderPath?: string,
    localFolderPath?: string,
    collection?: string,
    options: { allowAppFallback?: boolean } = {}
  ): Todo[] {
    // Explicit API syncs should only be blocked by active work, not by the watcher debounce window.
    if (this.getSyncInProgress()) return TodoModel.getTodos();
    this.setSyncing(true);
    try {
      const syncCollection = collection || '';
      let dirPath = this.resolvePaths(todoFolderPath, localFolderPath, options);

    if (syncCollection) {
      dirPath = path.join(dirPath, syncCollection);
    }

    const mdFileName = syncCollection ? `todo-${syncCollection}.md` : 'TODO.md';
    const mdFilePath = path.join(dirPath, mdFileName);
    
    let content = '';
    if (fs.existsSync(mdFilePath)) {
      content = fs.readFileSync(mdFilePath, 'utf8');
    } else {
      // If the file does not exist, and there are database tasks, write them as initialization
      const allExistingTodos = TodoModel.getTodos();
      const currentCollectionTodos = allExistingTodos.filter(t => (t.collection || '') === syncCollection && !t.archivedAt);
      if (currentCollectionTodos.length > 0) {
        console.log(`[TodoService] TODO file not found at ${mdFilePath}. Auto-initializing directory and writing ${currentCollectionTodos.length} database tasks.`);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        this.updateMarkdownFileTodos(allExistingTodos, todoFolderPath, localFolderPath, true);
        currentCollectionTodos.forEach(t => this.writeTodoToIndividualFile(t, todoFolderPath, localFolderPath));
        if (fs.existsSync(mdFilePath)) {
          content = fs.readFileSync(mdFilePath, 'utf8');
        } else {
          return allExistingTodos;
        }
      } else {
        content = '';
      }
    }

    const firstIndex = content.search(/\[[ x]\] Title:/);
    
    let todoBlocks: string[] = [];
    if (firstIndex !== -1) {
      const todosText = content.substring(firstIndex);
      todoBlocks = todosText.split(/(?=\[[ x]\] Title: )/).filter(b => b.trim().length > 0);
    }
    
    const allExistingTodos = TodoModel.getTodos();
    const otherCollectionTodos = allExistingTodos.filter(t => (t.collection || '') !== syncCollection || t.archivedAt);
    const titleToTodo = new Map(allExistingTodos.filter(t => (t.collection || '') === syncCollection && !t.archivedAt).map(t => [t.title.trim().toLowerCase(), t]));
    
    const parsedTodos: Todo[] = [];
    const usedIds = new Set<string>();
    // We must avoid reusing IDs that exist in OTHER collections too
    otherCollectionTodos.forEach(t => usedIds.add(t.id));
    const seenTitlesInFile = new Set<string>();

    for (const block of todoBlocks) {
      const statusTitleMatch = block.match(/^\[([ x])\] Title: (.*?)\n/);
      if (!statusTitleMatch) continue;
      const isMarkedCompleted = statusTitleMatch[1] === 'x';
      const title = statusTitleMatch[2].trim();
      
      const lowerTitle = title.toLowerCase();
      if (seenTitlesInFile.has(lowerTitle)) continue;
      seenTitlesInFile.add(lowerTitle);
      
      const idMatch = block.match(/ID:\s*(todo-TD\d+)\n/);
      const idFromFile = idMatch ? idMatch[1].trim() : null;
      const existing = idFromFile ? allExistingTodos.find(t => t.id === idFromFile) : titleToTodo.get(lowerTitle);
      
      const dateMatch = block.match(/Date:\s*(.*?)\n/);
      const assignMatch = block.match(/Assign:\s*(.*?)\n/);
      
      let description = '';
      const descStart = block.indexOf('Description:');
      const typeStart = block.indexOf('Type:', descStart);
      if (descStart !== -1 && typeStart !== -1) {
        description = block.substring(descStart + 12, typeStart).trim();
      }
      
      const typeStatusMatch = block.match(/Type:\s*#(.*?)\s*\|\s*Status:\s*(.*?)\n/);
      
      let status = 'To Do';
      if (typeStatusMatch) {
        status = typeStatusMatch[2].trim();
      } else if (isMarkedCompleted) {
        status = 'Completed';
      }
      
      if (isMarkedCompleted) {
        status = 'Completed';
      }
      
      let subtask: { text: string; completed: boolean }[] = [];
      const subtaskStart = block.indexOf('Subtask:');
      const commentStart = block.indexOf('\nComment:');
      if (subtaskStart !== -1) {
        const endOfSubtasks = commentStart !== -1 ? commentStart : block.length;
        const subtaskStr = block.substring(subtaskStart + 8, endOfSubtasks);
        subtaskStr.split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('[ ]') || line.startsWith('[x]'))
          .forEach(line => {
            if (line.startsWith('[x]')) {
              subtask.push({ text: line.replace(/^\[x\]\s*/, '').trim(), completed: true });
            } else {
              subtask.push({ text: line.replace(/^\[ \]\s*/, '').trim(), completed: false });
            }
          });
      }
      
      let comments = '';
      if (commentStart !== -1) {
        comments = block.substring(commentStart + 9).trim();
      }
      
      let id = idFromFile || (existing ? existing.id : getNewId());
      
      while (usedIds.has(id)) {
        id = getNewId();
      }
      usedIds.add(id);

      if (existing && existing.id === id) {
        titleToTodo.delete(title.toLowerCase());
      }
      
      parsedTodos.push({
        id: id,
        title: title,
        date: dateMatch ? dateMatch[1].trim() : existing?.date || '',
        days: existing?.days || 0,
        description: description,
        type: typeStatusMatch ? typeStatusMatch[1].trim() : existing?.type || '',
        status: status,
        assign: assignMatch ? assignMatch[1].trim() : existing?.assign || 'Unassigned',
        subtask: subtask,
        comments: comments,
        commitMessage: existing?.commitMessage || '',
        collection: syncCollection // CRITICAL: Ensure collection is preserved
      });
    }

    if (todoBlocks.length === 0 && content.trim().length > 0) {
      const fallbackTodos = this.parseMarkdownChecklistTodos(content, allExistingTodos, syncCollection, usedIds, titleToTodo);
      fallbackTodos.forEach(todo => {
        const lowerTitle = todo.title.trim().toLowerCase();
        if (seenTitlesInFile.has(lowerTitle)) return;
        seenTitlesInFile.add(lowerTitle);
        parsedTodos.push(todo);
      });
    }

    // Update global list correctly
    const finalTodos = [...otherCollectionTodos, ...parsedTodos];
    TodoModel.saveAllTodos(finalTodos);

    // Also update individual files for this collection
    parsedTodos.forEach(t => this.writeTodoToIndividualFile(t, todoFolderPath, localFolderPath));
    
    // We don't call updateMarkdownFileTodos hier to avoid recursion but we should technically ensure the file is clean
    // Actually, syncFromFiles is often followed by a write to file elsewhere or by the user manually.
    // To be safe, we can trigger a CLEAN update of THIS file.
    this.updateMarkdownFileTodos(finalTodos, todoFolderPath, localFolderPath, true);
    
    return finalTodos;
    } finally {
      this.isSyncing = false;
    }
  }

  private static parseMarkdownChecklistTodos(
    content: string,
    allExistingTodos: Todo[],
    syncCollection: string,
    usedIds: Set<string>,
    titleToTodo: Map<string, Todo>
  ): Todo[] {
    const parsedTodos: Todo[] = [];
    const lines = content.split(/\r?\n/);
    let currentHeading = '';

    for (const line of lines) {
      const headingMatch = line.match(/^#{1,6}\s+(.+?)\s*$/);
      if (headingMatch) {
        currentHeading = headingMatch[1].trim();
        continue;
      }

      const itemMatch = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+?)\s*$/);
      if (!itemMatch) continue;

      const isMarkedCompleted = itemMatch[1].toLowerCase() === 'x';
      const rawText = itemMatch[2].trim();
      const titleMatch = rawText.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
      const title = (titleMatch ? titleMatch[1] : rawText).replace(/[`*_]+/g, '').trim();
      if (!title) continue;

      const lowerTitle = title.toLowerCase();
      const existing = titleToTodo.get(lowerTitle) || allExistingTodos.find(t =>
        (t.collection || '') === syncCollection && t.title.trim().toLowerCase() === lowerTitle
      );

      let id = existing?.id || getNewId();
      while (usedIds.has(id)) {
        id = getNewId();
      }
      usedIds.add(id);
      titleToTodo.delete(lowerTitle);

      parsedTodos.push({
        id,
        title,
        date: existing?.date || '',
        days: existing?.days || 0,
        description: titleMatch?.[2]?.trim() || currentHeading || existing?.description || '',
        type: existing?.type || '',
        status: isMarkedCompleted ? 'Completed' : existing?.status || 'To Do',
        assign: existing?.assign || 'Unassigned',
        subtask: existing?.subtask || [],
        comments: existing?.comments || '',
        commitMessage: existing?.commitMessage || '',
        timelineId: existing?.timelineId || '',
        collection: syncCollection
      });
    }

    return parsedTodos;
  }

  static addTodo(todo: Todo, todoFolderPath?: string, localFolderPath?: string) {
    TodoModel.saveTodo(todo);
    const todos = TodoModel.getTodos();
    this.updateMarkdownFileTodos(todos, todoFolderPath, localFolderPath, true);
    this.writeTodoToIndividualFile(todo, todoFolderPath, localFolderPath);
  }

  static updateTodo(todo: Todo, todoFolderPath?: string, localFolderPath?: string) {
    const existingTodos = TodoModel.getTodos();
    const oldTodo = existingTodos.find(t => t.id === todo.id);
    
    TodoModel.updateTodo(todo);
    const todos = TodoModel.getTodos();
    this.updateMarkdownFileTodos(todos, todoFolderPath, localFolderPath, true);

    if (oldTodo && oldTodo.collection !== todo.collection) {
      // Delete old file if collection changed
      let oldDirPath = this.resolvePaths(todoFolderPath, localFolderPath);

      if (oldTodo.collection) {
        oldDirPath = path.join(oldDirPath, oldTodo.collection);
      }
      
      const oldMdFilePath = path.join(oldDirPath, `todo-${todo.id}.md`);
      if (fs.existsSync(oldMdFilePath)) {
        try {
          fs.unlinkSync(oldMdFilePath);
          console.log(`Deleted old file due to collection move: ${oldMdFilePath}`);
        } catch (err) {
          console.error(`Failed to delete old file ${oldMdFilePath}:`, err);
        }
      }
    }

    this.writeTodoToIndividualFile(todo, todoFolderPath, localFolderPath);
  }

  static updateMarkdownFileTodos(todos: Todo[], todoFolderPath?: string, localFolderPath?: string, force: boolean = false) {
    if (this.getSyncing() && !force) return;
    this.setSyncing(true);
    try {
      let dirPath = this.resolvePaths(todoFolderPath, localFolderPath);

    console.log(`[TodoService] updateMarkdownFileTodos called with dirPath: ${dirPath}, todoFolderPath: ${todoFolderPath}, localFolderPath: ${localFolderPath}`);

    const collectionsMap = new Map<string, Todo[]>();
    // Always ensure the main TODO.md (empty collection) is processed
    collectionsMap.set('', []);
    
    // Also include all currently defined collections so their files get updated (cleared if empty)
    const existingCollections = TodoModel.getCollections();
    existingCollections.forEach(c => {
      if (c) collectionsMap.set(c, []);
    });

    todos.forEach(todo => {
      const col = todo.collection || '';
      if (!collectionsMap.has(col)) collectionsMap.set(col, []);
      collectionsMap.get(col)!.push(todo);
    });

    for (const [col, colTodos] of collectionsMap.entries()) {
      let currentDirPath = dirPath;
      let mdFileName = 'TODO.md';
      
      if (col) {
        currentDirPath = path.join(dirPath, col);
        mdFileName = `todo-${col}.md`;
      }

      const mdFilePath = path.join(currentDirPath, mdFileName);
      
      let headerText = '';
      const defaultHeaderText = col ? `# ${col} TODO\n\n` : `# Project TODO\n\n`;

      if (fs.existsSync(mdFilePath)) {
        const existingContent = fs.readFileSync(mdFilePath, 'utf8');
        const firstIndex = existingContent.search(/\[[ x]\] Title:/);
        if (firstIndex !== -1) {
          headerText = existingContent.substring(0, firstIndex);
        } else {
          headerText = existingContent;
        }
      } else {
        headerText = defaultHeaderText;
      }

      // Ensure header ends with enough newlines
      headerText = headerText.replace(/\s+$/, '');
      if (headerText.length > 0) {
        headerText += '\n\n';
      } else {
        headerText = defaultHeaderText;
      }

      let contents = headerText;
      colTodos.forEach((todo, index) => {
        const isCompleted = todo.status.toLowerCase() === 'completed';
        contents += `${isCompleted ? '[x]' : '[ ]'} Title: ${todo.title}\n`;
        contents += `ID: ${todo.id}\n`;
        contents += `Date: ${todo.date}\n`;
        contents += `Assign: ${todo.assign}\n\n`;
        
        contents += `Description: ${todo.description}\n\n`;
        
        contents += `Type: #${todo.type} | Status: ${todo.status}\n\n`;
        
        if (todo.subtask && todo.subtask.length > 0) {
          contents += `Subtask:\n`;
          todo.subtask.forEach(sub => contents += `${sub.completed ? '[x]' : '[ ]'} ${sub.text || ''}\n`);
        } else {
          contents += `Subtask:\n`;
        }
        
        contents += `\nComment:\n`;
        if (todo.comments && todo.comments.trim().length > 0) {
          contents += `${todo.comments}\n`;
        } else {
          contents += `\n`;
        }

        if (index < colTodos.length - 1) {
          contents += '\n'; // Separate multiple todos with blank line
        }
      });

      if (!fs.existsSync(currentDirPath)) {
        fs.mkdirSync(currentDirPath, { recursive: true });
      }
      fs.writeFileSync(mdFilePath, contents, 'utf8');
    }
    } finally {
      this.isSyncing = false;
    }
  }

  static readGlobalTodoFileContent(todoFolderPath?: string, localFolderPath?: string, collection?: string): string | null {
    let dirPath = this.resolvePaths(todoFolderPath, localFolderPath);
    
    if (collection) {
      dirPath = path.join(dirPath, collection);
    }

    const mdFileName = collection ? `todo-${collection}.md` : 'TODO.md';
    const mdFilePath = path.join(dirPath, mdFileName);
    if (fs.existsSync(mdFilePath)) {
      return fs.readFileSync(mdFilePath, 'utf8');
    }
    return null;
  }

  static readTodoFileContent(todo: Todo, todoFolderPath?: string, localFolderPath?: string): string | null {
    let dirPath = this.resolvePaths(todoFolderPath, localFolderPath);
    
    if (todo.collection) {
      dirPath = path.join(dirPath, todo.collection);
    }

    const mdFilePath = path.join(dirPath, `todo-${todo.id}.md`);
    if (fs.existsSync(mdFilePath)) {
      return fs.readFileSync(mdFilePath, 'utf8');
    }
    return null;
  }

  static writeTodoToIndividualFile(todo: Todo, todoFolderPath?: string, localFolderPath?: string) {
    let dirPath = this.resolvePaths(todoFolderPath, localFolderPath);
    
    if (todo.collection) {
      dirPath = path.join(dirPath, todo.collection);
    }

    const mdFilePath = path.join(dirPath, `todo-${todo.id}.md`);
    console.log(`Exporting TODO to: ${mdFilePath}`);
    
    const isCompleted = todo.status.toLowerCase() === 'completed';
    let contents = `${isCompleted ? '[x]' : '[ ]'} Title: ${todo.title}\n`;
    contents += `ID: ${todo.id}\n`;
    contents += `Date: ${todo.date}\n`;
    contents += `Assign: ${todo.assign}\n\n`;
    
    contents += `Description: ${todo.description}\n\n`;
    
    contents += `Type: #${todo.type} | Status: ${todo.status}\n\n`;
    
    if (todo.subtask && todo.subtask.length > 0) {
      contents += `Subtask:\n`;
      todo.subtask.forEach(sub => contents += `${sub.completed ? '[x]' : '[ ]'} ${sub.text || ''}\n`);
    } else {
      contents += `Subtask:\n`;
    }
    
    contents += `\nComment:\n`;
    if (todo.comments && todo.comments.trim().length > 0) {
      contents += `${todo.comments}\n`;
    } else {
      contents += `\n`;
    }

    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
      }
      fs.writeFileSync(mdFilePath, contents, 'utf8');
      console.log(`File written successfully: ${mdFilePath}`);
    } catch (err) {
      console.error(`Failed to write todo-${todo.id}.md to ${mdFilePath}:`, err);
      throw err;
    }
  }

  static deleteTodo(id: string, todoFolderPath?: string, localFolderPath?: string) {
    const todo = TodoModel.getTodos().find(t => t.id === id);
    TodoModel.deleteTodo(id);
    const todos = TodoModel.getTodos();
    this.updateMarkdownFileTodos(todos.filter(t => !t.archivedAt), todoFolderPath, localFolderPath, true);

    if (todo) {
      // Also remove the individual markdown file
      let dirPath = this.resolvePaths(todoFolderPath, localFolderPath);

      if (todo.collection) {
        dirPath = path.join(dirPath, todo.collection);
      }
      
      const mdFilePath = path.join(dirPath, `todo-${id}.md`);
      if (fs.existsSync(mdFilePath)) {
        fs.unlinkSync(mdFilePath);
        console.log(`Deleted file: ${mdFilePath}`);
      }
    }
  }

  static archiveTodo(id: string, todoFolderPath?: string, localFolderPath?: string) {
    const todo = TodoModel.getTodos().find(t => t.id === id);
    TodoModel.archiveTodo(id);
    const todos = TodoModel.getTodos();
    
    // Pass only active todos to updateMarkdownFileTodos to remove archived one from file
    this.updateMarkdownFileTodos(todos.filter(t => !t.archivedAt), todoFolderPath, localFolderPath, true);

    if (todo) {
      // Also remove the individual markdown file
      let dirPath = this.resolvePaths(todoFolderPath, localFolderPath);

      if (todo.collection) {
        dirPath = path.join(dirPath, todo.collection);
      }
      
      const mdFilePath = path.join(dirPath, `todo-${id}.md`);
      if (fs.existsSync(mdFilePath)) {
        fs.unlinkSync(mdFilePath);
        console.log(`Archived (removed file): ${mdFilePath}`);
      }
    }
  }
}
