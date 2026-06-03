import { Request, Response } from 'express';
import { TodoService } from '../services/TodoService';
import { TodoModel } from '../models/TodoModel';
import { getNewId, stringsToArray, formatDateTime } from '../utils/utils';
import { generateCommitMessage } from '../../../services/geminiService';

export class TodoController {
  static async generateCommitMessage(req: Request, res: Response) {
    try {
      const { todo } = req.body;
      const message = await generateCommitMessage(todo);
      res.json({ success: true, message });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: String(err) });
    }
  }

  static addTodo(req: Request, res: Response) {
    try {
      const subtaskInput = req.body.subtask;
      let finalSubtasks = [];
      if (Array.isArray(subtaskInput)) {
        if (subtaskInput.length > 0 && typeof subtaskInput[0] === 'string') {
           finalSubtasks = subtaskInput.map((s: string) => ({ text: String(s).trim(), completed: false })).filter((s: any) => s.text.length > 0);
        } else {
           finalSubtasks = subtaskInput.map((s: any) => ({ text: String(s.text || '').trim(), completed: s.completed === true })).filter((s: any) => s.text.length > 0);
        }
      }
      
      const newTodo = {
        id: getNewId(),
        title: req.body.title || '',
        date: req.body.date || formatDateTime(),
        days: 0,
        description: req.body.description || '',
        type: req.body.type || '',
        status: req.body.status || 'To Do',
        assign: req.body.assign || 'Unassigned',
        subtask: finalSubtasks,
        comments: req.body.comments || '',
        commitMessage: req.body.commitMessage || '',
        timelineId: req.body.timelineId || '',
        collection: req.body.collection || '',
      };
      
      TodoService.addTodo(newTodo, req.body.todoFolderPath, req.body.localFolderPath);
      res.json({ success: true, message: "TODO added successful", todo: { id: newTodo.id, title: newTodo.title } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to save TODO", error: String(err) });
    }
  }

  static updateTodo(req: Request, res: Response) {
    try {
      const subtaskInput = req.body.todo ? req.body.todo.subtask : req.body.subtask;
      const updatedTodo = req.body.todo || req.body;
      let finalSubtasks = [];
      if (Array.isArray(subtaskInput)) {
        if (subtaskInput.length > 0 && typeof subtaskInput[0] === 'string') {
           finalSubtasks = subtaskInput.map((s: string) => ({ text: String(s).trim(), completed: false })).filter((s: any) => s.text.length > 0);
        } else {
           finalSubtasks = subtaskInput.map((s: any) => ({ text: String(s.text || '').trim(), completed: s.completed === true })).filter((s: any) => s.text.length > 0);
        }
      }
      updatedTodo.subtask = finalSubtasks;
      TodoService.updateTodo(updatedTodo, req.body.todoFolderPath, req.body.localFolderPath);
      res.json({ success: true, message: "TODO updated successful" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to update TODO", error: String(err) });
    }
  }

  static syncFromFiles(req: Request, res: Response) {
    try {
      const { todoFolderPath, localFolderPath } = req.body;
      const parsedTodos = TodoService.syncFromFiles(todoFolderPath, localFolderPath);
      res.json({ success: true, message: "TODOs synced from file successfully", todos: parsedTodos });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to sync TODOs from file", error: String(err) });
    }
  }

  static getTodos(req: Request, res: Response) {
    try {
      const todos = TodoModel.getTodos();
      res.json(todos);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  }

  static getStatuses(req: Request, res: Response) {
    try {
      const statuses = TodoModel.getStatuses();
      res.json(statuses);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  }

  static addStatuses(req: Request, res: Response) {
    try {
      const statuses = req.body.statuses;
      TodoModel.saveStatuses(statuses);
      res.json({ success: true, message: "Statuses updated" });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  }

  static getTypes(req: Request, res: Response) {
    try {
      const types = TodoModel.getTypes();
      res.json(types);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  }

  static getCollections(req: Request, res: Response) {
    try {
      const cols = TodoModel.getCollections();
      res.json(cols);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  }

  static addTypes(req: Request, res: Response) {
    try {
      const types = req.body.types;
      TodoModel.saveTypes(types);
      res.json({ success: true, message: "Types updated" });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  }

  static addCollections(req: Request, res: Response) {
    try {
      const collections = req.body.collections;
      TodoModel.saveCollections(collections);
      res.json({ success: true, message: "Collections updated" });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  }

  static getAssign(req: Request, res: Response) {
    try {
      const contributors = TodoModel.getContributors();
      res.json(contributors);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  }

  static getDevelopers(req: Request, res: Response) {
    try {
      const developers = TodoModel.getDevelopers();
      res.json(developers);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  }

  static addContributor(req: Request, res: Response) {
    try {
      const contributor = req.body;
      TodoModel.saveContributor(contributor);
      res.json({ success: true, message: "Contributor added" });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  }

  static addDeveloper(req: Request, res: Response) {
    try {
      const developer = req.body;
      TodoModel.saveDeveloper(developer);
      res.json({ success: true, message: "Developer added" });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  }

  static exportTodo(req: Request, res: Response) {
    try {
      const todo = req.body.todo;
      TodoModel.updateTodo(todo);
      
      const todos = TodoModel.getTodos();
      TodoService.writeTodoToIndividualFile(todo, req.body.todoFolderPath, req.body.localFolderPath);
      TodoService.updateMarkdownFileTodos(todos, req.body.todoFolderPath, req.body.localFolderPath);
      
      res.json({ success: true, message: "TODO exported to file successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to export TODO", error: String(err) });
    }
  }

  static exportTodos(req: Request, res: Response) {
    try {
      const todos = req.body.todos;
      const { todoFolderPath, localFolderPath } = req.body;
      
      if (Array.isArray(todos)) {
        todos.forEach(todo => {
          TodoModel.updateTodo(todo);
          TodoService.writeTodoToIndividualFile(todo, todoFolderPath, localFolderPath);
        });
        
        const allTodos = TodoModel.getTodos();
        TodoService.updateMarkdownFileTodos(allTodos, todoFolderPath, localFolderPath);
      }
      res.json({ success: true, message: "TODOs exported to file successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to export TODOs", error: String(err) });
    }
  }

  static viewGlobalTodoFile(req: Request, res: Response) {
    try {
      const { todoFolderPath, localFolderPath, collection } = req.body;
      const content = TodoService.readGlobalTodoFileContent(todoFolderPath, localFolderPath, collection);
      if (content === null) {
        return res.status(404).json({ success: false, message: "File not found" });
      }
      res.json({ success: true, content });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to read global TODO file", error: String(err) });
    }
  }

  static viewTodoFile(req: Request, res: Response) {
    try {
      const { id, todoFolderPath, localFolderPath } = req.body;
      const todo = TodoModel.getTodos().find(t => t.id === id);
      if (!todo) {
        return res.status(404).json({ success: false, message: "Todo not found" });
      }
      const content = TodoService.readTodoFileContent(todo, todoFolderPath, localFolderPath);
      if (content === null) {
        return res.status(404).json({ success: false, message: "File not found" });
      }
      res.json({ success: true, content });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to read TODO file", error: String(err) });
    }
  }

  static deleteTodo(req: Request, res: Response) {
    try {
      const { id, todoFolderPath, localFolderPath } = req.body;
      TodoService.deleteTodo(id, todoFolderPath, localFolderPath);
      res.json({ success: true, message: "TODO deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to delete TODO", error: String(err) });
    }
  }

  static archiveTodo(req: Request, res: Response) {
    try {
      const { id, todoFolderPath, localFolderPath } = req.body;
      TodoService.archiveTodo(id, todoFolderPath, localFolderPath);
      res.json({ success: true, message: "TODO archived successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to archive TODO", error: String(err) });
    }
  }
}
