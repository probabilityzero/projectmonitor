import React, { useEffect, useState, useRef } from 'react';
    import {
      PlusCircle,
      List,
      BrainCircuit as Brain,
      Terminal,
      LineChart,
      Cpu,
      Archive,
      Puzzle,
      SlidersHorizontal,
      X,
    } from 'lucide-react';
    import { supabase } from './lib/supabase';
    import { ProjectCard } from './components/ProjectCard';
    import { ProjectForm } from './components/ProjectForm';
    import type { Project, ProjectCategory } from './types';
    import { cn } from './lib/utils';
    import { motion, AnimatePresence } from 'framer-motion';
    import { ProjectFilters } from './components/ProjectFilters';
    // import { ReactComponent as Logo } from './assets/logo.svg?react';

    const categories: { id: ProjectCategory | 'all'; label: string; icon: React.ReactNode }[] = [
      { id: 'all', label: 'On-going', icon: <List className="w-5 h-5" /> },
      { id: 'research', label: 'Research', icon: <Brain className="w-5 h-5" /> },
      { id: 'analysis', label: 'Analysis', icon: <LineChart className="w-5 h-5" /> },
      { id: 'engineering', label: 'Engineering', icon: <Cpu className="w-5 h-5" /> },
      { id: 'miscellaneous', label: 'Miscellaneous', icon: <Puzzle className="w-5 h-5" /> },
    ];

    function App() {
      const [projects, setProjects] = useState<Project[]>([]);
      const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'all'>('all');
      const [selectedTag, setSelectedTag] = useState<string | null>(null);
      const [isFormOpen, setIsFormOpen] = useState(false);
      const [editingProject, setEditingProject] = useState<Project | null>(null);
      const [loading, setLoading] = useState(true);
      const categoryRef = useRef<HTMLDivElement>(null);
      const [toast, setToast] = useState<string | null>(null);
      const [showArchive, setShowArchive] = useState(false);
      const [isFilterOpen, setIsFilterOpen] = useState(false);
      const [key, setKey] = useState(0);

      useEffect(() => {
        fetchProjects();
      }, []);

      async function fetchProjects() {
        setLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('status', { ascending: false });

        if (error) {
          console.error('Error fetching projects:', error);
          return;
        }

        setProjects(data || []);
        setLoading(false);
      }

      async function handleProjectSubmit(projectData: Partial<Project>) {
        try {
          setLoading(true);
          if (editingProject) {
            const { error } = await supabase
              .from('projects')
              .update(projectData)
              .eq('id', editingProject.id);

            if (error) throw error;
          } else {
            const { data, error } = await supabase
              .from('projects')
              .insert([projectData])
              .select()
              .single();

            if (error) throw error;
            setProjects(prev => [...prev, data]);
          }

          setIsFormOpen(false);
          setEditingProject(null);
          await fetchProjects();
        } catch (error) {
          console.error('Error saving project:', error);
          alert('Failed to save project. Please try again.');
        } finally {
          setLoading(false);
        }
      }

      async function handleToggleStarted(project: Project) {
        const newStatus = project.status === 'started' ? 'concept' : 'started';
        const { error } = await supabase
          .from('projects')
          .update({ status: newStatus })
          .eq('id', project.id);

        if (error) {
          console.error('Error updating project status:', error);
          return;
        }

        await fetchProjects();
      }

      const filteredProjects = projects.filter(project => {
        const isArchive = showArchive && (project.status === 'completed' || project.status === 'abandonded');
        const isNotArchived =
          !showArchive &&
          (selectedCategory === 'all'
            ? project.status !== 'abandonded' && project.status !== 'completed'
            : project.status !== 'abandonded');

        const categoryMatch = selectedCategory === 'all' || project.categories === selectedCategory;
        const tagMatch = !selectedTag || project.tags.split(',').map(tag => tag.trim()).includes(selectedTag);

        if (selectedCategory === 'all') {
          return (
            tagMatch &&
            (isArchive ||
              isNotArchived ||
              project.status === 'completed' ||
              project.status === 'concept' ||
              project.status === 'started')
          );
        }

        return (
          categoryMatch &&
          tagMatch &&
          (isArchive || isNotArchived || project.status === 'concept' || project.status === 'started')
        );
      });

      const sortedProjects = [...filteredProjects].sort((a, b) => {
        if (a.status === 'started' && b.status !== 'started') return -1;
        if (a.status !== 'started' && b.status === 'started') return 1;
        return 0;
      });

      const tagCounts = projects.reduce((acc, project) => {
        project.tags.split(',').forEach(tag => {
          const trimmedTag = tag.trim();
          acc[trimmedTag] = (acc[trimmedTag] || 0) + 1;
        });
        return acc;
      }, {} as { [tag: string]: number });

      return (
        <div className="min-h-screen bg-github-bg">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-github-text flex items-center gap-2">
                {/* <Logo className="w-8 h-8" /> */}
                Task Force <span className="font-thin">Monitor</span>
              </h1>
              <button
                onClick={() => {
                  setEditingProject(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-github-green hover:bg-github-green-hover text-white rounded-full transition-colors text-base"
              >
                <PlusCircle className="w-5 h-5" />
                Add Project
              </button>
            </div>

            <ProjectFilters
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTag}
              showArchive={showArchive}
              setShowArchive={setShowArchive}
              isFilterOpen={isFilterOpen}
              setIsFilterOpen={setIsFilterOpen}
              tagCounts={tagCounts}
              setKey={setKey}
              categoryRef={categoryRef}
            />

            {loading ? (
              <div className="text-center text-github-text">Loading projects...</div>
            ) : (
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" key={key}>
                <AnimatePresence>
                  {sortedProjects.map(project => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ProjectCard
                        project={project}
                        onEdit={project => {
                          setEditingProject(project);
                          setIsFormOpen(true);
                        }}
                        onToggleStarted={handleToggleStarted}
                        onStatusChange={handleToggleStarted}
                        setToast={setToast}
                        onTagClick={setSelectedTag}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            <AnimatePresence>
              {isFormOpen && (
                <motion.div
                  key="project-form"
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/20"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <ProjectForm
                    categories={categories.filter(c => c.id !== 'all')}
                    project={editingProject || undefined}
                    onSubmit={handleProjectSubmit}
                    onClose={() => {
                      setIsFormOpen(false);
                      setEditingProject(null);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {toast && (
              <motion.div
                className="fixed top-4 left-4 bg-github-card p-4 rounded-md border border-github-border text-github-text z-50"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                onAnimationComplete={() => setTimeout(() => setToast(null), 3000)}
              >
                {toast}
              </motion.div>
            )}
          </div>
        </div>
      );
    }

    export default App;
