import logo from '@/assets/logo.webp';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const heights = { sm: 'h-8', md: 'h-10', lg: 'h-14' };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={logo} alt="Manage Tutor" className={`${heights[size]} w-auto`} />
    </div>
  );
}
