'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { Button } from '@/components/ui/Button';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="outline" size="icon" onClick={toggle} title="Toggle theme">
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
