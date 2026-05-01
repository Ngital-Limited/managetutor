import { forwardRef, ElementType, ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * PageContainer — the single source of truth for page horizontal layout.
 *
 * Always renders at width: 100%, max-width: 1200px, centered, with consistent
 * horizontal padding (16px mobile / 24px md+). Use this for every page-level
 * wrapper inside header, footer, and page <main> so widths stay identical.
 *
 * @example
 *   <PageContainer as="main" className="py-8">{children}</PageContainer>
 */
type PageContainerProps<T extends ElementType = 'div'> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

export const PageContainer = forwardRef<HTMLElement, PageContainerProps>(
  ({ as, className, ...rest }, ref) => {
    const Tag = (as || 'div') as ElementType;
    return (
      <Tag
        ref={ref as never}
        className={cn('page-container', className)}
        {...rest}
      />
    );
  }
);

PageContainer.displayName = 'PageContainer';
