import React, { useState } from 'react';
import { Task } from './tasks.types';
import { useCompleteTask } from './useTasks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FiCheckCircle, FiLoader } from 'react-icons/fi';

interface CompleteTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
}

export function CompleteTaskDialog({ isOpen, onClose, task }: CompleteTaskDialogProps) {
  const [completionNote, setCompletionNote] = useState('');
  const completeTaskMutation = useCompleteTask();

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await completeTaskMutation.mutateAsync({
        id: task.id,
        input: {
          completionNote: completionNote.trim() || undefined,
        },
      });
      toast.success('Task marked as completed');
      setCompletionNote('');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete task');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-5 bg-[#fcfbf8] border-[#eceae4]">
        <form onSubmit={handleComplete}>
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <FiCheckCircle className="h-3.5 w-3.5" />
              </div>
              <DialogTitle className="text-sm font-bold text-[#1c1c1c]">Complete Task</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#5f5f5d]">
              Mark <strong className="text-[#1c1c1c] font-medium">"{task.title}"</strong> as finished.
              Optionally record an outcome note.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2.5 space-y-2">
            <div className="space-y-1">
              <Label htmlFor="completionNote" className="text-[11px] font-semibold text-[#1c1c1c]">
                Completion Note (Optional)
              </Label>
              <Textarea
                id="completionNote"
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="e.g. Spoke with procurement. Revised proposal sent."
                className="text-xs min-h-[58px] h-[58px] py-1.5 bg-white border-[#eceae4] focus-visible:ring-1 focus-visible:ring-[#1c1c1c]"
              />
              <p className="text-[10px] text-[#8e8d8a]">
                Notes are recorded to the deal's immutable timeline.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs bg-white text-[#1c1c1c] border-[#eceae4]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={completeTaskMutation.isPending}
              className="h-8 text-xs bg-emerald-700 text-white hover:bg-emerald-800 gap-1.5 shadow-2xs"
            >
              {completeTaskMutation.isPending && <FiLoader className="h-3.5 w-3.5 animate-spin" />}
              Complete Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
