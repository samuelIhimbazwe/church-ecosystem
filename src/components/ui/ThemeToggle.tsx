import { Icon } from './Icon';
import { useTheme } from '../../theme/theme';

export function ThemeToggle({
  className = 'theme-toggle',
}: {
  className?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : 'light';

  return (
    <button
      type="button"
      className={className}
      onClick={toggleTheme}
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
      aria-pressed={theme === 'dark'}
    >
      <Icon name={theme === 'light' ? 'moon' : 'sun'} size={15} />
      <span className="theme-toggle-label">
        {theme === 'light' ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}
