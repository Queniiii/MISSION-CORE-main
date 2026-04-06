import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  parseISO
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  BarChart3, 
  Calendar as CalendarIcon,
  ListTodo,
  Trash2,
  User,
  LogOut,
  UserPlus,
  X,
  Palette,
  ArrowRight,
  Pencil,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Task, Category, Profile, DEFAULT_CATEGORIES } from './types';
import { cn, formatMinutes } from './lib/utils';

type ViewMode = 'calendar' | 'tasks' | 'stats';

export default function App() {
  const [view, setView] = useState<ViewMode>('tasks');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('macaron_profiles');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Today's date for the "Today's Tasks" view
  const today = new Date();

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('macaron_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (activeProfileId) {
      localStorage.setItem(`macaron_tasks_${activeProfileId}`, JSON.stringify(tasks));
      localStorage.setItem(`macaron_categories_${activeProfileId}`, JSON.stringify(categories));
    }
  }, [tasks, categories, activeProfileId]);

  // Load when activeProfileId changes
  useEffect(() => {
    if (activeProfileId) {
      const savedTasks = localStorage.getItem(`macaron_tasks_${activeProfileId}`);
      setTasks(savedTasks ? JSON.parse(savedTasks) : []);
      
      const savedCats = localStorage.getItem(`macaron_categories_${activeProfileId}`);
      setCategories(savedCats ? JSON.parse(savedCats) : DEFAULT_CATEGORIES);
    }
  }, [activeProfileId]);
  
  if (!activeProfileId) {
    return (
      <ProfileSelector 
        profiles={profiles}
        onSelect={setActiveProfileId}
        onCreate={(name, color) => {
          const newProfile = { id: crypto.randomUUID(), name, color };
          setProfiles([...profiles, newProfile]);
          setActiveProfileId(newProfile.id);
        }}
        onDelete={(id) => {
          setProfiles(profiles.filter(p => p.id !== id));
          localStorage.removeItem(`macaron_tasks_${id}`);
          localStorage.removeItem(`macaron_categories_${id}`);
        }}
      />
    );
  }

  const tasksForSelectedDate = useMemo(() => {
    return tasks.filter(task => isSameDay(parseISO(task.date), selectedDate));
  }, [tasks, selectedDate]);

  const tasksForToday = useMemo(() => {
    return tasks.filter(task => isSameDay(parseISO(task.date), today));
  }, [tasks]);

  const addTask = (title: string, categoryId: string, hours: number, minutes: number) => {
    // If in today's view, always add to today. If in calendar view, add to selected date.
    const targetDate = view === 'tasks' ? today : selectedDate;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      categoryId,
      date: format(targetDate, 'yyyy-MM-dd'),
      estimatedMinutes: hours * 60 + minutes,
      completed: false,
      createdAt: Date.now(),
    };
    setTasks([...tasks, newTask]);
    setIsAddingTask(false);
  };

  const addCategory = (name: string, color: string) => {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name,
      color,
    };
    setCategories([...categories, newCategory]);
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const editTaskSubmit = (id: string, title: string, categoryId: string, hours: number, minutes: number) => {
    setTasks(tasks.map(t => 
      t.id === id 
        ? { ...t, title, categoryId, estimatedMinutes: hours * 60 + minutes } 
        : t
    ));
    setEditingTask(null);
  };

  const handleReorder = (newOrderedList: Task[], targetDate: Date) => {
    setTasks(prev => {
      const otherTasks = prev.filter(t => !isSameDay(parseISO(t.date), targetDate));
      return [...otherTasks, ...newOrderedList];
    });
  };

  const moveTask = (taskId: string, direction: 'up' | 'down') => {
    setTasks(prev => {
      const index = prev.findIndex(t => t.id === taskId);
      if (index === -1) return prev;
      
      const newTasks = [...prev];
      const task = prev[index];
      const targetDate = view === 'tasks' ? today : selectedDate;
      const dayTaskIds = prev.filter(t => isSameDay(parseISO(t.date), targetDate)).map(t => t.id);
      const dayIndex = dayTaskIds.indexOf(taskId);
      
      if (direction === 'up' && dayIndex > 0) {
        const swapTargetId = dayTaskIds[dayIndex - 1];
        const swapTargetIndex = prev.findIndex(t => t.id === swapTargetId);
        [newTasks[index], newTasks[swapTargetIndex]] = [newTasks[swapTargetIndex], newTasks[index]];
      } else if (direction === 'down' && dayIndex < dayTaskIds.length - 1) {
        const swapTargetId = dayTaskIds[dayIndex + 1];
        const swapTargetIndex = prev.findIndex(t => t.id === swapTargetId);
        [newTasks[index], newTasks[swapTargetIndex]] = [newTasks[swapTargetIndex], newTasks[index]];
      }
      return newTasks;
    });
  };

  const finishTask = (id: string, actualHours: number, actualMinutes: number) => {
    setTasks(tasks.map(t => 
      t.id === id 
        ? { ...t, completed: true, actualMinutes: actualHours * 60 + actualMinutes } 
        : t
    ));
    setCompletingTask(null);
  };

  const categoryEfficiencyData = useMemo(() => {
    return categories.map(cat => {
      const catTasks = tasks.filter(t => t.categoryId === cat.id && t.completed);
      const estimated = catTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
      const actual = catTasks.reduce((acc, t) => acc + (t.actualMinutes || 0), 0);
      
      let efficiency = 0;
      if (actual > 0) {
        efficiency = Math.round((estimated / actual) * 100);
      }

      return {
        name: cat.name,
        efficiency,
        estimated,
        actual,
        color: cat.color
      };
    }).filter(d => d.estimated > 0); // Only show categories with tasks
  }, [tasks, categories]);

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <header className="relative text-center py-4">
          <button 
            onClick={() => setActiveProfileId(null)}
            className="absolute left-0 top-6 md:top-8 flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-macaron-pink-light hover:bg-white text-macaron-pink-dark rounded-xl shadow-sm transition-all font-medium text-sm border-2 border-macaron-pink md:border-transparent"
          >
            <LogOut size={18} />
            <span className="hidden md:inline">切換使用者</span>
          </button>
          
          <h1 className="text-4xl font-medium text-macaron-pink-dark tracking-[0.2em] drop-shadow-sm uppercase">
            MISSION CORE
          </h1>
          <p className="text-macaron-pink-dark/80 font-medium mt-2 text-sm md:text-base">
            歡迎回來，{profiles.find(p => p.id === activeProfileId)?.name}！生活的每一刻都值得好好記錄
          </p>
        </header>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex justify-center gap-4 mb-8">
          <NavButton active={view === 'calendar'} onClick={() => setView('calendar')} icon={<CalendarIcon size={20} />} label="行事曆" />
          <NavButton active={view === 'tasks'} onClick={() => setView('tasks')} icon={<ListTodo size={20} />} label="今日待破關任務" />
          <NavButton active={view === 'stats'} onClick={() => setView('stats')} icon={<BarChart3 size={20} />} label="效率統計" />
        </nav>

        {/* Main Content Area */}
        <main className="min-h-[60vh]">
          <AnimatePresence mode="wait">
            {view === 'calendar' && (
              <motion.div 
                key="calendar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <section className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-xl border-4 border-macaron-pink">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-medium text-slate-700 flex items-center gap-2">
                      <CalendarIcon size={24} className="text-macaron-pink-dark" />
                      行事曆
                    </h2>
                    <div className="flex items-center gap-4 bg-macaron-pink-light p-2 rounded-2xl">
                      <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl transition-all">
                        <ChevronLeft size={24} className="text-macaron-pink-dark" />
                      </button>
                      <span className="font-medium text-slate-700 min-w-[120px] text-center text-lg">
                        {format(currentDate, 'yyyy年 MM月')}
                      </span>
                      <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl transition-all">
                        <ChevronRight size={24} className="text-macaron-pink-dark" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-center mb-4">
                    {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                      <div key={day} className="text-sm font-medium text-macaron-pink-dark py-2">{day}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {renderCalendarDays(currentDate, selectedDate, (d) => {
                      setSelectedDate(d);
                    }, tasks)}
                  </div>
                </section>

                {/* Tasks for selected date shown directly below calendar */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-white/80 p-4 rounded-3xl border-2 border-macaron-pink">
                    <h2 className="text-xl font-medium text-slate-700">
                      {format(selectedDate, 'MM月dd日')} 的任務
                    </h2>
                    <button 
                      onClick={() => setIsAddingTask(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-macaron-pink-dark text-white rounded-xl shadow-md hover:scale-105 transition-all font-medium text-sm"
                    >
                      <Plus size={18} />
                      新增
                    </button>
                  </div>
                  
                  {tasksForSelectedDate.length === 0 ? (
                    <div className="bg-white/40 border-2 border-dashed border-macaron-pink rounded-3xl p-8 text-center">
                      <p className="text-macaron-pink-dark font-medium">這天還沒有任務喔</p>
                    </div>
                  ) : (
                    <Reorder.Group axis="y" values={tasksForSelectedDate} onReorder={(n) => handleReorder(n, selectedDate)} className="space-y-4 m-0 p-0 list-none">
                      {tasksForSelectedDate.map((task: Task, index, arr) => (
                        <Reorder.Item 
                          key={task.id} 
                          value={task}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative"
                        >
                          <TaskItem 
                            task={task} 
                            index={index}
                            total={arr.length}
                            category={categories.find(c => c.id === task.categoryId)}
                            onComplete={() => setCompletingTask(task)}
                            onDelete={() => deleteTask(task.id)}
                            onEdit={() => setEditingTask(task)}
                            onMoveUp={() => moveTask(task.id, 'up')}
                            onMoveDown={() => moveTask(task.id, 'down')}
                          />
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  )}
                </div>
              </motion.div>
            )}

            {view === 'tasks' && (
              <motion.div 
                key="tasks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between bg-white/80 p-4 rounded-3xl border-2 border-macaron-pink">
                  <h2 className="text-2xl font-medium text-slate-700">
                    今日待破關任務
                  </h2>
                  <button 
                    onClick={() => setIsAddingTask(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-macaron-pink-dark text-white rounded-2xl shadow-lg hover:scale-105 transition-all font-medium"
                  >
                    <Plus size={24} />
                    新增
                  </button>
                </div>

                <div className="space-y-4">
                  {tasksForToday.length === 0 ? (
                    <div className="bg-white/50 border-4 border-dashed border-macaron-pink rounded-3xl p-16 text-center">
                      <p className="text-macaron-pink-dark font-medium text-xl">今天沒有任務需要出動唷～</p>
                    </div>
                  ) : (
                    <Reorder.Group axis="y" values={tasksForToday} onReorder={(n) => handleReorder(n, today)} className="space-y-4 m-0 p-0 list-none">
                      {tasksForToday.map((task: Task, index, arr) => (
                        <Reorder.Item 
                          key={task.id} 
                          value={task}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative"
                        >
                          <TaskItem 
                            task={task} 
                            index={index}
                            total={arr.length}
                            category={categories.find(c => c.id === task.categoryId)}
                            onComplete={() => setCompletingTask(task)}
                            onDelete={() => deleteTask(task.id)}
                            onEdit={() => setEditingTask(task)}
                            onMoveUp={() => moveTask(task.id, 'up')}
                            onMoveDown={() => moveTask(task.id, 'down')}
                          />
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  )}
                </div>
              </motion.div>
            )}

            {view === 'stats' && (
              <motion.div 
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <section className="bg-white/90 p-8 rounded-3xl shadow-xl border-4 border-macaron-pink">
                  <h2 className="text-2xl font-medium mb-8 flex items-center gap-2 text-slate-700">
                    <BarChart3 size={28} className="text-macaron-pink-dark" />
                    類別效率統計
                  </h2>
                  
                  {categoryEfficiencyData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-medium">
                      尚無完成的任務數據可供統計
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={categoryEfficiencyData} layout="vertical" margin={{ left: 20, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#fce7f3" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 14, fontWeight: 500, fill: '#334155'}} width={80} />
                            <Tooltip 
                              cursor={{fill: '#fff1f2'}}
                              contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                            />
                            <Bar dataKey="efficiency" name="效率 %" radius={[0, 10, 10, 0]} barSize={30}>
                              {categoryEfficiencyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryEfficiencyData.map(data => (
                          <div key={data.name} className="bg-macaron-pink-light p-4 rounded-2xl flex items-center justify-between border border-white">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                                <span className="font-medium text-slate-700">{data.name}</span>
                              </div>
                              <div className="text-xs font-medium text-slate-400 mt-1">
                                預計: {formatMinutes(data.estimated)} | 實際: {formatMinutes(data.actual)}
                              </div>
                            </div>
                            <div className="text-2xl font-medium text-macaron-pink-dark">
                              {data.efficiency}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Mobile Navigation */}
        <nav className="fixed bottom-6 left-4 right-4 md:hidden flex justify-around items-center bg-white/90 backdrop-blur-lg p-3 rounded-3xl shadow-2xl border-2 border-macaron-pink z-40">
          <MobileNavButton active={view === 'calendar'} onClick={() => setView('calendar')} icon={<CalendarIcon size={24} />} />
          <MobileNavButton active={view === 'tasks'} onClick={() => setView('tasks')} icon={<ListTodo size={24} />} />
          <MobileNavButton active={view === 'stats'} onClick={() => setView('stats')} icon={<BarChart3 size={24} />} />
        </nav>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAddingTask && (
          <TaskFormModal 
            categories={categories}
            onClose={() => setIsAddingTask(false)}
            onSubmit={addTask}
            onAddCategory={addCategory}
          />
        )}
        {editingTask && (
          <TaskFormModal 
            categories={categories}
            initialData={editingTask}
            onClose={() => setEditingTask(null)}
            onSubmit={(title, catId, hours, mins) => editTaskSubmit(editingTask.id, title, catId, hours, mins)}
            onAddCategory={addCategory}
          />
        )}
        {completingTask && (
          <CompleteTaskModal 
            task={completingTask}
            onClose={() => setCompletingTask(null)}
            onSubmit={(h, m) => finishTask(completingTask.id, h, m)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-8 py-4 rounded-2xl font-medium transition-all transform hover:scale-105",
        active 
          ? "bg-macaron-pink-dark text-white shadow-lg" 
          : "bg-white text-macaron-pink-dark hover:bg-macaron-pink-light"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileNavButton({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-4 rounded-2xl transition-all",
        active ? "bg-macaron-pink-dark text-white scale-110 shadow-lg" : "text-macaron-pink-dark"
      )}
    >
      {icon}
    </button>
  );
}

function renderCalendarDays(currentDate: Date, selectedDate: Date, onSelect: (d: Date) => void, tasks: Task[]) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return days.map(day => {
    const isCurrentMonth = isSameMonth(day, monthStart);
    const isSelected = isSameDay(day, selectedDate);
    const dayTasks = tasks.filter(t => isSameDay(parseISO(t.date), day));
    const hasUncompleted = dayTasks.some(t => !t.completed);
    const allCompleted = dayTasks.length > 0 && dayTasks.every(t => t.completed);

    return (
      <button
        key={day.toString()}
        onClick={() => onSelect(day)}
        className={cn(
          "relative h-16 flex flex-col items-center justify-center rounded-2xl transition-all border-2",
          !isCurrentMonth && "text-macaron-pink opacity-30 border-transparent",
          isCurrentMonth && !isSelected && "hover:bg-macaron-pink-light border-transparent text-slate-600 font-medium",
          isSelected && "bg-macaron-pink-dark text-white shadow-md font-medium border-white scale-105 z-10"
        )}
      >
        <span className="text-lg">{format(day, 'd')}</span>
        <div className="flex gap-1 mt-1">
          {hasUncompleted && <div className="w-2 h-2 rounded-full bg-macaron-blue border border-white" />}
          {allCompleted && <div className="w-2 h-2 rounded-full bg-macaron-green border border-white" />}
        </div>
      </button>
    );
  });
}

interface TaskItemProps {
  key?: React.Key;
  task: Task;
  category?: Category;
  index?: number;
  total?: number;
  onComplete: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function TaskItem({ task, category, index, total, onComplete, onDelete, onEdit, onMoveUp, onMoveDown }: TaskItemProps) {
  return (
    <div 
      className="bg-white p-4 md:p-6 pl-6 md:pl-8 rounded-3xl shadow-md border-2 border-macaron-pink flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-5 group relative overflow-hidden cursor-grab active:cursor-grabbing"
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-3" 
        style={{ backgroundColor: category?.color || '#eee' }} 
      />

      <div className="flex flex-col gap-1 mr-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button 
          onClick={onMoveUp} 
          disabled={index === 0}
          className="text-slate-300 hover:text-macaron-pink-dark disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
        >
          <ArrowUp size={16} />
        </button>
        <button 
          onClick={onMoveDown}
          disabled={index !== undefined && total !== undefined && index === total - 1}
          className="text-slate-300 hover:text-macaron-pink-dark disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
        >
          <ArrowDown size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {index !== undefined && (
          <span className="w-8 h-8 flex items-center justify-center bg-macaron-pink-light text-macaron-pink-dark font-bold text-sm rounded-full shrink-0">
            {index + 1}
          </span>
        )}
      </div>
      
      <button 
        onClick={!task.completed ? onComplete : undefined}
        className={cn(
          "transition-all transform hover:scale-110",
          task.completed ? "text-macaron-green" : "text-macaron-pink-dark hover:text-macaron-blue"
        )}
      >
        {task.completed ? <CheckCircle2 size={36} /> : <Circle size={36} />}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span 
            className="text-[10px] font-medium px-3 py-1 rounded-full uppercase tracking-widest text-slate-700"
            style={{ backgroundColor: category?.color || '#eee' }}
          >
            {category?.name || '未分類'}
          </span>
        </div>
        <h3 className={cn(
          "text-xl font-medium truncate text-slate-700",
          task.completed && "text-slate-400 line-through"
        )}>
          {task.title}
        </h3>
        <div className="flex items-center gap-4 mt-2 text-slate-400 text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <Clock size={16} className="text-macaron-pink-dark" />
            預計: {formatMinutes(task.estimatedMinutes)}
          </span>
          {task.completed && task.actualMinutes !== undefined && (
            <span className="flex items-center gap-1.5 text-macaron-blue">
              <CheckCircle2 size={16} />
              實際: {formatMinutes(task.actualMinutes)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto shrink-0 mt-2 md:mt-0 w-full justify-end md:w-auto">
        <button 
          onClick={onEdit}
          className="p-3 text-macaron-pink-dark hover:text-macaron-blue hover:bg-slate-50 rounded-2xl transition-all"
        >
          <Pencil size={22} />
        </button>
        <button 
          onClick={onDelete}
          className="p-3 text-macaron-pink-dark hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
        >
          <Trash2 size={22} />
        </button>
      </div>
    </div>
  );
}

function TaskFormModal({ categories, initialData, onClose, onSubmit, onAddCategory }: { 
  categories: Category[]; 
  initialData?: Task;
  onClose: () => void; 
  onSubmit: (t: string, c: string, h: number, m: number) => void;
  onAddCategory: (n: string, c: string) => void;
}) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || categories[0]?.id || '');
  const [hours, setHours] = useState(initialData ? String(Math.floor(initialData.estimatedMinutes / 60)) : '0');
  const [minutes, setMinutes] = useState(initialData ? String(initialData.estimatedMinutes % 60) : '30');
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#FFD1DC');

  const handleAddCat = () => {
    if (newCatName) {
      onAddCategory(newCatName, newCatColor);
      setNewCatName('');
      setShowCatForm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-macaron-pink-dark/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border-8 border-macaron-pink overflow-hidden"
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-medium text-slate-700">{initialData ? '編輯任務' : '新增任務'}</h3>
            <button onClick={onClose} className="p-3 bg-macaron-pink-light hover:bg-macaron-pink rounded-2xl transition-all">
              <X size={24} className="text-macaron-pink-dark" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-lg font-medium text-slate-700 ml-1">任務名稱</label>
              <input 
                autoFocus
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="想要完成什麼呢？"
                className="w-full px-6 py-4 rounded-2xl bg-macaron-pink-light border-4 border-transparent focus:border-macaron-pink focus:bg-white outline-none font-medium text-lg transition-all"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-lg font-medium text-slate-700 ml-1">類別</label>
                <button 
                  onClick={() => setShowCatForm(!showCatForm)}
                  className="text-sm font-medium text-macaron-pink-dark flex items-center gap-1 hover:underline"
                >
                  {showCatForm ? '取消新增' : '管理類別'}
                </button>
              </div>

              {showCatForm ? (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-macaron-pink-light p-5 rounded-3xl space-y-4 border-2 border-macaron-pink"
                >
                  <div className="flex gap-3">
                    <input 
                      type="text"
                      placeholder="類別名稱"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl bg-white border-none font-medium outline-none"
                    />
                    <div className="flex items-center gap-2 bg-white px-3 rounded-xl">
                      <Palette size={18} className="text-slate-400" />
                      <input 
                        type="color"
                        value={newCatColor}
                        onChange={e => setNewCatColor(e.target.value)}
                        className="w-8 h-8 border-none bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleAddCat}
                    className="w-full py-2 bg-macaron-pink-dark text-white rounded-xl font-medium text-sm"
                  >
                    確認新增
                  </button>
                </motion.div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        "px-5 py-2.5 rounded-2xl text-sm font-medium transition-all border-4",
                        categoryId === cat.id 
                          ? "border-slate-800 scale-105 shadow-md" 
                          : "border-transparent bg-macaron-pink-light text-slate-500"
                      )}
                      style={categoryId === cat.id ? { backgroundColor: cat.color } : {}}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-lg font-medium text-slate-700 ml-1">預計花費時間</label>
              <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center gap-3 bg-macaron-pink-light p-2 rounded-2xl border-4 border-transparent focus-within:border-macaron-pink transition-all">
                  <input 
                    type="number" 
                    min="0"
                    value={hours}
                    onChange={e => setHours(e.target.value)}
                    className="w-full bg-transparent text-center py-2 font-medium text-2xl focus:outline-none"
                  />
                  <span className="text-sm font-medium text-macaron-pink-dark pr-4">小時</span>
                </div>
                <div className="flex-1 flex items-center gap-3 bg-macaron-pink-light p-2 rounded-2xl border-4 border-transparent focus-within:border-macaron-pink transition-all">
                  <input 
                    type="number" 
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={e => setMinutes(e.target.value)}
                    className="w-full bg-transparent text-center py-2 font-medium text-2xl focus:outline-none"
                  />
                  <span className="text-sm font-medium text-macaron-pink-dark pr-4">分鐘</span>
                </div>
              </div>
            </div>
          </div>

          <button 
            disabled={!title || showCatForm}
            onClick={() => onSubmit(title, categoryId, parseInt(hours) || 0, parseInt(minutes) || 0)}
            className="w-full py-5 bg-macaron-pink-dark text-white rounded-3xl font-medium text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {initialData ? '儲存變更' : '開始這項任務！'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CompleteTaskModal({ task, onClose, onSubmit }: { 
  task: Task; 
  onClose: () => void; 
  onSubmit: (h: number, m: number) => void;
}) {
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');

  useEffect(() => {
    setHours(String(Math.floor(task.estimatedMinutes / 60)));
    setMinutes(String(task.estimatedMinutes % 60));
  }, [task]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-macaron-pink-dark/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border-8 border-macaron-pink overflow-hidden"
      >
        <div className="p-8 space-y-8">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-macaron-green/30 text-macaron-green rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-3xl font-medium text-slate-700">辛苦了！</h3>
            <p className="text-macaron-pink-dark font-medium text-lg">「{task.title}」已完成</p>
          </div>

          <div className="space-y-4">
            <label className="text-lg font-medium text-slate-700 block text-center">實際花費了多少時間？</label>
            <div className="flex items-center gap-4">
              <div className="flex-1 flex items-center gap-2 bg-macaron-pink-light p-2 rounded-2xl border-4 border-transparent focus-within:border-macaron-pink transition-all">
                <input 
                  autoFocus
                  type="number" 
                  min="0"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  className="w-full bg-transparent text-center py-3 text-2xl font-medium focus:outline-none"
                />
                <span className="text-sm font-medium text-macaron-pink-dark pr-4">小時</span>
              </div>
              <div className="flex-1 flex items-center gap-2 bg-macaron-pink-light p-2 rounded-2xl border-4 border-transparent focus-within:border-macaron-pink transition-all">
                <input 
                  type="number" 
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={e => setMinutes(e.target.value)}
                  className="w-full bg-transparent text-center py-3 text-2xl font-medium focus:outline-none"
                />
                <span className="text-sm font-medium text-macaron-pink-dark pr-4">分鐘</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => onSubmit(parseInt(hours) || 0, parseInt(minutes) || 0)}
              className="w-full py-5 bg-macaron-green text-white rounded-3xl font-medium text-xl shadow-lg hover:scale-[1.02] transition-all"
            >
              確認並記錄
            </button>
            <button 
              onClick={onClose}
              className="w-full py-3 text-slate-400 font-medium hover:text-slate-600 transition-all"
            >
              返回
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProfileSelector({ 
  profiles, 
  onSelect, 
  onCreate, 
  onDelete 
}: { 
  profiles: Profile[]; 
  onSelect: (id: string) => void;
  onCreate: (name: string, color: string) => void;
  onDelete: (id: string) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#FFD1DC');

  return (
    <div className="min-h-screen pb-24 md:pb-8 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-md p-8 md:p-12 rounded-[3rem] shadow-2xl border-8 border-macaron-pink w-full max-w-2xl"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-medium text-macaron-pink-dark tracking-[0.1em] drop-shadow-sm mb-4">
            MISSION CORE
          </h1>
          <p className="text-slate-500 font-medium text-lg">請問你是哪一位玩家？</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {profiles.map(profile => (
            <motion.div
              key={profile.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group block text-center"
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(profile.id);
                }}
                className="absolute -top-3 -right-3 p-2 bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-500 hover:text-white"
              >
                <X size={16} />
              </button>
              <button
                onClick={() => onSelect(profile.id)}
                className="w-full flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-3xl border-4 border-transparent hover:border-macaron-pink hover:shadow-xl transition-all"
              >
                <div 
                  className="w-20 h-20 rounded-full shadow-inner flex items-center justify-center text-white"
                  style={{ backgroundColor: profile.color }}
                >
                  <User size={40} className="drop-shadow-sm" />
                </div>
                <span className="font-medium text-slate-700 text-lg truncate w-full">{profile.name}</span>
              </button>
            </motion.div>
          ))}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreating(true)}
            className="flex flex-col items-center gap-4 bg-macaron-pink-light/30 p-6 rounded-3xl border-4 border-dashed border-macaron-pink text-macaron-pink-dark hover:bg-macaron-pink-light transition-all h-full justify-center"
          >
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm">
              <UserPlus size={40} />
            </div>
            <span className="font-medium text-lg">新增玩家</span>
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border-8 border-macaron-pink p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-medium text-slate-700">建立新檔案</h3>
                <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                   <label className="text-sm font-medium text-slate-500 mb-2 block">玩家名稱</label>
                   <input 
                     autoFocus
                     type="text" 
                     value={newName}
                     onChange={e => setNewName(e.target.value)}
                     placeholder="輸入你的名字"
                     className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-macaron-pink focus:bg-white outline-none font-medium text-lg transition-all"
                   />
                </div>
                <div>
                   <label className="text-sm font-medium text-slate-500 mb-2 block">代表色</label>
                   <div className="flex gap-4">
                     {['#FFD1DC', '#B3E5FC', '#FFF9C4', '#C8E6C9', '#E1BEE7', '#FFCCBC'].map(color => (
                        <button
                          key={color}
                          onClick={() => setNewColor(color)}
                          className={`w-10 h-10 rounded-full transition-transform ${newColor === color ? 'scale-125 shadow-md ring-4 ring-white' : 'hover:scale-110'}`}
                          style={{ backgroundColor: color }}
                        />
                     ))}
                   </div>
                </div>
                
                <button 
                  disabled={!newName.trim()}
                  onClick={() => {
                    onCreate(newName.trim(), newColor);
                    setIsCreating(false);
                    setNewName('');
                  }}
                  className="w-full py-4 bg-macaron-pink-dark text-white rounded-2xl font-medium text-lg shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  開始遊戲！
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
