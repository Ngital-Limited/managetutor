import logo from '@/assets/logo.webp';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'light';
  className?: string;
}

export function Logo({ size = 'md', variant = 'default', className = '' }: LogoProps) {
  const heights = { sm: 'h-8', md: 'h-10', lg: 'h-14' };
  const filter = variant === 'light' ? 'brightness-0 invert' : '';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={logo} alt="Manage Tutor" className={`${heights[size]} w-auto ${filter}`} />
    </div>
  );
}
